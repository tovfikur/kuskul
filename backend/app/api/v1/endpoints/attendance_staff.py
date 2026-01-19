import uuid
from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.school import School
from app.models.staff import Staff
from app.models.teacher_assignment import StaffAttendance
from app.schemas.attendance import MarkStaffAttendanceRequest, StaffAttendanceCheckRequest, StaffAttendanceOut

router = APIRouter(dependencies=[Depends(require_permission("attendance:read"))])


def _dt(d: date) -> datetime:
    return datetime.combine(d, time.min, tzinfo=timezone.utc)


def _out(r: StaffAttendance) -> StaffAttendanceOut:
    return StaffAttendanceOut(
        id=r.id,
        attendance_date=r.attendance_date.date(),
        staff_id=r.staff_id,
        status=r.status,
        check_in_at=r.check_in_at,
        check_out_at=r.check_out_at,
        method=r.method,
        device_id=r.device_id,
    )


def _staff_id_from_qr(db: Session, *, school_id: uuid.UUID, qr_payload: str) -> uuid.UUID:
    parts = [p.strip() for p in qr_payload.split("|")]
    if len(parts) < 4 or parts[0] != "KUSKUL" or parts[1] != "STAFF":
        raise problem(status_code=400, title="Bad Request", detail="Invalid QR payload")
    school_code = parts[2]
    staff_id_str = parts[3]
    school = db.get(School, school_id)
    if school and school.code and school.code != school_code:
        raise problem(status_code=400, title="Bad Request", detail="QR payload does not match this school")
    try:
        return uuid.UUID(staff_id_str)
    except Exception as exc:
        raise problem(status_code=400, title="Bad Request", detail="Invalid staff ID in QR payload") from exc


@router.post("/mark", dependencies=[Depends(require_permission("attendance:write"))])
def mark_staff_attendance(
    payload: MarkStaffAttendanceRequest,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    d = _dt(payload.attendance_date)
    now = datetime.now(timezone.utc)
    upserts = 0
    for item in payload.items:
        staff = db.get(Staff, item.staff_id)
        if not staff or staff.school_id != school_id:
            raise not_found("Staff not found")
        existing = db.scalar(
            select(StaffAttendance).where(StaffAttendance.staff_id == item.staff_id, StaffAttendance.attendance_date == d)
        )
        if existing:
            existing.status = item.status
        else:
            db.add(StaffAttendance(attendance_date=d, staff_id=item.staff_id, status=item.status, created_at=now))
        upserts += 1
    db.commit()
    return {"marked": upserts}


@router.get("/date/{attendance_date}", response_model=list[StaffAttendanceOut])
def get_staff_attendance_by_date(
    attendance_date: date,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[StaffAttendanceOut]:
    d = _dt(attendance_date)
    rows = db.execute(
        select(StaffAttendance)
        .join(Staff, Staff.id == StaffAttendance.staff_id)
        .where(Staff.school_id == school_id, StaffAttendance.attendance_date == d)
        .order_by(StaffAttendance.created_at.asc())
    ).scalars().all()
    return [_out(r) for r in rows]


@router.get("/{attendance_id}", response_model=StaffAttendanceOut)
def get_staff_attendance_record(
    attendance_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StaffAttendanceOut:
    r = db.get(StaffAttendance, attendance_id)
    if not r:
        raise not_found("Attendance not found")
    staff = db.get(Staff, r.staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Attendance not found")
    return _out(r)


@router.post("/check-in", response_model=StaffAttendanceOut, dependencies=[Depends(require_permission("attendance:write"))])
def staff_check_in(
    payload: StaffAttendanceCheckRequest,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StaffAttendanceOut:
    if not payload.staff_id and not payload.qr_payload:
        raise problem(status_code=400, title="Bad Request", detail="staff_id or qr_payload is required")
    staff_id = payload.staff_id or _staff_id_from_qr(db, school_id=school_id, qr_payload=payload.qr_payload or "")
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")

    now = datetime.now(timezone.utc)
    d = _dt(now.date())
    r = db.scalar(select(StaffAttendance).where(StaffAttendance.staff_id == staff_id, StaffAttendance.attendance_date == d))
    if not r:
        r = StaffAttendance(
            attendance_date=d,
            staff_id=staff_id,
            status="present",
            check_in_at=now,
            check_out_at=None,
            method=payload.method,
            device_id=payload.device_id,
            created_at=now,
        )
        db.add(r)
        db.commit()
        db.refresh(r)
        return _out(r)

    if r.check_in_at is not None and r.check_out_at is None:
        raise problem(status_code=409, title="Conflict", detail="Already checked in")
    if r.check_in_at is not None and r.check_out_at is not None:
        raise problem(status_code=409, title="Conflict", detail="Already checked out")
    r.status = "present"
    r.check_in_at = now
    r.method = payload.method
    r.device_id = payload.device_id
    db.commit()
    db.refresh(r)
    return _out(r)


@router.post("/check-out", response_model=StaffAttendanceOut, dependencies=[Depends(require_permission("attendance:write"))])
def staff_check_out(
    payload: StaffAttendanceCheckRequest,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StaffAttendanceOut:
    if not payload.staff_id and not payload.qr_payload:
        raise problem(status_code=400, title="Bad Request", detail="staff_id or qr_payload is required")
    staff_id = payload.staff_id or _staff_id_from_qr(db, school_id=school_id, qr_payload=payload.qr_payload or "")
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")

    now = datetime.now(timezone.utc)
    d = _dt(now.date())
    r = db.scalar(select(StaffAttendance).where(StaffAttendance.staff_id == staff_id, StaffAttendance.attendance_date == d))
    if not r:
        raise problem(status_code=409, title="Conflict", detail="Cannot check out before check in")
    if r.check_in_at is None:
        raise problem(status_code=409, title="Conflict", detail="Cannot check out before check in")
    if r.check_out_at is not None:
        raise problem(status_code=409, title="Conflict", detail="Already checked out")
    r.check_out_at = now
    r.method = payload.method
    r.device_id = payload.device_id
    db.commit()
    db.refresh(r)
    return _out(r)


@router.put("/{attendance_id}", include_in_schema=False)
def update_staff_attendance() -> None:
    raise problem(status_code=501, title="Not Implemented", detail="Update staff attendance is not implemented yet")


@router.get("/report", include_in_schema=False)
def get_staff_attendance_report() -> None:
    raise problem(status_code=501, title="Not Implemented", detail="Staff attendance report is not implemented yet")


@router.get("/summary", include_in_schema=False)
def get_staff_attendance_summary() -> None:
    raise problem(status_code=501, title="Not Implemented", detail="Staff attendance summary is not implemented yet")
