import json
import uuid
from datetime import date, datetime, time, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission
from app.core.problems import not_found, not_implemented, problem
from app.db.session import get_db
from app.models.attendance_excuse import AttendanceExcuse
from app.models.school_class import SchoolClass
from app.models.section import Section
from app.models.academic_year import AcademicYear
from app.models.enrollment import Enrollment
from app.models.student import Student
from app.models.teacher_assignment import StudentAttendance
from app.models.user import User
from app.schemas.attendance import MarkStudentAttendanceRequest, StudentAttendanceOut
from app.services.absence_sms import (
    already_sent_student_ids,
    approved_excuse_student_ids,
    current_absence_streak,
    daily_context,
    load_history,
    mass_absence_stats,
    month_totals,
    should_send_daily_absence,
)
from app.services.ai_message_writer import compose_daily_absence
from app.services.sms import deliver_sms, guardian_phone, is_sms_holiday, student_full_name

router = APIRouter(dependencies=[Depends(require_permission("attendance:read"))])


def _dt(d: date) -> datetime:
    return datetime.combine(d, time.min, tzinfo=timezone.utc)


def _out(r: StudentAttendance) -> StudentAttendanceOut:
    return StudentAttendanceOut(
        id=r.id,
        attendance_date=r.attendance_date.date(),
        student_id=r.student_id,
        class_id=r.class_id,
        section_id=r.section_id,
        status=r.status,
        is_late=r.is_late,
    )


@router.post("/mark", dependencies=[Depends(require_permission("attendance:write"))])
def mark_student_attendance(
    payload: MarkStudentAttendanceRequest,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    if payload.section_id:
        sec = db.get(Section, payload.section_id)
        if not sec:
            raise not_found("Section not found")
        cls = db.get(SchoolClass, sec.class_id)
        if not cls or cls.school_id != school_id:
            raise not_found("Section not found")
    if payload.class_id:
        cls = db.get(SchoolClass, payload.class_id)
        if not cls or cls.school_id != school_id:
            raise not_found("Class not found")

    d = _dt(payload.attendance_date)
    now = datetime.now(timezone.utc)
    upserts = 0
    for item in payload.items:
        student = db.get(Student, item.student_id)
        if not student or student.school_id != school_id:
            raise not_found("Student not found")
        existing = db.scalar(
            select(StudentAttendance).where(
                StudentAttendance.student_id == item.student_id,
                StudentAttendance.attendance_date == d,
            )
        )
        if existing:
            existing.status = item.status
            existing.is_late = item.status == "late"
            if existing.is_late:
                existing.status = "present"
            existing.class_id = payload.class_id
            existing.section_id = payload.section_id
        else:
            db.add(
                StudentAttendance(
                    attendance_date=d,
                    student_id=item.student_id,
                    class_id=payload.class_id,
                    section_id=payload.section_id,
                    status="present" if item.status == "late" else item.status,
                    is_late=item.status == "late",
                    created_at=now,
                )
            )
        upserts += 1
    db.commit()
    return {"marked": upserts}


@router.post("/bulk-mark", dependencies=[Depends(require_permission("attendance:write"))])
def bulk_mark_attendance(
    payload: MarkStudentAttendanceRequest,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    return mark_student_attendance(payload=payload, db=db, school_id=school_id)


@router.get("/date/{attendance_date}", response_model=list[StudentAttendanceOut])
def get_attendance_by_date(
    attendance_date: date,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    class_id: Optional[uuid.UUID] = None,
    section_id: Optional[uuid.UUID] = None,
) -> list[StudentAttendanceOut]:
    d = _dt(attendance_date)
    q = (
        select(StudentAttendance)
        .join(Student, Student.id == StudentAttendance.student_id)
        .where(Student.school_id == school_id, StudentAttendance.attendance_date == d)
    )
    if class_id:
        q = q.where(StudentAttendance.class_id == class_id)
    if section_id:
        q = q.where(StudentAttendance.section_id == section_id)
    rows = db.execute(q.order_by(StudentAttendance.created_at.asc())).scalars().all()
    return [_out(r) for r in rows]


@router.get("/today-summary")
def today_attendance_summary(
    attendance_date: Optional[date] = None,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict:
    """Class/section register summary for the active academic year.

    `late` is a present attendance outcome. Any enrolled active student not
    recorded as present, late, or leave is counted as absent for the dashboard.
    """
    year = db.scalar(
        select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_current.is_(True)).limit(1)
    )
    selected_date = attendance_date or datetime.now(ZoneInfo("Asia/Dhaka")).date()

    # Start with every available class/section so the dashboard can show an
    # empty card before the first student is enrolled or attendance is marked.
    class_rows = db.execute(
        select(SchoolClass, Section)
        .outerjoin(Section, (Section.class_id == SchoolClass.id) & Section.is_active.is_(True))
        .where(SchoolClass.school_id == school_id, SchoolClass.is_active.is_(True))
        .order_by(SchoolClass.name.asc(), Section.name.asc())
    ).all()
    grouped: dict[tuple[uuid.UUID, Optional[uuid.UUID]], dict] = {}
    for school_class, section in class_rows:
        key = (school_class.id, section.id if section else None)
        grouped[key] = {
            "class_id": str(school_class.id),
            "class_name": school_class.name,
            "section_id": str(section.id) if section else None,
            "section_name": section.name if section else "Class Summary",
            "total_students": 0,
            "present": 0,
            "late": 0,
            "leave": 0,
        }

    if not year:
        for group in grouped.values():
            group["absent"] = 0
        return {"date": selected_date.isoformat(), "sections": list(grouped.values())}

    day = _dt(selected_date)
    rows = db.execute(
        select(Enrollment, Student, SchoolClass, Section, StudentAttendance)
        .join(Student, Student.id == Enrollment.student_id)
        .join(SchoolClass, SchoolClass.id == Enrollment.class_id)
        .outerjoin(Section, Section.id == Enrollment.section_id)
        .outerjoin(
            StudentAttendance,
            (StudentAttendance.student_id == Enrollment.student_id)
            & (StudentAttendance.attendance_date == day),
        )
        .where(
            Student.school_id == school_id,
            Enrollment.academic_year_id == year.id,
            Enrollment.status == "active",
            Student.status == "active",
        )
        .order_by(SchoolClass.name.asc(), Section.name.asc())
    ).all()
    seen: set[tuple[uuid.UUID, Optional[uuid.UUID], uuid.UUID]] = set()
    for enrollment, student, school_class, section, attendance in rows:
        key = (enrollment.class_id, enrollment.section_id)
        student_key = (*key, student.id)
        if student_key in seen:
            continue
        seen.add(student_key)
        group = grouped.setdefault(
            key,
            {
                "class_id": str(school_class.id),
                "class_name": school_class.name,
                "section_id": str(section.id) if section else None,
                "section_name": section.name if section else "Class Summary",
                "total_students": 0,
                "present": 0,
                "late": 0,
                "leave": 0,
            },
        )
        group["total_students"] += 1
        status = attendance.status if attendance else ""
        if status == "present":
            if attendance and attendance.is_late:
                group["late"] += 1
            else:
                group["present"] += 1
        elif status == "leave":
            group["leave"] += 1
    sections = []
    for group in grouped.values():
        group["absent"] = group["total_students"] - group["present"] - group["late"] - group["leave"]
        sections.append(group)
    return {"date": selected_date.isoformat(), "sections": sections}


def _attendance_policy(db: Session, school_id: uuid.UUID) -> dict:
    from app.models.setting import Setting

    row = db.scalar(select(Setting).where(Setting.school_id == school_id, Setting.key == "attendance.settings"))
    if not row or not row.value:
        return {}
    try:
        return json.loads(row.value)
    except (TypeError, ValueError):
        return {}


@router.get("/sync-window")
def attendance_sync_window(
    db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> dict[str, str]:
    """The Dhaka time window used by the external Hikvision cron worker."""
    policy = _attendance_policy(db, school_id)
    return {
        "timezone": "Asia/Dhaka",
        "school_start_time": str(policy.get("school_start_time") or "08:00"),
        "attendance_end_time": str(policy.get("attendance_end_time") or "17:00"),
    }


@router.post("/process-absences", dependencies=[Depends(require_permission("attendance:write"))])
def process_absences(
    attendance_date: Optional[date] = None,
    force: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, int | bool | str]:
    """Idempotently mark missing active enrolments absent after the Dhaka cutoff.

    This endpoint is safe to call repeatedly from a scheduled job.  It only
    creates an absence (and one queued guardian SMS) when no attendance record
    exists for that student and local school day.
    """
    policy = _attendance_policy(db, school_id)
    user_id = user.id
    dhaka = ZoneInfo("Asia/Dhaka")
    now = datetime.now(dhaka)
    selected_date = attendance_date or now.date()
    # Teachers may complete attendance manually throughout the school day.
    # Missing active enrolments become absent only once the configured school
    # end time has passed in Dhaka.
    cutoff = policy.get("attendance_end_time", policy.get("attendance_cutoff_time", "17:00"))
    if not force:
        if not policy.get("auto_mark_absent", False):
            return {"marked_absent": 0, "sms_sent": 0, "sms_failed": 0, "sms_queued": 0, "skipped": "automatic absence processing is disabled"}
        try:
            cutoff_time = time.fromisoformat(cutoff)
        except ValueError:
            raise problem(status_code=400, title="Bad Request", detail="Attendance cutoff time is invalid")
        if selected_date != now.date() or now.time() < cutoff_time:
            return {"marked_absent": 0, "sms_sent": 0, "sms_failed": 0, "sms_queued": 0, "skipped": "school end time has not been reached"}
    if policy.get("exclude_holidays_from_absence", True) and is_sms_holiday(db, school_id, selected_date):
        return {"marked_absent": 0, "sms_sent": 0, "sms_failed": 0, "sms_queued": 0, "skipped": "holiday"}

    year = db.scalar(
        select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_current.is_(True)).limit(1)
    )
    if not year:
        return {"marked_absent": 0, "sms_sent": 0, "sms_failed": 0, "sms_queued": 0, "skipped": "no current academic year"}
    day = _dt(selected_date)
    rows = db.execute(
        select(Enrollment, Student)
        .join(Student, Student.id == Enrollment.student_id)
        .outerjoin(
            StudentAttendance,
            (StudentAttendance.student_id == Enrollment.student_id) & (StudentAttendance.attendance_date == day),
        )
        .where(
            Enrollment.academic_year_id == year.id,
            Enrollment.status == "active",
            Student.school_id == school_id,
            Student.status == "active",
            StudentAttendance.id.is_(None),
        )
    ).all()
    marked_absent = 0
    marked_leave = 0
    sms_sent = 0
    sms_failed = 0
    sms_queued = 0
    sms_suppressed_streak = 0
    sms_suppressed_mass_absence = 0
    sms_suppressed_already_sent = 0
    sms_suppressed_no_phone = 0
    send_sms = bool(policy.get("send_absent_sms", False))
    mass = mass_absence_stats(
        db, school_id=school_id, academic_year_id=year.id, day=selected_date, policy=policy
    )
    excuse_ids = approved_excuse_student_ids(db, school_id=school_id, day=selected_date)
    absent_entries: list[tuple[uuid.UUID, str, str]] = []
    now_utc = datetime.now(timezone.utc)
    for enrollment, student in rows:
        attendance_status = "leave" if student.id in excuse_ids else "absent"
        record = StudentAttendance(
            attendance_date=day,
            student_id=student.id,
            class_id=enrollment.class_id,
            section_id=enrollment.section_id,
            status=attendance_status,
            created_at=now_utc,
        )
        db.add(record)
        if attendance_status == "leave":
            marked_leave += 1
        else:
            marked_absent += 1
            absent_entries.append((student.id, student_full_name(student), student.medium or ""))
    # Commit attendance first so slow AI generation never holds write locks.
    db.commit()
    if send_sms and absent_entries and mass.mass_absence:
        sms_suppressed_mass_absence = len(absent_entries)
    if send_sms and absent_entries and not mass.mass_absence:
        history = load_history(
            db,
            school_id=school_id,
            student_ids=[student_id for student_id, _name, _medium in absent_entries],
            end_day=selected_date,
            policy=policy,
        )
        sent_today = already_sent_student_ids(
            db,
            school_id=school_id,
            category="absent",
            day=selected_date,
            student_ids=[student_id for student_id, _name, _medium in absent_entries],
        )
        for student_id, student_name, medium in absent_entries:
            streak = current_absence_streak(history, student_id, selected_date)
            phone = guardian_phone(db, student_id)
            allowed, reason = should_send_daily_absence(
                policy=policy,
                streak_days=streak.days,
                mass_absence=mass.mass_absence,
                already_sent=student_id in sent_today,
                has_phone=bool(phone),
            )
            if not allowed:
                if reason == "streak_limit":
                    sms_suppressed_streak += 1
                elif reason == "mass_absence":
                    sms_suppressed_mass_absence += 1
                elif reason == "already_sent":
                    sms_suppressed_already_sent += 1
                elif reason == "no_phone":
                    sms_suppressed_no_phone += 1
                continue
            month_absent_days, month_late_days = month_totals(history, student_id, selected_date)
            context = daily_context(
                db,
                school_id=school_id,
                student_name=student_name,
                medium=medium,
                day=selected_date,
                streak=streak,
                month_absent_days=month_absent_days,
                month_late_days=month_late_days,
            )
            body = compose_daily_absence(context, policy)
            status = deliver_sms(
                db,
                school_id=school_id,
                user_id=user_id,
                recipient=phone,
                body=body,
                category="absent",
                student_id=student_id,
            )
            if status == "sent":
                sms_sent += 1
            elif status == "failed":
                sms_failed += 1
            else:
                sms_queued += 1
    db.commit()
    return {
        "marked_absent": marked_absent,
        "marked_leave": marked_leave,
        "sms_sent": sms_sent,
        "sms_failed": sms_failed,
        "sms_queued": sms_queued,
        "sms_suppressed_streak": sms_suppressed_streak,
        "sms_suppressed_mass_absence": sms_suppressed_mass_absence,
        "sms_suppressed_already_sent": sms_suppressed_already_sent,
        "sms_suppressed_no_phone": sms_suppressed_no_phone,
        "sms_suppressed_excuse": marked_leave,
        "mass_absence": mass.mass_absence,
        "skipped": "mass_absence" if mass.mass_absence else "",
    }


@router.get("/{attendance_id}", response_model=StudentAttendanceOut)
def get_attendance_record(
    attendance_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StudentAttendanceOut:
    r = db.get(StudentAttendance, attendance_id)
    if not r:
        raise not_found("Attendance not found")
    student = db.get(Student, r.student_id)
    if not student or student.school_id != school_id:
        raise not_found("Attendance not found")
    return _out(r)


@router.put("/{attendance_id}", response_model=StudentAttendanceOut, dependencies=[Depends(require_permission("attendance:write"))])
def update_attendance(
    attendance_id: uuid.UUID,
    status: str,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StudentAttendanceOut:
    r = db.get(StudentAttendance, attendance_id)
    if not r:
        raise not_found("Attendance not found")
    student = db.get(Student, r.student_id)
    if not student or student.school_id != school_id:
        raise not_found("Attendance not found")
    r.status = status
    r.is_late = status == "late"
    if r.is_late:
        r.status = "present"
    db.commit()
    return _out(r)


@router.delete("/{attendance_id}", dependencies=[Depends(require_permission("attendance:write"))])
def delete_attendance(
    attendance_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    r = db.get(StudentAttendance, attendance_id)
    if not r:
        raise not_found("Attendance not found")
    student = db.get(Student, r.student_id)
    if not student or student.school_id != school_id:
        raise not_found("Attendance not found")
    db.delete(r)
    db.commit()
    return {"status": "ok"}


@router.get("/report", include_in_schema=False)
def get_attendance_report() -> None:
    raise not_implemented("Attendance reporting is not implemented yet")


@router.get("/summary", include_in_schema=False)
def get_attendance_summary() -> None:
    raise not_implemented("Attendance summary is not implemented yet")


@router.get("/defaulters", include_in_schema=False)
def get_attendance_defaulters() -> None:
    raise not_implemented("Attendance defaulters is not implemented yet")


@router.get("/statistics", include_in_schema=False)
def get_attendance_statistics() -> None:
    raise not_implemented("Attendance statistics is not implemented yet")


@router.post("/send-alerts", include_in_schema=False)
def send_attendance_alerts() -> None:
    raise not_implemented("Attendance alerts are not implemented yet")


@router.get("/excuses/pending")
def list_pending_excuses(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[dict]:
    rows = db.execute(
        select(AttendanceExcuse)
        .where(AttendanceExcuse.school_id == school_id, AttendanceExcuse.status == "pending")
        .order_by(AttendanceExcuse.created_at.asc())
        .limit(500)
    ).scalars().all()
    return [
        {
            "id": str(r.id),
            "student_id": str(r.student_id),
            "guardian_id": str(r.guardian_id),
            "attendance_date": r.attendance_date.isoformat(),
            "reason": r.reason,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@router.post("/excuses/{excuse_id}/approve", dependencies=[Depends(require_permission("attendance:write"))])
def approve_excuse(
    excuse_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    row = db.get(AttendanceExcuse, excuse_id)
    if not row or row.school_id != school_id:
        raise not_found("Excuse not found")
    if row.status != "pending":
        return {"status": "ok"}
    row.status = "approved"
    row.decided_by_user_id = user.id
    row.decided_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


@router.post("/excuses/{excuse_id}/reject", dependencies=[Depends(require_permission("attendance:write"))])
def reject_excuse(
    excuse_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    row = db.get(AttendanceExcuse, excuse_id)
    if not row or row.school_id != school_id:
        raise not_found("Excuse not found")
    if row.status != "pending":
        return {"status": "ok"}
    row.status = "rejected"
    row.decided_by_user_id = user.id
    row.decided_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}
