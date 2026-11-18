"""Hikvision biometric-event ingestion for student attendance.

Fingerprints remain in Hikvision hardware.  This API receives only the
device's person code and timestamp, preserves the raw event for audit, then
projects the first valid daily entry into KusKul's student_attendance table.
"""
import hashlib
import json
import logging
import uuid
from datetime import datetime, time, timedelta, timezone
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from pydantic import ValidationError
from sqlalchemy import or_, select, tuple_
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.enrollment import Enrollment
from app.models.hikvision_attendance import HikvisionAttendanceEvent, HikvisionDevice, HikvisionStudentCredential
from app.models.setting import Setting
from app.models.school import School
from app.models.student import Student
from app.models.teacher_assignment import StudentAttendance
from app.models.user import User
from app.services.attendance_policy import is_late_local
from app.services.absence_sms import first_days, load_history, previous_absence_streak, return_summary_enabled
from app.services.sms import deliver_sms, guardian_phone, is_sms_holiday, sms_already_sent_today, student_full_name
from app.schemas.hikvision_attendance import (
    HikvisionCredentialCreate,
    HikvisionDeviceCreate,
    HikvisionDeviceOut,
    HikvisionDeviceUpdate,
    HikvisionEventIn,
    HikvisionIngestRequest,
    HikvisionSyncBatchRequest,
)

router = APIRouter(dependencies=[Depends(require_permission("attendance:read"))])

# The public/manual ingestion endpoint deliberately caps a request at 2,000
# events.  Cloud history searches can return more than that, so keep each
# internal ingest pass comfortably below that contract limit.
SYNC_INGEST_BATCH_SIZE = 200
SYNC_DELAY_MINUTES = 12
logger = logging.getLogger(__name__)


def _out(device: HikvisionDevice) -> HikvisionDeviceOut:
    return HikvisionDeviceOut(
        id=device.id,
        name=device.name,
        external_device_id=device.external_device_id,
        provider=device.provider,
        area_domain=device.area_domain,
        timezone=device.timezone,
        late_after=device.late_after,
        active=device.active,
        credentials_configured=bool(device.app_key and device.secret_key),
        last_sync_at=device.last_sync_at,
    )


def _device(db: Session, device_id: uuid.UUID, school_id: uuid.UUID) -> HikvisionDevice:
    row = db.get(HikvisionDevice, device_id)
    if not row or row.school_id != school_id:
        raise not_found("Hikvision device not found")
    return row


def _as_utc(value: datetime, device_timezone: str) -> datetime:
    if value.tzinfo is None:
        try:
            value = value.replace(tzinfo=ZoneInfo(device_timezone))
        except Exception:
            raise problem(status_code=400, title="Bad Request", detail="Invalid device timezone")
    return value.astimezone(timezone.utc)


def _attendance_date(event_at: datetime, device_timezone: str) -> datetime:
    try:
        local_day = event_at.astimezone(ZoneInfo(device_timezone)).date()
    except Exception:
        raise problem(status_code=400, title="Bad Request", detail="Invalid device timezone")
    return datetime.combine(local_day, time.min, tzinfo=timezone.utc)


def _status_for_event(db: Session, event_at: datetime, device: HikvisionDevice) -> str:
    settings_row = db.scalar(
        select(Setting).where(Setting.school_id == device.school_id, Setting.key == "attendance.settings")
    )
    policy: dict[str, Any] = {}
    if settings_row and settings_row.value:
        try:
            policy = json.loads(settings_row.value)
        except (TypeError, ValueError):
            policy = {}
    local_time = event_at.astimezone(ZoneInfo(device.timezone)).time()
    return "late" if is_late_local(local_time, policy, device.late_after) else "present"


def _active_enrollment_for_card(
    db: Session, *, school_id: uuid.UUID, card_number: str
) -> tuple[Student, Enrollment] | None:
    """Resolve a Hikvision card number to one *unique* active student roll.

    Hik-Connect calls this value ``cardNo``.  KusKul's default convention is
    that this number equals the current academic year's enrollment roll number.
    A roll number can be reused in different classes, so an ambiguous match is
    deliberately not guessed; the administrator must use the explicit device
    mapping in that exceptional case.
    """
    year = db.scalar(
        select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_current.is_(True)).limit(1)
    )
    if not year:
        return None
    matches = db.execute(
        select(Student, Enrollment)
        .join(Enrollment, Enrollment.student_id == Student.id)
        .where(
            Student.school_id == school_id,
            Student.status == "active",
            Enrollment.academic_year_id == year.id,
            Enrollment.status == "active",
            Enrollment.roll_number == card_number,
        )
    ).all()
    return matches[0] if len(matches) == 1 else None


def _queue_late_sms(
    db: Session, *, school_id: uuid.UUID, user_id: uuid.UUID, student: Student, event_at: datetime, policy: dict[str, Any]
) -> int:
    """Queue a late alert without making imports wait on the SMS gateway."""
    if not policy.get("send_late_sms", False):
        return 0
    day = event_at.astimezone(ZoneInfo("Asia/Dhaka")).date()
    if is_sms_holiday(db, school_id, day) or sms_already_sent_today(db, school_id, student.id, "late", day):
        return 0
    if policy.get("send_absent_sms", False) and return_summary_enabled(policy):
        history = load_history(db, school_id=school_id, student_ids=[student.id], end_day=day, policy=policy)
        if previous_absence_streak(history, student.id, day).days > first_days(policy):
            # The return-summary pass will send one richer message instead.
            return 0
    phone = guardian_phone(db, student.id)
    if not phone:
        return 0
    local = event_at.astimezone(ZoneInfo("Asia/Dhaka"))
    name = student_full_name(student)
    template = str(policy.get("late_sms_template") or "Dear Guardian, {{student_name}} arrived late at {{time}} on {{date}}.")
    body = template.replace("{{student_name}}", name).replace("{{date}}", local.date().isoformat()).replace("{{time}}", local.strftime("%H:%M"))
    deliver_sms(db, school_id=school_id, user_id=user_id, recipient=phone, body=body, category="late", student_id=student.id, defer=True)
    return 1


def _ingest_one(
    db: Session, *, device: HikvisionDevice, school_id: uuid.UUID, event: HikvisionEventIn, user_id: uuid.UUID
) -> str:
    event_at = _as_utc(event.event_at, device.timezone)
    card_number = (event.card_number or event.person_code).strip()
    duplicate_conditions = [
        HikvisionAttendanceEvent.device_id == device.id,
        HikvisionAttendanceEvent.person_code == card_number,
        HikvisionAttendanceEvent.event_at == event_at,
    ]
    duplicate = db.scalar(select(HikvisionAttendanceEvent).where(*duplicate_conditions))
    if not duplicate and event.external_event_id:
        duplicate = db.scalar(
            select(HikvisionAttendanceEvent).where(
                HikvisionAttendanceEvent.device_id == device.id,
                HikvisionAttendanceEvent.external_event_id == event.external_event_id,
            )
        )
    if duplicate:
        return "duplicate"

    credential = db.scalar(
        select(HikvisionStudentCredential).where(
            HikvisionStudentCredential.device_id == device.id,
            HikvisionStudentCredential.person_code == card_number,
            HikvisionStudentCredential.active.is_(True),
        )
    )
    raw = HikvisionAttendanceEvent(
        device_id=device.id,
        student_id=None,
        attendance_id=None,
        external_event_id=event.external_event_id,
        person_code=card_number,
        event_at=event_at,
        verification_method=event.verification_method,
        processing_status="unmatched",
        raw_payload=event.raw_payload,
        received_at=datetime.now(timezone.utc),
    )
    # Explicit mappings are reserved for legacy device users or a roll number
    # reused across classes.  The normal path is cardNo == enrollment.roll_number.
    enrollment: Enrollment | None = None
    student: Student | None = db.get(Student, credential.student_id) if credential else None
    if not student:
        match = _active_enrollment_for_card(db, school_id=school_id, card_number=card_number)
        if match:
            student, enrollment = match
    if not student:
        db.add(raw)
        return "unmatched"

    raw.student_id = student.id
    if not student or student.school_id != school_id or student.status != "active":
        raw.processing_status = "ignored"
        db.add(raw)
        return "ignored"

    if not enrollment:
        year = db.scalar(
            select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_current.is_(True)).limit(1)
        )
        enrollment = (
            db.scalar(
                select(Enrollment).where(
                    Enrollment.student_id == student.id,
                    Enrollment.academic_year_id == year.id if year else False,
                    Enrollment.status == "active",
                )
            )
            if year
            else None
        )
    if not enrollment:
        raw.processing_status = "ignored"
        db.add(raw)
        return "ignored"

    day = _attendance_date(event_at, device.timezone)
    attendance = db.scalar(
        select(StudentAttendance).where(
            StudentAttendance.student_id == student.id,
            StudentAttendance.attendance_date == day,
        )
    )
    if not attendance:
        status = _status_for_event(db, event_at, device)
        attendance = StudentAttendance(
            attendance_date=day,
            student_id=student.id,
            class_id=enrollment.class_id,
            section_id=enrollment.section_id,
            status="present",
            is_late=status == "late",
            created_at=datetime.now(timezone.utc),
        )
        db.add(attendance)
        db.flush()
        raw.processing_status = "processed"
        if status == "late":
            settings_row = db.scalar(
                select(Setting).where(Setting.school_id == device.school_id, Setting.key == "attendance.settings")
            )
            try:
                policy = json.loads(settings_row.value) if settings_row and settings_row.value else {}
            except (TypeError, ValueError):
                policy = {}
            _queue_late_sms(db, school_id=school_id, user_id=user_id, student=student, event_at=event_at, policy=policy)
        result = "processed"
    elif attendance.status == "absent":
        # A valid later fingerprint is stronger evidence than an earlier
        # absence mark.  This also repairs an absence created before the
        # student reached the device.  Leave, present, late, and other manual
        # outcomes remain authoritative.
        attendance.status = "present"
        was_late = _status_for_event(db, event_at, device) == "late"
        attendance.is_late = was_late
        raw.processing_status = "corrected_absent"
        if was_late:
            settings_row = db.scalar(
                select(Setting).where(Setting.school_id == device.school_id, Setting.key == "attendance.settings")
            )
            try:
                policy = json.loads(settings_row.value) if settings_row and settings_row.value else {}
            except (TypeError, ValueError):
                policy = {}
            _queue_late_sms(db, school_id=school_id, user_id=user_id, student=student, event_at=event_at, policy=policy)
        result = "corrected_absent"
    else:
        # Leave, a manual present/late mark, or a prior biometric punch is
        # authoritative; never overwrite it merely because another punch
        # arrives.
        raw.processing_status = "already_marked"
        result = "already_marked"
    raw.attendance_id = attendance.id
    db.add(raw)
    return result


@router.get("/devices", response_model=list[HikvisionDeviceOut])
def list_devices(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[HikvisionDeviceOut]:
    rows = db.execute(
        select(HikvisionDevice).where(HikvisionDevice.school_id == school_id).order_by(HikvisionDevice.name.asc())
    ).scalars().all()
    return [_out(row) for row in rows]


@router.post("/devices", response_model=HikvisionDeviceOut, dependencies=[Depends(require_permission("attendance:write"))])
def create_device(
    payload: HikvisionDeviceCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> HikvisionDeviceOut:
    row = HikvisionDevice(school_id=school_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return _out(row)


@router.put("/devices/{device_id}", response_model=HikvisionDeviceOut, dependencies=[Depends(require_permission("attendance:write"))])
def update_device(
    device_id: uuid.UUID,
    payload: HikvisionDeviceUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> HikvisionDeviceOut:
    row = _device(db, device_id, school_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return _out(row)


@router.post("/devices/{device_id}/credentials", dependencies=[Depends(require_permission("attendance:write"))])
def map_student_credential(
    device_id: uuid.UUID,
    payload: HikvisionCredentialCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    device = _device(db, device_id, school_id)
    student = db.get(Student, payload.student_id)
    if not student or student.school_id != school_id:
        raise not_found("Student not found")
    row = db.scalar(
        select(HikvisionStudentCredential).where(
            HikvisionStudentCredential.device_id == device.id,
            HikvisionStudentCredential.person_code == payload.person_code.strip(),
        )
    )
    if row and row.student_id != student.id:
        raise problem(status_code=409, title="Conflict", detail="This device person code is already assigned to another student")
    if row:
        row.active = True
    else:
        db.add(HikvisionStudentCredential(device_id=device.id, student_id=student.id, person_code=payload.person_code.strip()))
    db.commit()
    return {"status": "ok"}


@router.get("/devices/{device_id}/credentials")
def list_student_credentials(
    device_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[dict[str, str | bool]]:
    device = _device(db, device_id, school_id)
    rows = db.execute(
        select(HikvisionStudentCredential, Student)
        .join(Student, Student.id == HikvisionStudentCredential.student_id)
        .where(HikvisionStudentCredential.device_id == device.id, Student.school_id == school_id)
        .order_by(HikvisionStudentCredential.person_code.asc())
    ).all()
    return [
        {
            "id": str(credential.id),
            "student_id": str(student.id),
            "student_name": " ".join(part for part in [student.first_name, student.last_name] if part),
            "admission_no": student.admission_no or "",
            "person_code": credential.person_code,
            "active": credential.active,
        }
        for credential, student in rows
    ]


@router.post("/devices/{device_id}/events/ingest", dependencies=[Depends(require_permission("attendance:write"))])
def ingest_events(
    device_id: uuid.UUID,
    payload: HikvisionIngestRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    # Serialize biometric writes across devices in this school. PostgreSQL
    # releases this lock on commit/rollback, including when a worker fails.
    db.execute(select(School.id).where(School.id == school_id).with_for_update()).first()
    device = _device(db, device_id, school_id)
    if not device.active:
        raise problem(status_code=409, title="Conflict", detail="Device is inactive")
    counts: dict[str, int] = {"processed": 0, "corrected_absent": 0, "already_marked": 0, "unmatched": 0, "ignored": 0, "duplicate": 0}
    for event in payload.events:
        counts[_ingest_one(db, device=device, school_id=school_id, event=event, user_id=user.id)] += 1
        # SessionLocal disables autoflush; make this punch visible to the next
        # duplicate/attendance lookup before processing another event.
        db.flush()
    db.commit()
    return counts


def _post_json(url: str, payload: dict[str, Any], headers: dict[str, str], *, timeout: float = 30) -> dict[str, Any]:
    request = Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    try:
        with urlopen(request, timeout=timeout) as response:
            body = json.loads(response.read().decode("utf-8"))
            if not isinstance(body, dict):
                raise ValueError("Expected a JSON object")
            return body
    except (URLError, ValueError, TimeoutError) as exc:
        raise problem(status_code=502, title="Bad Gateway", detail=f"Hikvision request failed: {exc}")


def _sync_since(device: HikvisionDevice) -> datetime:
    """Re-pull yesterday and today, extending the window after downtime.

    An earlier empty sync used to set last_sync_at to "now", which then hid
    morning punches such as a 10:28 Hik-Connect transaction.
    """
    try:
        tz = ZoneInfo(device.timezone or "Asia/Dhaka")
    except Exception:
        tz = ZoneInfo("Asia/Dhaka")
    local_day = datetime.now(tz).date() - timedelta(days=1)
    since = datetime.combine(local_day, time.min, tzinfo=tz).astimezone(timezone.utc)
    if device.last_sync_at:
        # Catch up after downtime, including the delayed punches just before
        # the last successful pass. Re-read a day for late cloud delivery.
        last = _as_utc(device.last_sync_at, device.timezone)
        since = min(since, last - timedelta(days=1, minutes=SYNC_DELAY_MINUTES))
    oldest = datetime.combine(datetime.now(tz).date() - timedelta(days=29), time.min, tzinfo=tz).astimezone(timezone.utc)
    return max(since, oldest)


def _cloud_record_list(response: dict[str, Any]) -> list[dict[str, Any]]:
    data = response.get("data")
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    if not isinstance(data, dict):
        return []
    for key in ("recordList", "list", "rows", "items", "records"):
        value = data.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    return []


def _record_identity_values(record: dict[str, Any]) -> set[str]:
    values: set[str] = set()
    for key in (
        "deviceId",
        "deviceID",
        "serialNo",
        "deviceSerial",
        "deviceSerialNo",
        "sn",
        "serial",
        "deviceName",
    ):
        value = record.get(key)
        if value:
            values.add(str(value).strip())
            values.add(str(value).strip().casefold())
    return {value for value in values if value}


def _record_matches_device(device: HikvisionDevice, record: dict[str, Any]) -> bool:
    remote_ids = _record_identity_values(record)
    remote_name = str(record.get("deviceName") or "").strip().casefold()
    configured_id = (device.external_device_id or "").strip()
    configured_name = device.name.strip().casefold()
    default_name = "hikvision attendance device"

    if configured_id:
        if configured_id in remote_ids or configured_id.casefold() in remote_ids:
            return True
        if remote_name and remote_name == configured_name and configured_name != default_name:
            return True
        # Live setups often store the Hik-Connect serial (FV9370154) while the
        # search API sends a different cloud deviceId.  If the KusKul name was
        # left as the default, keep the punch instead of dropping the whole day.
        if configured_name == default_name:
            return True
        return False
    if remote_name and configured_name != default_name and remote_name != configured_name:
        return False
    return True


def _record_event_time(record: dict[str, Any], device_timezone: str) -> str | None:
    when = str(
        record.get("recordTime")
        or record.get("eventTime")
        or record.get("punchTime")
        or "",
    ).strip()
    date_value = str(record.get("date") or record.get("attendanceDate") or "").strip()
    clock = str(record.get("clockTime") or record.get("time") or "").strip()
    try:
        tz = ZoneInfo(device_timezone or "Asia/Dhaka")
    except Exception:
        tz = ZoneInfo("Asia/Dhaka")

    def _as_iso(value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=tz)
        return value.isoformat()

    if when and ("-" in when or "T" in when or " " in when):
        try:
            return _as_iso(datetime.fromisoformat(when.replace("Z", "+00:00").replace(" ", "T")))
        except ValueError:
            pass
    if date_value and clock:
        clock_with_seconds = clock if clock.count(":") >= 2 else f"{clock}:00"
        stamp = clock_with_seconds if "T" in clock or "-" in clock else f"{date_value}T{clock_with_seconds}"
        try:
            return _as_iso(datetime.fromisoformat(stamp.replace(" ", "T")))
        except ValueError:
            return None
    return None


def _unique_event_id(record: dict[str, Any]) -> str | None:
    device_serials = {
        str(record.get(key) or "").strip()
        for key in ("deviceSerial", "deviceSerialNo", "deviceId", "deviceID", "sn")
        if record.get(key)
    }
    for key in ("eventId", "uuid", "attendanceId"):
        value = str(record.get(key) or "").strip()
        if value and value not in device_serials:
            return value
    serial_no = str(record.get("serialNo") or "").strip()
    if serial_no and serial_no not in device_serials:
        return serial_no
    return None


def _cloud_event(record: dict[str, Any], device: HikvisionDevice) -> HikvisionEventIn | None:
    info = (record.get("personInfo") or {}).get("personInfo") or (record.get("personInfo") or {}).get("baseInfo") or {}
    # Hik-Connect labels this column "ID" in Attendance > Transaction.
    # Depending on the deployed API version it is returned as personCode,
    # employeeNo, personId, or simply id.  School policy uses this same
    # value as the student's current enrollment roll number.
    card_number = (
        record.get("cardNo")
        or info.get("cardNo")
        or record.get("cardNumber")
        or record.get("employeeNo")
        or info.get("employeeNo")
    )
    person_id = (
        info.get("personCode")
        or info.get("employeeNo")
        or info.get("personId")
        or record.get("personCode")
        or record.get("employeeNo")
        or record.get("personId")
        or record.get("jobNo")
        or info.get("jobNo")
        or info.get("id")
        or record.get("id")
    )
    code = card_number or person_id
    when = _record_event_time(record, device.timezone)
    source_id = _unique_event_id(record)
    if not code or not when:
        return None
    return HikvisionEventIn(
        person_code=str(person_id or code),
        card_number=str(card_number) if card_number else None,
        event_at=when,
        external_event_id=source_id,
        verification_method=str(record.get("verifyMode") or record.get("verificationMethod") or "fingerprint"),
        raw_payload=record,
    )

@router.post("/devices/{device_id}/test-connection", dependencies=[Depends(require_permission("attendance:write"))])
def test_hikvision_connection(
    device_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> dict[str, Any]:
    """Authenticate and read one tiny page, without writes or ingestion locks."""
    device = _device(db, device_id, school_id)
    if not device.active or not device.app_key or not device.secret_key:
        raise problem(status_code=400, title="Bad Request", detail="Active device credentials are required")
    token_response = _post_json(
        "https://isgp-team.hikcentralconnect.com/api/hccgw/platform/v1/token/get",
        {"appKey": device.app_key, "secretKey": device.secret_key},
        {"Content-Type": "application/json"}, timeout=5,
    )
    data = token_response.get("data") or {}
    if str(token_response.get("errorCode")) != "0" or not isinstance(data, dict) or not data.get("accessToken"):
        raise problem(status_code=502, title="Bad Gateway", detail="Hikvision authentication failed")
    base_url = str(device.area_domain or data.get("areaDomain") or "").rstrip("/")
    if not base_url.startswith("https://"):
        raise problem(status_code=502, title="Bad Gateway", detail="Hikvision area domain was invalid")
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=SYNC_DELAY_MINUTES)
    response = _post_json(
        f"{base_url}{device.api_url}",
        {"pageIndex": 1, "pageSize": 5, "beginTime": (cutoff - timedelta(days=2)).isoformat(),
         "endTime": cutoff.isoformat()},
        {"Content-Type": "application/json", "Token": data["accessToken"]}, timeout=5,
    )
    if str(response.get("errorCode", "0")) != "0" or not isinstance(response.get("data"), (dict, list)):
        raise problem(status_code=502, title="Bad Gateway", detail="Connected to Hikvision, but attendance data could not be read")
    records = _cloud_record_list(response)[:5]
    usable = 0
    for record in records:
        if not _record_matches_device(device, record):
            continue
        try:
            event = _cloud_event(record, device)
            if event and _as_utc(event.event_at, device.timezone) <= cutoff:
                usable += 1
        except (ValidationError, TypeError, AttributeError, ValueError):
            continue
    return {"connected": True, "sampled": len(records), "usable": usable}


@router.post("/devices/{device_id}/sync", dependencies=[Depends(require_permission("attendance:write"))])
def sync_hikcentral_connect(
    device_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict[str, int]:
    return _sync_cloud(device_id, db, user, school_id)


@router.post("/devices/{device_id}/sync-batch", dependencies=[Depends(require_permission("attendance:write"))])
def sync_hikvision_batch(
    device_id: uuid.UUID, payload: HikvisionSyncBatchRequest, db: Session = Depends(get_db),
    user: User = Depends(get_current_user), school_id=Depends(get_active_school_id),
) -> dict[str, Any]:
    return _sync_cloud(device_id, db, user, school_id, batch=payload)


def _sync_cloud(device_id, db: Session, user: User, school_id, batch: HikvisionSyncBatchRequest | None = None) -> dict[str, Any]:
    """Commit one page per manual request; cron streams the bounded window."""
    device = _device(db, device_id, school_id)
    if not device.active or not device.app_key or not device.secret_key:
        raise problem(status_code=400, title="Bad Request", detail="Active device credentials are required")
    started_at = datetime.now(timezone.utc)
    cutoff = started_at - timedelta(minutes=SYNC_DELAY_MINUTES)
    since = _sync_since(device)
    if batch:
        tz = ZoneInfo(device.timezone)
        today = started_at.astimezone(tz).date()
        if not today - timedelta(days=29) <= batch.start_date <= batch.end_date <= today:
            raise problem(status_code=400, title="Bad Request", detail="Choose dates within the last 30 days, with the start on or before the end")
        since = datetime.combine(batch.start_date, time.min, tzinfo=tz).astimezone(timezone.utc)
        range_end = datetime.combine(batch.end_date + timedelta(days=1), time.min, tzinfo=tz).astimezone(timezone.utc)
        cutoff = min(cutoff, range_end - timedelta(microseconds=1))
        if batch.page_index > 1 and (not batch.cutoff or not batch.previous_page):
            raise problem(status_code=400, title="Bad Request", detail="Continuation requires the previous batch cutoff and page fingerprint")
        if batch.cutoff:
            if batch.cutoff.tzinfo is None:
                raise problem(status_code=400, title="Bad Request", detail="Batch cutoff must include a timezone")
            cutoff = min(cutoff, batch.cutoff.astimezone(timezone.utc))
        if cutoff < since:
            raise problem(status_code=400, title="Bad Request", detail="No punches in this range are 12 minutes old yet; choose an earlier start date")

    def post(url, payload, headers):
        return _post_json(url, payload, headers, timeout=8) if batch else _post_json(url, payload, headers)

    token_response = post(
        "https://isgp-team.hikcentralconnect.com/api/hccgw/platform/v1/token/get",
        {"appKey": device.app_key, "secretKey": device.secret_key},
        {"Content-Type": "application/json"},
    )
    data = token_response.get("data") or {}
    if str(token_response.get("errorCode")) != "0" or not isinstance(data, dict) or not data.get("accessToken") or not (device.area_domain or data.get("areaDomain")):
        raise problem(status_code=502, title="Bad Gateway", detail="Hikvision token response was invalid")
    base_url = str(device.area_domain or data["areaDomain"]).rstrip("/")
    if not base_url.startswith("https://"):
        raise problem(status_code=502, title="Bad Gateway", detail="Hikvision area domain was invalid")
    device.area_domain = base_url
    db.commit()
    result = {key: 0 for key in (
        "processed", "corrected_absent", "already_marked", "unmatched", "ignored", "duplicate",
        "pulled", "skipped_device", "deferred", "invalid",
    )}
    page_index = batch.page_index if batch else 1
    previous_page = bytes.fromhex(batch.previous_page) if batch and batch.previous_page else None
    batch_page_size = 100 if batch else SYNC_INGEST_BATCH_SIZE
    while True:
        response = post(
            f"{base_url}{device.api_url}",
            {"pageIndex": page_index, "pageSize": batch_page_size,
             "beginTime": since.isoformat(), "endTime": cutoff.isoformat()},
            {"Content-Type": "application/json", "Token": data["accessToken"]},
        )
        if str(response.get("errorCode", "0")) != "0" or not isinstance(response.get("data"), (dict, list)):
            raise problem(status_code=502, title="Bad Gateway", detail="Hikvision event search failed; saved pages will be deduplicated on retry")
        page = _cloud_record_list(response)
        if not page:
            if batch:
                return {**result, "done": True, "next_page": None, "cutoff": cutoff.isoformat(), "previous_page": batch.previous_page}
            break
        if batch and len(page) > batch_page_size:
            raise problem(status_code=502, title="Bad Gateway", detail="Hikvision exceeded the requested batch size; please retry")
        fingerprint = hashlib.sha256(json.dumps(page, sort_keys=True).encode()).digest()
        if fingerprint == previous_page:
            raise problem(status_code=502, title="Bad Gateway", detail="Hikvision repeated a page; sync stopped to avoid an endless download")
        previous_page = fingerprint
        result["pulled"] += len(page)
        # Lock only during writes, never while waiting on the cloud. This also
        # serializes cron and manual syncs without retaining all events in RAM.
        db.execute(select(School.id).where(School.id == school_id).with_for_update()).first()
        events = []
        for record in page:
            if not _record_matches_device(device, record):
                result["skipped_device"] += 1
                continue
            try:
                event = _cloud_event(record, device)
            except (ValidationError, TypeError, AttributeError, ValueError):
                event = None
            if event is None:
                result["invalid"] += 1
                continue
            if _as_utc(event.event_at, device.timezone) > cutoff:
                result["deferred"] += 1
                continue
            if _as_utc(event.event_at, device.timezone) < since:
                result["ignored"] += 1
                continue
            events.append(event)
        # Most pulses replay existing punches. Resolve their keys in one query
        # per page instead of querying student/enrollment data for each replay.
        identities = [((event.card_number or event.person_code).strip(),
                       _as_utc(event.event_at, device.timezone)) for event in events]
        external_ids = [event.external_event_id for event in events if event.external_event_id]
        existing = db.execute(select(
            HikvisionAttendanceEvent.person_code, HikvisionAttendanceEvent.event_at,
            HikvisionAttendanceEvent.external_event_id,
        ).where(HikvisionAttendanceEvent.device_id == device.id, or_(
            tuple_(HikvisionAttendanceEvent.person_code, HikvisionAttendanceEvent.event_at).in_(identities),
            HikvisionAttendanceEvent.external_event_id.in_(external_ids),
        ))).all() if events else []
        seen_times = {(code, _as_utc(stamp, "UTC")) for code, stamp, _ in existing}
        seen_ids = {external for _, _, external in existing if external}
        for event, identity in zip(events, identities):
            if identity in seen_times or (event.external_event_id and event.external_event_id in seen_ids):
                result["duplicate"] += 1
                continue
            result[_ingest_one(db, device=device, school_id=school_id, event=event, user_id=user.id)] += 1
            db.flush()
            seen_times.add(identity)
            if event.external_event_id:
                seen_ids.add(event.external_event_id)
        # Earlier pages survive a later network/database failure. The success
        # timestamp remains unchanged until the entire search finishes.
        db.commit()
        logger.info("Hikvision device %s: page %s saved; pulled=%s duplicate=%s deferred=%s invalid=%s",
                    device.id, page_index, result["pulled"], result["duplicate"], result["deferred"], result["invalid"])
        if batch:
            return {**result, "done": False, "next_page": page_index + 1,
                    "cutoff": cutoff.isoformat(), "previous_page": fingerprint.hex()}
        page_index += 1
        # Ask for the next page even after a short page: providers may impose
        # a smaller page size than requested or return an inaccurate total.
    if result["invalid"]:
        # Unparseable records (unknown personInfo layouts, garbage timestamps)
        # must never stall the whole device. Saved punches advance the checkpoint
        # so the next pulse re-reads only a small window; the invalid count is
        # still reported for observability.
        logger.warning("Hikvision device %s: %s records could not be parsed and were skipped; saved valid punches and advanced the sync checkpoint", device.id, result["invalid"])
    db.execute(select(School.id).where(School.id == school_id).with_for_update()).first()
    db.refresh(device)
    last = _as_utc(device.last_sync_at, device.timezone) if device.last_sync_at else None
    device.last_sync_at = max(last, started_at) if last else started_at
    db.commit()
    return result
