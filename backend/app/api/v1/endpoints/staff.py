import uuid
import io
import html
from datetime import date, datetime, time, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, not_implemented, problem
from app.db.session import get_db
from app.models.document import Document
from app.models.school import School
from app.models.staff import Staff
from app.models.teacher_assignment import StaffAttendance, TeacherAssignment
from app.models.staff import StaffPerformanceRecord, StaffQualification
from app.models.user import User
from app.schemas.attendance import StaffAttendanceOut
from app.schemas.documents import DocumentOut
from app.schemas.teacher_assignments import TeacherAssignmentOut
from app.schemas.staff import (
    StaffCreate,
    StaffOut,
    StaffPerformanceRecordCreate,
    StaffPerformanceRecordOut,
    StaffQualificationCreate,
    StaffQualificationOut,
    StaffUpdate,
)
from app.api.deps import get_current_user

import segno

router = APIRouter(dependencies=[Depends(require_permission("staff:read"))])


def _out(s: Staff) -> StaffOut:
    return StaffOut(
        id=s.id,
        school_id=s.school_id,
        full_name=s.full_name,
        employee_id=s.employee_id,
        designation=s.designation,
        department=s.department,
        email=s.email,
        phone=s.phone,
        emergency_contact_name=s.emergency_contact_name,
        emergency_contact_phone=s.emergency_contact_phone,
        emergency_contact_relation=s.emergency_contact_relation,
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
        employee_id=payload.employee_id,
        designation=payload.designation,
        department=payload.department,
        email=str(payload.email) if payload.email else None,
        phone=payload.phone,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        emergency_contact_relation=payload.emergency_contact_relation,
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
    return [
        StaffAttendanceOut(
            id=r.id,
            attendance_date=r.attendance_date.date(),
            staff_id=r.staff_id,
            status=r.status,
            check_in_at=r.check_in_at,
            check_out_at=r.check_out_at,
            method=r.method,
            device_id=r.device_id,
        )
        for r in rows
    ]


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


def _doc_out(d: Document) -> DocumentOut:
    return DocumentOut(
        id=d.id,
        school_id=d.school_id,
        uploaded_by_user_id=d.uploaded_by_user_id,
        entity_type=d.entity_type,
        entity_id=d.entity_id,
        filename=d.filename,
    )


@router.get("/{staff_id}/qualifications", response_model=list[StaffQualificationOut])
def list_staff_qualifications(
    staff_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[StaffQualificationOut]:
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    rows = (
        db.execute(
            select(StaffQualification)
            .where(StaffQualification.school_id == school_id, StaffQualification.staff_id == staff_id)
            .order_by(StaffQualification.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [
        StaffQualificationOut(
            id=r.id,
            school_id=r.school_id,
            staff_id=r.staff_id,
            title=r.title,
            institution=r.institution,
            issued_on=r.issued_on,
            expires_on=r.expires_on,
            credential_id=r.credential_id,
        )
        for r in rows
    ]


@router.post(
    "/{staff_id}/qualifications",
    response_model=StaffQualificationOut,
    dependencies=[Depends(require_permission("staff:write"))],
)
def create_staff_qualification(
    staff_id: uuid.UUID,
    payload: StaffQualificationCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StaffQualificationOut:
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    now = datetime.now(timezone.utc)
    q = StaffQualification(
        school_id=school_id,
        staff_id=staff_id,
        title=payload.title,
        institution=payload.institution,
        issued_on=payload.issued_on,
        expires_on=payload.expires_on,
        credential_id=payload.credential_id,
        created_at=now,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return StaffQualificationOut(
        id=q.id,
        school_id=q.school_id,
        staff_id=q.staff_id,
        title=q.title,
        institution=q.institution,
        issued_on=q.issued_on,
        expires_on=q.expires_on,
        credential_id=q.credential_id,
    )


@router.delete(
    "/{staff_id}/qualifications/{qualification_id}",
    dependencies=[Depends(require_permission("staff:write"))],
)
def delete_staff_qualification(
    staff_id: uuid.UUID,
    qualification_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    q = db.get(StaffQualification, qualification_id)
    if not q or q.school_id != school_id or q.staff_id != staff_id:
        raise not_found("Qualification not found")
    db.delete(q)
    db.commit()
    return {"status": "ok"}


@router.get("/{staff_id}/performance", response_model=list[StaffPerformanceRecordOut])
def list_staff_performance(
    staff_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[StaffPerformanceRecordOut]:
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    rows = (
        db.execute(
            select(StaffPerformanceRecord)
            .where(StaffPerformanceRecord.school_id == school_id, StaffPerformanceRecord.staff_id == staff_id)
            .order_by(StaffPerformanceRecord.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [
        StaffPerformanceRecordOut(
            id=r.id,
            school_id=r.school_id,
            staff_id=r.staff_id,
            period_start=r.period_start,
            period_end=r.period_end,
            rating=r.rating,
            summary=r.summary,
            created_by_user_id=r.created_by_user_id,
        )
        for r in rows
    ]


@router.post(
    "/{staff_id}/performance",
    response_model=StaffPerformanceRecordOut,
    dependencies=[Depends(require_permission("staff:write"))],
)
def create_staff_performance_record(
    staff_id: uuid.UUID,
    payload: StaffPerformanceRecordCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> StaffPerformanceRecordOut:
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    if payload.period_start and payload.period_end and payload.period_end < payload.period_start:
        raise problem(status_code=400, title="Bad Request", detail="period_end must be >= period_start")
    now = datetime.now(timezone.utc)
    r = StaffPerformanceRecord(
        school_id=school_id,
        staff_id=staff_id,
        period_start=payload.period_start,
        period_end=payload.period_end,
        rating=payload.rating,
        summary=payload.summary,
        created_by_user_id=user.id,
        created_at=now,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return StaffPerformanceRecordOut(
        id=r.id,
        school_id=r.school_id,
        staff_id=r.staff_id,
        period_start=r.period_start,
        period_end=r.period_end,
        rating=r.rating,
        summary=r.summary,
        created_by_user_id=r.created_by_user_id,
    )


@router.delete(
    "/{staff_id}/performance/{record_id}",
    dependencies=[Depends(require_permission("staff:write"))],
)
def delete_staff_performance_record(
    staff_id: uuid.UUID,
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    r = db.get(StaffPerformanceRecord, record_id)
    if not r or r.school_id != school_id or r.staff_id != staff_id:
        raise not_found("Performance record not found")
    db.delete(r)
    db.commit()
    return {"status": "ok"}


@router.get(
    "/{staff_id}/documents",
    response_model=list[DocumentOut],
    dependencies=[Depends(require_permission("documents:read"))],
)
def list_staff_documents(
    staff_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[DocumentOut]:
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    rows = (
        db.execute(
            select(Document)
            .where(Document.school_id == school_id, Document.entity_type == "staff", Document.entity_id == str(staff_id))
            .order_by(Document.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [_doc_out(d) for d in rows]


@router.post(
    "/{staff_id}/documents/upload",
    response_model=DocumentOut,
    dependencies=[Depends(require_permission("documents:write"))],
)
def upload_staff_document(
    staff_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> DocumentOut:
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    if not file.filename:
        raise problem(status_code=400, title="Bad Request", detail="Missing filename")
    content = file.file.read()
    now = datetime.now(timezone.utc)
    d = Document(
        school_id=school_id,
        uploaded_by_user_id=user.id,
        entity_type="staff",
        entity_id=str(staff_id),
        filename=file.filename,
        content_type=file.content_type,
        content=content,
        created_at=now,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return _doc_out(d)


@router.delete(
    "/{staff_id}/documents/{document_id}",
    dependencies=[Depends(require_permission("documents:write"))],
)
def delete_staff_document(
    staff_id: uuid.UUID,
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    d = db.get(Document, document_id)
    if not d or d.school_id != school_id or d.entity_type != "staff" or d.entity_id != str(staff_id):
        raise not_found("Document not found")
    db.delete(d)
    db.commit()
    return {"status": "ok"}


@router.get("/{staff_id}/qr", response_class=StreamingResponse)
def get_staff_qr(
    staff_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StreamingResponse:
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    school = db.get(School, school_id)
    school_code = (school.code if school else "") or ""
    payload = "|".join([p for p in ["KUSKUL", "STAFF", school_code, str(staff.id), staff.employee_id or ""] if p != ""])
    qr = segno.make(payload, error="m")
    buf = io.BytesIO()
    qr.save(buf, kind="svg", scale=6, border=1)
    svg = buf.getvalue().decode("utf-8")
    title = html.escape(f"{staff.full_name} ({staff.employee_id or str(staff.id)})")
    content = svg.replace("<svg", f'<svg aria-label="{title}"', 1).encode("utf-8")
    headers = {"Content-Disposition": f'inline; filename="staff_qr_{staff.id}.svg"'}
    return StreamingResponse(iter([content]), media_type="image/svg+xml", headers=headers)
