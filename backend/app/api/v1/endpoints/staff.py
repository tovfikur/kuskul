import uuid
import io
import html
from datetime import date, datetime, time, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select, delete
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
from app.models.role import Role
from app.models.membership import Membership
from app.core.security import hash_password
from app.core.seed import ensure_default_roles
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
    # Split full_name for frontend convenience
    first_name = s.full_name
    last_name = ""
    if s.full_name and " " in s.full_name:
        parts = s.full_name.split(" ", 1)
        first_name = parts[0]
        last_name = parts[1]
        
    return StaffOut(
        id=s.id,
        school_id=s.school_id,
        full_name=s.full_name,
        first_name=first_name,
        last_name=last_name,
        employee_id=s.employee_id,
        
        department_id=s.department_id,
        designation_id=s.designation_id,
        department=s.department,
        designation=s.designation,
        
        email=s.email,
        phone=s.phone,
        
        gender=s.gender,
        date_of_birth=s.date_of_birth,
        blood_group=s.blood_group,
        nationality=s.nationality,
        marital_status=s.marital_status,
        religion=s.religion,
        
        address=s.address,
        present_address=s.address, # Map to frontend expectation
        permanent_address=s.permanent_address,
        city=s.city,
        state=s.state,
        postal_code=s.postal_code,
        country=s.country,
        
        emergency_contact_name=s.emergency_contact_name,
        emergency_contact_phone=s.emergency_contact_phone,
        emergency_contact_relation=s.emergency_contact_relation,
        
        date_of_joining=s.date_of_joining,
        employment_type=s.employment_type,
        status=s.status,
        
        highest_qualification=s.highest_qualification,
        specialization=s.specialization,
        experience_years=s.experience_years,
        
        bank_name=s.bank_name,
        bank_account_number=s.bank_account_number,
        bank_ifsc=s.bank_ifsc,
        
        photo_url=s.photo_url,
        profile_photo_url=s.photo_url, # Map to frontend expectation
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
    
    # Handle full_name logic
    full_name = payload.full_name
    if not full_name and payload.first_name and payload.last_name:
        full_name = f"{payload.first_name} {payload.last_name}"
    elif not full_name:
        # Fallback if neither provided (though schemas make one required ideally)
        if payload.first_name:
            full_name = payload.first_name
        else:
            raise problem(status_code=400, title="Bad Request", detail="Name is required")

    # Map address
    address = payload.present_address if payload.present_address else None
    
    # Map photo
    photo_url = payload.profile_photo_url if payload.profile_photo_url else payload.photo_url

    s = Staff(
        school_id=school_id,
        full_name=full_name,
        employee_id=payload.employee_id,
        
        # Link IDs
        department_id=payload.department_id,
        designation_id=payload.designation_id,
        
        # Legacy strings (optional)
        designation=payload.designation,
        department=payload.department,
        
        email=str(payload.email) if payload.email else None,
        phone=payload.phone,
        
        # Personal Info
        gender=payload.gender,
        date_of_birth=payload.date_of_birth,
        blood_group=payload.blood_group,
        nationality=payload.nationality,
        marital_status=payload.marital_status,
        religion=payload.religion,
        
        # Address
        address=address,
        permanent_address=payload.permanent_address,
        city=payload.city,
        state=payload.state,
        postal_code=payload.postal_code,
        country=payload.country,
        
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        emergency_contact_relation=payload.emergency_contact_relation,
        
        date_of_joining=payload.date_of_joining,
        employment_type=payload.employment_type,
        status=payload.status,
        
        # Qualifications
        highest_qualification=payload.highest_qualification,
        specialization=payload.specialization,
        experience_years=payload.experience_years,
        
        # Bank Details
        bank_name=payload.bank_name,
        bank_account_number=payload.bank_account_number,
        bank_ifsc=payload.bank_ifsc,
        
        photo_url=photo_url,
        
        created_at=now,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    
    # Auto-create User for Staff
    if not s.user_id:
        email = s.email
        if not email:
             email = f"staff{s.id.hex[:6]}@kuskul.com"
        
        ensure_default_roles(db)
        # Determine role
        role_name = "staff"
        if s.designation and "teacher" in s.designation.lower():
             role_name = "teacher"
             
        role = db.scalar(select(Role).where(func.lower(Role.name) == role_name))
        
        existing_user = db.scalar(select(User).where(User.email == email))
        if existing_user:
             s.user_id = existing_user.id
             db.commit() # Save linkage
        else:
             new_user = User(
                email=email,
                full_name=s.full_name,
                phone=s.phone,
                photo_url=s.photo_url,
                password_hash=hash_password("password123"),
                is_active=True,
                created_at=now,
                updated_at=now
             )
             db.add(new_user)
             db.flush()
             s.user_id = new_user.id
             
             if role:
                 db.add(Membership(user_id=new_user.id, school_id=school_id, role_id=role.id, is_active=True, created_at=now))
            
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
    
    # Handle name updates
    if "first_name" in data or "last_name" in data:
        # If updating names, reconstruct full_name
        first = data.get("first_name") or (s.full_name.split(" ")[0] if " " in s.full_name else s.full_name)
        last = data.get("last_name") or (s.full_name.split(" ", 1)[1] if " " in s.full_name else "")
        s.full_name = f"{first} {last}".strip()
    elif "full_name" in data:
        s.full_name = data["full_name"]
        
    # Handle email
    if "email" in data:
        s.email = str(data["email"]) if data["email"] else None
        
    # Map fields
    if "present_address" in data:
        s.address = data["present_address"]
    
    if "profile_photo_url" in data:
        s.photo_url = data["profile_photo_url"]
        
    # Update other fields directly if they exist on model
    for k, v in data.items():
        if hasattr(s, k) and k not in ["first_name", "last_name", "present_address", "profile_photo_url", "full_name", "email"]:
            setattr(s, k, v)
            
    db.commit()
    return _out(s)


@router.delete("/{staff_id}", dependencies=[Depends(require_permission("staff:write"))])
def delete_staff(staff_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    s = db.get(Staff, staff_id)
    if not s or s.school_id != school_id:
        raise not_found("Staff not found")
    
    # Cascade Delete
    from app.models.teacher_assignment import TeacherAssignment, StaffAttendance
    db.execute(delete(StaffAttendance).where(StaffAttendance.staff_id == staff_id))
    db.execute(delete(TeacherAssignment).where(TeacherAssignment.staff_id == staff_id))

    try:
        from app.models.timetable_entry import TimetableEntry
        db.execute(delete(TimetableEntry).where(TimetableEntry.staff_id == staff_id))
    except ImportError:
        pass

    try:
        from app.models.staff_leave import StaffLeaveRequest, LeaveBalance
        db.execute(delete(StaffLeaveRequest).where(StaffLeaveRequest.staff_id == staff_id))
        db.execute(delete(LeaveBalance).where(LeaveBalance.staff_id == staff_id))
    except ImportError:
        pass

    try:
        from app.models.payroll import Payslip
        db.execute(delete(Payslip).where(Payslip.staff_id == staff_id))
    except ImportError:
        pass

    from app.models.document import Document
    db.execute(delete(Document).where(Document.entity_id == str(staff_id), Document.entity_type == "staff"))

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
