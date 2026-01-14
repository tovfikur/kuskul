import uuid
from datetime import date, datetime, time, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, not_implemented, problem
from app.db.session import get_db
from app.models.staff import Staff
from app.models.teacher_assignment import StaffAttendance, TeacherAssignment
from app.schemas.attendance import StaffAttendanceOut
from app.schemas.teacher_assignments import TeacherAssignmentOut
from app.schemas.staff import StaffCreate, StaffOut, StaffUpdate

router = APIRouter(dependencies=[Depends(require_permission("staff:read"))])


def _out(s: Staff) -> StaffOut:
    return StaffOut(
        id=s.id,
        school_id=s.school_id,
        full_name=s.full_name,
        designation=s.designation,
        department=s.department,
        email=s.email,
        phone=s.phone,
        date_of_joining=s.date_of_joining,
        status=s.status,
        photo_url=s.photo_url,
    )


@router.get("", response_model=dict)
def list_staff(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    page: int = 1,
    limit: int = 20,
    designation: Optional[str] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
) -> dict:
    offset = (page - 1) * limit if page > 1 else 0
    base = select(Staff).where(Staff.school_id == school_id)
    if designation:
        base = base.where(Staff.designation == designation)
    if department:
        base = base.where(Staff.department == department)
    if status:
        base = base.where(Staff.status == status)
    if search:
        base = base.where(
            Staff.full_name.ilike(f"%{search}%")
            | Staff.email.ilike(f"%{search}%")
            | Staff.phone.ilike(f"%{search}%")
        )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(Staff.full_name.asc()).offset(offset).limit(limit)).scalars().all()
    return {"items": [_out(r).model_dump() for r in rows], "total": int(total), "page": page, "limit": limit}


@router.get("/{staff_id}", response_model=StaffOut)
def get_staff(staff_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> StaffOut:
    s = db.get(Staff, staff_id)
    if not s or s.school_id != school_id:
        raise not_found("Staff not found")
    return _out(s)


@router.post("", response_model=StaffOut, dependencies=[Depends(require_permission("staff:write"))])
def create_staff(payload: StaffCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> StaffOut:
    now = datetime.now(timezone.utc)
    s = Staff(
        school_id=school_id,
        full_name=payload.full_name,
        designation=payload.designation,
        department=payload.department,
        email=str(payload.email) if payload.email else None,
        phone=payload.phone,
        date_of_joining=payload.date_of_joining,
        status=payload.status,
        created_at=now,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _out(s)


@router.put("/{staff_id}", response_model=StaffOut, dependencies=[Depends(require_permission("staff:write"))])
def update_staff(
    staff_id: uuid.UUID, payload: StaffUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> StaffOut:
    s = db.get(Staff, staff_id)
    if not s or s.school_id != school_id:
        raise not_found("Staff not found")
    data = payload.model_dump(exclude_unset=True)
    if "email" in data:
        data["email"] = str(data["email"]) if data["email"] else None
    for k, v in data.items():
        setattr(s, k, v)
    db.commit()
    return _out(s)


@router.delete("/{staff_id}", dependencies=[Depends(require_permission("staff:write"))])
def delete_staff(staff_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    s = db.get(Staff, staff_id)
    if not s or s.school_id != school_id:
        raise not_found("Staff not found")
    db.delete(s)
    db.commit()
    return {"status": "ok"}


@router.post("/{staff_id}/photo", dependencies=[Depends(require_permission("staff:write"))])
def upload_staff_photo(
    staff_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    s = db.get(Staff, staff_id)
    if not s or s.school_id != school_id:
        raise not_found("Staff not found")
    if not file.filename:
        raise problem(status_code=400, title="Bad Request", detail="Missing filename")
    s.photo_url = file.filename
    db.commit()
    return {"status": "ok"}


@router.get("/{staff_id}/attendance", response_model=list[StaffAttendanceOut])
def get_staff_attendance(
    staff_id: uuid.UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[StaffAttendanceOut]:
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    q = select(StaffAttendance).where(StaffAttendance.staff_id == staff_id)
    if start_date:
        q = q.where(StaffAttendance.attendance_date >= datetime.combine(start_date, time.min, tzinfo=timezone.utc))
    if end_date:
        q = q.where(StaffAttendance.attendance_date <= datetime.combine(end_date, time.min, tzinfo=timezone.utc))
    rows = db.execute(q.order_by(StaffAttendance.attendance_date.asc())).scalars().all()
    return [StaffAttendanceOut(id=r.id, attendance_date=r.attendance_date.date(), staff_id=r.staff_id, status=r.status) for r in rows]


@router.get("/{staff_id}/assignments", response_model=list[TeacherAssignmentOut])
def get_staff_assignments(
    staff_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[TeacherAssignmentOut]:
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    rows = db.execute(select(TeacherAssignment).where(TeacherAssignment.staff_id == staff_id).order_by(TeacherAssignment.created_at.desc())).scalars().all()
    return [
        TeacherAssignmentOut(
            id=a.id,
            academic_year_id=a.academic_year_id,
            staff_id=a.staff_id,
            section_id=a.section_id,
            subject_id=a.subject_id,
            is_active=a.is_active,
        )
        for a in rows
    ]


@router.get("/{staff_id}/timetable", include_in_schema=False)
def get_staff_timetable() -> None:
    raise not_implemented("Timetable is not implemented yet")


@router.get("/{staff_id}/classes", include_in_schema=False)
def get_staff_classes() -> None:
    raise not_implemented("Staff classes are not implemented yet")


@router.post("/bulk-import", include_in_schema=False)
def bulk_import_staff() -> None:
    raise not_implemented("Bulk import is not implemented yet")


@router.get("/export", include_in_schema=False)
def export_staff() -> None:
    raise not_implemented("Export is not implemented yet")
