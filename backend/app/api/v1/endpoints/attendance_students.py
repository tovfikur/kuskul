import uuid
from datetime import date, datetime, time, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission
from app.core.problems import not_found, not_implemented
from app.db.session import get_db
from app.models.attendance_excuse import AttendanceExcuse
from app.models.school_class import SchoolClass
from app.models.section import Section
from app.models.student import Student
from app.models.teacher_assignment import StudentAttendance
from app.models.user import User
from app.schemas.attendance import MarkStudentAttendanceRequest, StudentAttendanceOut

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
            existing.class_id = payload.class_id
            existing.section_id = payload.section_id
        else:
            db.add(
                StudentAttendance(
                    attendance_date=d,
                    student_id=item.student_id,
                    class_id=payload.class_id,
                    section_id=payload.section_id,
                    status=item.status,
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
