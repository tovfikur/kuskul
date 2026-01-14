import uuid
from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, not_implemented
from app.db.session import get_db
from app.models.staff import Staff
from app.models.teacher_assignment import StaffAttendance
from app.schemas.attendance import MarkStaffAttendanceRequest, StaffAttendanceOut

router = APIRouter(dependencies=[Depends(require_permission("attendance:read"))])


def _dt(d: date) -> datetime:
    return datetime.combine(d, time.min, tzinfo=timezone.utc)


def _out(r: StaffAttendance) -> StaffAttendanceOut:
    return StaffAttendanceOut(id=r.id, attendance_date=r.attendance_date.date(), staff_id=r.staff_id, status=r.status)


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


@router.post("/check-in", include_in_schema=False)
def staff_check_in() -> None:
    raise not_implemented("Staff check-in is not implemented yet")


@router.post("/check-out", include_in_schema=False)
def staff_check_out() -> None:
    raise not_implemented("Staff check-out is not implemented yet")


@router.put("/{attendance_id}", include_in_schema=False)
def update_staff_attendance() -> None:
    raise not_implemented("Update staff attendance is not implemented yet")


@router.get("/report", include_in_schema=False)
def get_staff_attendance_report() -> None:
    raise not_implemented("Staff attendance report is not implemented yet")


@router.get("/summary", include_in_schema=False)
def get_staff_attendance_summary() -> None:
    raise not_implemented("Staff attendance summary is not implemented yet")
