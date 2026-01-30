import uuid
import csv
import io
import html
import json
import segno
from datetime import date, datetime, time, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select, delete
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission, get_current_tenant_id
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.document import Document
from app.models.academic_year import AcademicYear
from app.models.enrollment import Enrollment
from app.models.guardian import Guardian
from app.models.school import School
from app.models.school_class import SchoolClass
from app.models.section import Section
from app.models.setting import Setting
from app.models.student import Student
from app.models.student_guardian import StudentGuardian
from app.models.teacher_assignment import StudentAttendance
from app.models.timetable_entry import TimetableEntry
from app.models.time_slot import TimeSlot
from app.models.result import Result
from app.models.exam import Exam
from app.models.grade import Grade
from app.models.discipline_record import DisciplineRecord
from app.models.user import User
from app.models.role import Role
from app.models.membership import Membership
from app.core.security import hash_password
from app.core.seed import ensure_default_roles
from app.schemas.batch import BatchPromoteStudentsRequest
from app.schemas.documents import DocumentOut
from app.schemas.guardians import LinkGuardianRequest, GuardianOut, StudentGuardianResponse
from app.schemas.attendance import StudentAttendanceOut
from app.schemas.students import StudentCreate, StudentOut, StudentUpdate
from app.schemas.students_batch import StudentsBatchRequest

router = APIRouter(dependencies=[Depends(require_permission("students:read"))])


def _out(s: Student) -> StudentOut:
    return StudentOut.model_validate(s)


def _get_student_settings(db: Session, school_id: uuid.UUID) -> dict:
    """Load and parse student settings from database"""
    setting = db.scalar(
        select(Setting).where(
            Setting.school_id == school_id,
            Setting.key == "students.settings"
        )
    )
    if not setting or not setting.value or not setting.value.strip():
        return {}  # Return empty dict to use defaults
    try:
        return json.loads(setting.value)
    except (json.JSONDecodeError, ValueError):
        return {}


def _generate_admission_no(db: Session, school_id: uuid.UUID) -> Optional[str]:
    """Generate admission number based on settings"""
    settings = _get_student_settings(db, school_id)
    
    # Check if auto-generation is enabled
    if not settings.get("auto_generate_admission_no", True):
        return None
    
    # Get prefix and start number from settings
    prefix = settings.get("admission_no_prefix", "STU").strip()
    start_from = int(settings.get("admission_no_start_from", 1001))
    
    # Find the highest existing number with this prefix
    max_admission = db.scalar(
        select(func.max(Student.admission_no))
        .where(
            Student.school_id == school_id,
            Student.admission_no.like(f"{prefix}%")
        )
    )
    
    if max_admission and max_admission.startswith(prefix):
        try:
            # Extract number part after prefix
            number_part = max_admission[len(prefix):]
            last_num = int(number_part)
            next_num = last_num + 1
        except (ValueError, IndexError):
            next_num = start_from
    else:
        next_num = start_from
    
    return f"{prefix}{next_num}"

@router.get("", response_model=dict)
def list_students(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    tenant_id: Optional[uuid.UUID] = Depends(get_current_tenant_id),
    page: int = 1,
    limit: int = 20,
    class_id: Optional[uuid.UUID] = None,
    section_id: Optional[uuid.UUID] = None,
    academic_year_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    gender: Optional[str] = None,
) -> dict:
    offset = (page - 1) * limit if page > 1 else 0

    base = select(Student).where(Student.school_id == school_id)
    if tenant_id:
        base = base.where(Student.tenant_id == tenant_id)
    if search:
        base = base.where(
            (Student.first_name.ilike(f"%{search}%"))
            | (Student.last_name.ilike(f"%{search}%"))
            | (Student.admission_no.ilike(f"%{search}%"))
        )
    if status:
        base = base.where(Student.status == status)
    if gender:
        base = base.where(Student.gender == gender)
    if class_id or section_id:
        base = base.join(Enrollment, Enrollment.student_id == Student.id)
        if academic_year_id is None:
            current_year_id = db.scalar(
                select(AcademicYear.id).where(AcademicYear.school_id == school_id, AcademicYear.is_current.is_(True)).limit(1)
            )
            academic_year_id = current_year_id
        if academic_year_id is not None:
            base = base.where(Enrollment.academic_year_id == academic_year_id)
        base = base.where(Enrollment.status == "active")
        if class_id:
            base = base.where(Enrollment.class_id == class_id)
        if section_id:
            base = base.where(Enrollment.section_id == section_id)

        base = base.distinct()

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(Student.first_name.asc()).offset(offset).limit(limit)).scalars().all()
    return {"items": [_out(s).model_dump() for s in rows], "total": int(total), "page": page, "limit": limit}


@router.get("/{student_id}", response_model=StudentOut)
def get_student(student_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> StudentOut:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    return _out(s)


@router.post("/batch", response_model=list[StudentOut])
def get_students_batch(
    payload: StudentsBatchRequest,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[StudentOut]:
    ids = list(dict.fromkeys(payload.student_ids))
    if not ids:
        return []
    rows = db.execute(select(Student).where(Student.school_id == school_id, Student.id.in_(ids))).scalars().all()
    by_id = {s.id: s for s in rows}
    ordered = [by_id.get(i) for i in ids]
    return [_out(s) for s in ordered if s is not None]


@router.post("", response_model=StudentOut, dependencies=[Depends(require_permission("students:write"))])
def create_student(payload: StudentCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> StudentOut:
    now = datetime.now(timezone.utc)
    
    # Load student settings
    settings = _get_student_settings(db, school_id)
    
    # Validate vaccination records if required
    if settings.get("require_vaccination_records", False):
        if not payload.vaccination_status or not payload.vaccination_status.strip():
            raise problem(
                status_code=400,
                title="Validation Error",
                detail="Vaccination status is required by school policy"
            )
    
    # Handle admission number
    admission_no = payload.admission_no.strip() if payload.admission_no else None
    
    # Determine admission status based on settings
    admission_status = payload.admission_status
    if settings.get("require_admission_approval", True):
        # Override to pending if approval is required
        admission_status = "pending"
    
    # Determine default status
    default_status = settings.get("default_student_status", "active")
    status = payload.status or default_status
    
    # Determine default fee category
    default_fee = settings.get("default_fee_category", "general")
    fee_category = payload.fee_category or default_fee
    
    # Portal access - enforce settings
    portal_access_student = payload.portal_access_student
    portal_access_parent = payload.portal_access_parent
    
    if not settings.get("enable_student_portal", True):
        portal_access_student = False
        
    if not settings.get("enable_parent_portal", True):
        portal_access_parent = False
    
    s = Student(
        school_id=school_id,
        user_id=payload.user_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        admission_no=admission_no,
        gender=payload.gender,
        date_of_birth=payload.date_of_birth,
        full_name_bc=payload.full_name_bc,
        place_of_birth=payload.place_of_birth,
        nationality=payload.nationality,
        religion=payload.religion,
        blood_group=payload.blood_group,
        admission_date=payload.admission_date,
        admission_status=admission_status,
        medium=payload.medium,
        shift=payload.shift,
        previous_school_name=payload.previous_school_name,
        previous_class=payload.previous_class,
        transfer_certificate_no=payload.transfer_certificate_no,
        present_address=payload.present_address,
        permanent_address=payload.permanent_address,
        city=payload.city,
        thana=payload.thana,
        postal_code=payload.postal_code,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        known_allergies=payload.known_allergies,
        chronic_illness=payload.chronic_illness,
        physical_disabilities=payload.physical_disabilities,
        special_needs=payload.special_needs,
        doctor_name=payload.doctor_name,
        doctor_phone=payload.doctor_phone,
        vaccination_status=payload.vaccination_status,
        birth_certificate_no=payload.birth_certificate_no,
        national_id_no=payload.national_id_no,
        passport_no=payload.passport_no,
        fee_category=fee_category,
        scholarship_type=payload.scholarship_type,
        portal_username=payload.portal_username,
        portal_access_student=portal_access_student,
        portal_access_parent=portal_access_parent,
        remarks=payload.remarks,
        rfid_nfc_no=payload.rfid_nfc_no,
        hostel_status=payload.hostel_status,
        library_card_no=payload.library_card_no,
        status=status,
        created_at=now,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    
    # Auto-generate admission number using settings
    if not s.admission_no:
        s.admission_no = _generate_admission_no(db, school_id)
        if s.admission_no:
            db.commit()
            db.refresh(s)

    # Create/Link User if portal access is enabled
    if s.portal_access_student and not s.user_id:
        ensure_default_roles(db)
        student_role = db.scalar(select(Role).where(Role.name == "student"))
        
        # Determine username/email
        base_username = s.portal_username or s.admission_no or f"stu{s.id.hex[:6]}"
        # User requires unique email. We'll forge one.
        email = f"{base_username}@student.kuskul.com"
        
        existing_user = db.scalar(select(User).where(User.email == email))
        if existing_user:
            s.user_id = existing_user.id
        else:
            new_user = User(
                email=email,
                full_name=f"{s.first_name} {s.last_name or ''}".strip(),
                password_hash=hash_password("password123"),
                is_active=True,
                created_at=now,
                updated_at=now
            )
            db.add(new_user)
            db.flush()
            s.user_id = new_user.id
            
            if student_role:
                db.add(Membership(user_id=new_user.id, school_id=school_id, role_id=student_role.id, is_active=True, created_at=now))
        
        db.commit()
        db.refresh(s)
    
    return _out(s)


@router.put("/{student_id}", response_model=StudentOut, dependencies=[Depends(require_permission("students:write"))])
def update_student(
    student_id: uuid.UUID, payload: StudentUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> StudentOut:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    
    # Auto-create User if portal access is enabled and User missing
    if s.portal_access_student and not s.user_id:
        ensure_default_roles(db)
        student_role = db.scalar(select(Role).where(Role.name == "student"))
        
        # Determine username/email
        base_username = s.portal_username or s.admission_no or f"stu{s.id.hex[:6]}"
        email = f"{base_username}@student.kuskul.com"
        
        existing_user = db.scalar(select(User).where(User.email == email))
        now = datetime.now(timezone.utc)
        
        if existing_user:
            s.user_id = existing_user.id
        else:
            new_user = User(
                email=email,
                full_name=f"{s.first_name} {s.last_name or ''}".strip(),
                password_hash=hash_password("password123"),
                is_active=True,
                created_at=now,
                updated_at=now
            )
            db.add(new_user)
            db.flush()
            s.user_id = new_user.id
            
            if student_role:
                db.add(Membership(user_id=new_user.id, school_id=school_id, role_id=student_role.id, is_active=True, created_at=now))

    # Auto-create Users for Guardians if parent portal access is enabled
    if s.portal_access_parent:
        ensure_default_roles(db)
        guardian_role = db.scalar(select(Role).where(Role.name == "parent"))
        
        # Find all linked guardians
        from app.models.student_guardian import StudentGuardian
        from app.models.guardian import Guardian
        linked_guardians = db.execute(
            select(Guardian)
            .join(StudentGuardian, StudentGuardian.guardian_id == Guardian.id)
            .where(StudentGuardian.student_id == student_id)
        ).scalars().all()
        
        for g in linked_guardians:
            if not g.user_id:
                # Create User for Guardian
                email = g.email
                if not email:
                     if g.phone:
                         import re
                         clean_phone = re.sub(r'[^0-9]', '', g.phone)
                         email = f"{clean_phone}@guardian.kuskul.com"
                     else:
                         email = f"guardian{g.id.hex[:6]}@guardian.kuskul.com"
                         
                existing_g_user = db.scalar(select(User).where(User.email == email))
                now = datetime.now(timezone.utc)
                
                if existing_g_user:
                    g.user_id = existing_g_user.id
                else:
                    new_g_user = User(
                        email=email,
                        full_name=g.full_name,
                        phone=g.phone,
                        photo_url=g.photo_url,
                        password_hash=hash_password("password123"),
                        is_active=True,
                        created_at=now,
                        updated_at=now
                    )
                    db.add(new_g_user)
                    db.flush()
                    g.user_id = new_g_user.id
                    
                    if guardian_role:
                        db.add(Membership(user_id=new_g_user.id, school_id=school_id, role_id=guardian_role.id, is_active=True, created_at=now))
        
        db.flush()

    # Sync to User if linked
    if s.user_id:

        u = db.get(User, s.user_id)
        if u:
            # Sync full name and photo
            full_name = " ".join(filter(None, [s.first_name, s.last_name]))
            u.full_name = full_name
            u.photo_url = s.photo_url
            # Phone: Student model doesn't have a personal phone field, only emergency contact.
            # So we don't sync phone here.
            
    db.commit()
    return _out(s)


@router.delete("/{student_id}", dependencies=[Depends(require_permission("students:write"))])
def delete_student(student_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    
    # Cascade delete related records
    db.execute(delete(Enrollment).where(Enrollment.student_id == student_id))
    from app.models.student_guardian import StudentGuardian
    db.execute(delete(StudentGuardian).where(StudentGuardian.student_id == student_id))
    from app.models.teacher_assignment import StudentAttendance
    db.execute(delete(StudentAttendance).where(StudentAttendance.student_id == student_id))
    from app.models.document import Document
    db.execute(delete(Document).where(Document.entity_id == str(student_id), Document.entity_type == "student"))

    from app.models.mark import Mark
    db.execute(delete(Mark).where(Mark.student_id == student_id))

    # Try to delete other common relations if they exist
    try:
        from app.models.result import Result
        db.execute(delete(Result).where(Result.student_id == student_id))
    except ImportError:
        pass

    try:
        from app.models.fee_payment import FeePayment
        from app.models.fee_due import FeeDue
        db.execute(delete(FeePayment).where(FeePayment.student_id == student_id))
        db.execute(delete(FeeDue).where(FeeDue.student_id == student_id))
    except ImportError:
        pass
    
    # Finally delete student
    db.delete(s)
    db.commit()
    return {"status": "ok"}


@router.post("/{student_id}/photo", dependencies=[Depends(require_permission("students:write"))])
def upload_student_photo(
    student_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    if not file.filename:
        raise problem(status_code=400, title="Bad Request", detail="Missing filename")
    
    # Save file to static directory
    import shutil
    import os
    
    EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in EXTENSIONS:
        raise problem(status_code=400, title="Bad Request", detail="Invalid image format")
        
    filename = f"student_{student_id}_{uuid.uuid4().hex[:8]}{ext}"
    static_path = os.path.join("static", filename)
    
    with open(static_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    s.photo_url = f"/static/{filename}"
    
    # Sync to User if linked
    if s.user_id:

        u = db.get(User, s.user_id)
        if u:
            u.photo_url = s.photo_url

    db.commit()
    return {"status": "ok"}


@router.get("/{student_id}/attendance")
def get_student_attendance(
    student_id: uuid.UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[StudentAttendanceOut]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")

    q = select(StudentAttendance).where(StudentAttendance.student_id == student_id)
    if start_date:
        q = q.where(StudentAttendance.attendance_date >= datetime.combine(start_date, time.min, tzinfo=timezone.utc))
    if end_date:
        q = q.where(StudentAttendance.attendance_date <= datetime.combine(end_date, time.min, tzinfo=timezone.utc))
    rows = db.execute(q.order_by(StudentAttendance.attendance_date.asc())).scalars().all()
    return [
        StudentAttendanceOut(
            id=r.id,
            attendance_date=r.attendance_date.date(),
            student_id=r.student_id,
            class_id=r.class_id,
            section_id=r.section_id,
            status=r.status,
        )
        for r in rows
    ]


@router.get("/{student_id}/guardians", response_model=list[StudentGuardianResponse])
def get_student_guardians(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[StudentGuardianResponse]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")

    from app.models.student_guardian import StudentGuardian
    from app.models.guardian import Guardian
    
    rows = db.execute(
        select(Guardian, StudentGuardian.relation, StudentGuardian.is_primary)
        .join(StudentGuardian, StudentGuardian.guardian_id == Guardian.id)
        .where(StudentGuardian.student_id == student_id)
        .order_by(Guardian.created_at.desc())
    ).all()
    
    res = []
    for g, relation, is_primary in rows:
        # Manually construct to avoid dict issues
        res.append(StudentGuardianResponse(
            id=g.id,
            school_id=g.school_id,
            full_name=g.full_name,
            phone=g.phone,
            email=g.email,
            occupation=g.occupation,
            id_number=g.id_number,
            emergency_contact_name=g.emergency_contact_name,
            emergency_contact_phone=g.emergency_contact_phone,
            address=g.address,
            photo_url=g.photo_url,
            relation=relation,
            is_primary=is_primary
        ))
    return res
@router.get("/{student_id}/attendance/summary")
def get_student_attendance_summary(
    student_id: uuid.UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    rows = get_student_attendance(
        student_id=student_id, start_date=start_date, end_date=end_date, db=db, school_id=school_id
    )
    counts: dict[str, int] = {}
    for r in rows:
        counts[r.status] = counts.get(r.status, 0) + 1
    counts["total"] = len(rows)
    return counts


@router.get("/{student_id}/marks")
def get_student_marks() -> None:
    raise not_implemented("Student marks is not implemented yet")


@router.get("/{student_id}/results")
def get_student_results(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[dict]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    rows = db.execute(
        select(Result, Exam, AcademicYear, Grade)
        .join(Exam, Exam.id == Result.exam_id)
        .join(AcademicYear, AcademicYear.id == Exam.academic_year_id)
        .outerjoin(Grade, Grade.id == Result.grade_id)
        .where(Result.student_id == student_id)
        .order_by(Exam.start_date.desc())
    ).all()
    return [
        {
            "id": str(r.Result.id),
            "exam_name": r.Exam.name,
            "academic_year": r.AcademicYear.name,
            "total_marks": r.Result.total_marks,
            "obtained_marks": r.Result.obtained_marks,
            "percentage": r.Result.percentage,
            "grade": r.Grade.name if r.Grade else None,
            "remarks": getattr(r.Result, "remarks", None),
            "date": r.Exam.start_date.isoformat() if r.Exam.start_date else None,
        }
        for r in rows
    ]


@router.get("/{student_id}/promotions")
def get_student_promotions(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[dict]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    
    rows = db.execute(
        select(Enrollment, AcademicYear, SchoolClass, Section)
        .join(AcademicYear, AcademicYear.id == Enrollment.academic_year_id)
        .join(SchoolClass, SchoolClass.id == Enrollment.class_id)
        .outerjoin(Section, Section.id == Enrollment.section_id)
        .where(Enrollment.student_id == student_id)
        .order_by(AcademicYear.start_date.desc())
    ).all()

    return [
        {
            "id": str(r.Enrollment.id),
            "academic_year": r.AcademicYear.name,
            "class_name": r.SchoolClass.name,
            "section_name": r.Section.name if r.Section else None,
            "status": r.Enrollment.status,
            "roll_number": r.Enrollment.roll_number,
        }
        for r in rows
    ]


@router.get("/{student_id}/discipline")
def get_student_discipline(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[dict]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")

    rows = db.execute(
        select(DisciplineRecord)
        .where(DisciplineRecord.student_id == student_id)
        .order_by(DisciplineRecord.created_at.desc())
    ).scalars().all()

    return [
        {
            "id": str(d.id),
            "category": d.category or "General",
            "note": d.note,
            "is_positive": d.is_positive,
            "date": d.created_at.date().isoformat(),
            # "reported_by": ... # could fetch user name if needed
        }
        for d in rows
    ]


@router.get("/{student_id}/report-card/{exam_id}")
def generate_report_card() -> None:
    raise not_implemented("Report card generation is not implemented yet")


@router.get("/{student_id}/fee-status")
def get_student_fee_status() -> None:
    raise not_implemented("Fee status is not implemented yet")


@router.get("/{student_id}/guardians")
def get_student_guardians(
    student_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> list[GuardianOut]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    guardians = db.execute(
        select(Guardian)
        .join(StudentGuardian, StudentGuardian.guardian_id == Guardian.id)
        .where(StudentGuardian.student_id == student_id, Guardian.school_id == school_id)
        .order_by(Guardian.full_name.asc())
    ).scalars().all()
    return [
        GuardianOut(
            id=g.id,
            school_id=g.school_id,
            full_name=g.full_name,
            phone=g.phone,
            email=g.email,
            occupation=g.occupation,
            id_number=g.id_number,
            emergency_contact_name=g.emergency_contact_name,
            emergency_contact_phone=g.emergency_contact_phone,
            address=g.address,
            photo_url=g.photo_url,
        )
        for g in guardians
    ]


@router.post("/{student_id}/guardians", dependencies=[Depends(require_permission("students:write"))])
def add_student_guardian(
    student_id: uuid.UUID,
    payload: LinkGuardianRequest,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    g = db.get(Guardian, payload.guardian_id)
    if not g or g.school_id != school_id:
        raise not_found("Guardian not found")
    link = db.get(StudentGuardian, {"student_id": student_id, "guardian_id": payload.guardian_id})
    if not link:
        db.add(StudentGuardian(student_id=student_id, guardian_id=payload.guardian_id, relation=payload.relation, is_primary=payload.is_primary))
    
    # Auto-create user for guardian if student has parent portal enabled
    if s.portal_access_parent and not g.user_id:
        ensure_default_roles(db)
        guardian_role = db.scalar(select(Role).where(Role.name == "parent"))
        
        email = g.email
        if not email:
             if g.phone:
                 import re
                 clean_phone = re.sub(r'[^0-9]', '', g.phone)
                 email = f"{clean_phone}@guardian.kuskul.com"
             else:
                 email = f"guardian{g.id.hex[:6]}@guardian.kuskul.com"
        
        now = datetime.now(timezone.utc)
        existing_user = db.scalar(select(User).where(User.email == email))
        if existing_user:
             g.user_id = existing_user.id
        else:
             new_user = User(
                email=email,
                full_name=g.full_name,
                phone=g.phone,
                photo_url=g.photo_url,
                password_hash=hash_password("password123"),
                is_active=True,
                created_at=now,
                updated_at=now
             )
             db.add(new_user)
             db.flush()
             g.user_id = new_user.id
             
             if guardian_role:
                 db.add(Membership(user_id=new_user.id, school_id=school_id, role_id=guardian_role.id, is_active=True, created_at=now))

    db.commit()
    return {"status": "ok"}


@router.get("/{student_id}/documents")
def get_student_documents(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[DocumentOut]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    rows = (
        db.execute(
            select(Document)
            .where(Document.school_id == school_id, Document.entity_type == "student", Document.entity_id == str(student_id))
            .order_by(Document.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [
        DocumentOut(
            id=d.id,
            school_id=d.school_id,
            uploaded_by_user_id=d.uploaded_by_user_id,
            entity_type=d.entity_type,
            entity_id=d.entity_id,
            filename=d.filename,
        )
        for d in rows
    ]


@router.post("/{student_id}/documents", dependencies=[Depends(require_permission("students:write"))])
def upload_student_document(
    student_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> DocumentOut:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    if not file.filename:
        raise problem(status_code=400, title="Bad Request", detail="Missing filename")
    content = file.file.read()
    now = datetime.now(timezone.utc)
    d = Document(
        school_id=school_id,
        uploaded_by_user_id=user.id,
        entity_type="student",
        entity_id=str(student_id),
        filename=file.filename,
        content_type=file.content_type,
        content=content,
        created_at=now,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return DocumentOut(
        id=d.id,
        school_id=d.school_id,
        uploaded_by_user_id=d.uploaded_by_user_id,
        entity_type=d.entity_type,
        entity_id=d.entity_id,
        filename=d.filename,
    )


@router.get("/{student_id}/timetable")
def get_student_timetable(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[dict]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    enr = db.scalar(select(Enrollment).where(Enrollment.student_id == student_id, Enrollment.status == "active"))
    if not enr or enr.section_id is None:
        return []
    rows = (
        db.execute(
            select(TimetableEntry, TimeSlot)
            .join(TimeSlot, TimeSlot.id == TimetableEntry.time_slot_id)
            .where(TimetableEntry.academic_year_id == enr.academic_year_id, TimetableEntry.section_id == enr.section_id)
            .order_by(TimetableEntry.day_of_week.asc(), TimeSlot.start_time.asc())
        )
        .all()
    )
    out = []
    for entry, slot in rows:
        out.append(
            {
                "id": str(entry.id),
                "day_of_week": entry.day_of_week,
                "time_slot_id": str(entry.time_slot_id),
                "start_time": str(slot.start_time),
                "end_time": str(slot.end_time),
                "subject_id": str(entry.subject_id) if entry.subject_id else None,
                "staff_id": str(entry.staff_id) if entry.staff_id else None,
                "room": entry.room,
            }
        )
    return out


@router.post("/bulk-import", dependencies=[Depends(require_permission("students:write"))])
def bulk_import_students(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    raw = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(raw))
    now = datetime.now(timezone.utc)
    created = 0
    for r in reader:
        first_name = (r.get("first_name") or "").strip()
        if not first_name:
            continue
        s = Student(
            school_id=school_id,
            first_name=first_name,
            last_name=(r.get("last_name") or "").strip() or None,
            admission_no=(r.get("admission_no") or "").strip() or None,
            gender=(r.get("gender") or "").strip() or None,
            date_of_birth=(date.fromisoformat(r["date_of_birth"]) if (r.get("date_of_birth") or "").strip() else None),
            status=(r.get("status") or "active").strip(),
            photo_url=(r.get("photo_url") or "").strip() or None,
            created_at=now,
        )
        db.add(s)
        created += 1
    db.commit()
    return {"created": created}


@router.get("/export")
def export_students(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StreamingResponse:
    rows = db.execute(select(Student).where(Student.school_id == school_id).order_by(Student.created_at.asc())).scalars().all()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["first_name", "last_name", "admission_no", "gender", "date_of_birth", "status", "photo_url"])
    for s in rows:
        w.writerow([s.first_name, s.last_name or "", s.admission_no or "", s.gender or "", s.date_of_birth or "", s.status, s.photo_url or ""])
    headers = {"Content-Disposition": 'attachment; filename="students.csv"'}
    return StreamingResponse(iter([buf.getvalue().encode("utf-8")]), media_type="text/csv; charset=utf-8", headers=headers)


@router.post("/bulk-promote", dependencies=[Depends(require_permission("students:write"))])
def bulk_promote_students(
    payload: BatchPromoteStudentsRequest,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    created = 0
    for eid in payload.enrollment_ids:
        e = db.get(Enrollment, eid)
        if not e:
            raise not_found("Enrollment not found")
        student = db.get(Student, e.student_id)
        if not student or student.school_id != school_id:
            raise not_found("Enrollment not found")
        existing = db.scalar(
            select(Enrollment).where(Enrollment.student_id == e.student_id, Enrollment.academic_year_id == payload.new_academic_year_id)
        )
        if existing:
            raise problem(status_code=409, title="Conflict", detail="Student already enrolled in target academic year")
        e.status = "promoted"
        db.add(
            Enrollment(
                student_id=e.student_id,
                academic_year_id=payload.new_academic_year_id,
                class_id=payload.new_class_id,
                section_id=payload.new_section_id,
                roll_number=None,
                status="active",
                created_at=now,
            )
        )
        created += 1
    db.commit()
    return {"created": created}


@router.get("/{student_id}/id-card")
def generate_student_id_card(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StreamingResponse:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")

    school = db.get(School, school_id)
    school_name = school.name if school else "School"
    school_code = school.code if school else ""

    settings_rows = db.execute(
        select(Setting).where(
            Setting.school_id == school_id,
            Setting.key.in_(
                [
                    "school.profile.address",
                    "school.profile.phone",
                    "school.profile.website",
                    "school.profile.logo_url",
                ]
            ),
        )
    ).scalars().all()
    settings_map = {row.key: row.value for row in settings_rows}
    school_address = (settings_map.get("school.profile.address") or "").strip()
    school_phone = (settings_map.get("school.profile.phone") or "").strip()
    school_website = (settings_map.get("school.profile.website") or "").strip()
    school_logo_url = (settings_map.get("school.profile.logo_url") or "").strip()

    year = db.scalar(select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_current.is_(True)))
    enrollment = None
    if year:
        enrollment = db.scalar(
            select(Enrollment)
            .where(
                Enrollment.student_id == s.id,
                Enrollment.academic_year_id == year.id,
                Enrollment.status == "active",
            )
            .order_by(Enrollment.created_at.desc())
        )
    if not enrollment:
        enrollment = db.scalar(
            select(Enrollment)
            .where(Enrollment.student_id == s.id, Enrollment.status == "active")
            .order_by(Enrollment.created_at.desc())
        )

    class_name = ""
    section_name = ""
    roll_number = ""
    if enrollment:
        c = db.get(SchoolClass, enrollment.class_id)
        class_name = c.name if c else ""
        if enrollment.section_id:
            sec = db.get(Section, enrollment.section_id)
            section_name = sec.name if sec else ""
        roll_number = str(enrollment.roll_number) if enrollment.roll_number is not None else ""

    def esc(v: Optional[str]) -> str:
        return html.escape((v or "").strip())

    student_name = " ".join([part for part in [s.first_name, s.last_name or ""] if part]).strip()
    dob = s.date_of_birth.isoformat() if s.date_of_birth else ""
    issue_date = datetime.now(timezone.utc).date().isoformat()
    qr_payload = "|".join(
        [part for part in ["KUSKUL", school_code or "", str(s.id), s.admission_no or ""] if part.strip()]
    ).strip()
    qr_display = esc(qr_payload)
    qr_svg = ""
    try:
        qr = segno.make(qr_payload, error="m")
        buf = io.BytesIO()
        qr.save(buf, kind="svg", scale=4, border=1)
        qr_svg = buf.getvalue().decode("utf-8")
        if qr_svg.startswith("<?xml"):
            qr_svg = qr_svg.split("?>", 1)[1]
        qr_svg = qr_svg.strip()
    except Exception:
        qr_svg = ""

    html_doc = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ID Card - {esc(student_name)}</title>
    <style>
      :root {{
        --card-w: 85.60mm;
        --card-h: 53.98mm;
        --border: #d0d5dd;
        --text: #101828;
        --muted: #475467;
        --brand: #0b5fff;
        --bg: #ffffff;
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        padding: 16px;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
        color: var(--text);
        background: #f5f7fb;
      }}
      .sheet {{
        display: flex;
        flex-direction: column;
        gap: 14px;
        align-items: flex-start;
      }}
      .card {{
        width: var(--card-w);
        height: var(--card-h);
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 10px;
        overflow: hidden;
        position: relative;
        box-shadow: 0 8px 24px rgba(16, 24, 40, 0.12);
      }}
      .front .topbar {{
        height: 12mm;
        background: linear-gradient(90deg, rgba(11,95,255,1) 0%, rgba(25,160,255,1) 100%);
      }}
      .front .header {{
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 12mm;
        display: flex;
        align-items: center;
        padding: 4mm;
        gap: 3mm;
        color: #fff;
      }}
      .logo {{
        width: 9mm;
        height: 9mm;
        border-radius: 4mm;
        background: rgba(255,255,255,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex: 0 0 auto;
      }}
      .logo img {{
        width: 100%;
        height: 100%;
        object-fit: cover;
      }}
      .school {{
        min-width: 0;
        display: flex;
        flex-direction: column;
        line-height: 1.1;
      }}
      .school .name {{
        font-weight: 800;
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }}
      .school .sub {{
        font-size: 10px;
        opacity: 0.9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }}
      .front .content {{
        position: absolute;
        top: 12mm;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 3.5mm 4mm 3.5mm 4mm;
        display: grid;
        grid-template-columns: 18mm 1fr;
        gap: 3.5mm;
      }}
      .photo {{
        width: 18mm;
        height: 22mm;
        border: 1px solid var(--border);
        border-radius: 3mm;
        overflow: hidden;
        background: #eef2ff;
      }}
      .photo img {{
        width: 100%;
        height: 100%;
        object-fit: cover;
      }}
      .photo .ph {{
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--muted);
        font-size: 10px;
        padding: 2mm;
        text-align: center;
      }}
      .fields {{
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2mm 3mm;
        align-content: start;
      }}
      .field {{
        min-width: 0;
      }}
      .label {{
        font-size: 9px;
        color: var(--muted);
        letter-spacing: 0.02em;
      }}
      .value {{
        font-size: 10.5px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }}
      .value.mono {{
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-weight: 600;
      }}
      .nameLine {{
        grid-column: 1 / -1;
      }}
      .nameLine .value {{
        font-size: 12px;
        font-weight: 900;
      }}
      .badge {{
        position: absolute;
        bottom: 3mm;
        right: 3mm;
        font-size: 9px;
        padding: 1.4mm 2.5mm;
        border-radius: 999px;
        background: rgba(11,95,255,0.10);
        color: var(--brand);
        border: 1px solid rgba(11,95,255,0.25);
      }}
      .back {{
        padding: 4mm;
        display: grid;
        grid-template-columns: 1fr 20mm;
        gap: 4mm;
        height: 100%;
      }}
      .back .left {{
        display: flex;
        flex-direction: column;
        gap: 2mm;
        min-width: 0;
      }}
      .back .row {{
        display: flex;
        gap: 2mm;
        line-height: 1.15;
        min-width: 0;
      }}
      .back .row .k {{
        width: 18mm;
        flex: 0 0 auto;
        font-size: 9px;
        color: var(--muted);
      }}
      .back .row .v {{
        font-size: 9.5px;
        font-weight: 700;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }}
      .back .row .v.wrap {{
        white-space: normal;
      }}
      .qr {{
        border: 1px dashed var(--border);
        border-radius: 3mm;
        padding: 2mm;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 2mm;
      }}
      .qr .box {{
        width: 100%;
        aspect-ratio: 1 / 1;
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 2mm;
      }}
      .qr .box svg {{
        width: 100%;
        height: 100%;
      }}
      .qr .txt {{
        font-size: 8px;
        color: var(--muted);
        word-break: break-all;
      }}
      .sign {{
        margin-top: auto;
        display: flex;
        justify-content: space-between;
        gap: 4mm;
      }}
      .sig {{
        width: 34mm;
        border-top: 1px solid var(--border);
        padding-top: 1mm;
        font-size: 8.5px;
        color: var(--muted);
        text-align: center;
      }}
      @media print {{
        body {{ padding: 0; background: #fff; }}
        .card {{ box-shadow: none; }}
        .sheet {{ gap: 0; }}
        .front {{ break-after: page; }}
      }}
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="card front">
        <div class="topbar"></div>
        <div class="header">
          <div class="logo">
            {f'<img src="{esc(school_logo_url)}" alt="Logo" />' if school_logo_url else '<span style="font-weight:800;font-size:10px;">ID</span>'}
          </div>
          <div class="school">
            <div class="name">{esc(school_name)}</div>
            <div class="sub">Student Identity Card</div>
          </div>
        </div>
        <div class="content">
          <div class="photo">
            {f'<img src="{esc(s.photo_url)}" alt="Student photo" />' if s.photo_url else '<div class="ph">Photo</div>'}
          </div>
          <div class="fields">
            <div class="field nameLine">
              <div class="label">Student Name</div>
              <div class="value">{esc(student_name)}</div>
            </div>
            <div class="field">
              <div class="label">Admission No</div>
              <div class="value mono">{esc(s.admission_no or "")}</div>
            </div>
            <div class="field">
              <div class="label">Roll No</div>
              <div class="value mono">{esc(roll_number)}</div>
            </div>
            <div class="field">
              <div class="label">Class</div>
              <div class="value">{esc(class_name)}</div>
            </div>
            <div class="field">
              <div class="label">Section</div>
              <div class="value">{esc(section_name)}</div>
            </div>
            <div class="field">
              <div class="label">Date of Birth</div>
              <div class="value mono">{esc(dob)}</div>
            </div>
            <div class="field">
              <div class="label">Blood Group</div>
              <div class="value">{esc(s.blood_group or "")}</div>
            </div>
          </div>
        </div>
        <div class="badge">{esc((year.name if year else "") or "Active")}</div>
      </div>

      <div class="card">
        <div class="back">
          <div class="left">
            <div class="row">
              <div class="k">School</div>
              <div class="v">{esc(school_name)}</div>
            </div>
            <div class="row">
              <div class="k">Address</div>
              <div class="v wrap">{esc(school_address)}</div>
            </div>
            <div class="row">
              <div class="k">Phone</div>
              <div class="v">{esc(school_phone)}</div>
            </div>
            <div class="row">
              <div class="k">Website</div>
              <div class="v">{esc(school_website)}</div>
            </div>
            <div class="row">
              <div class="k">Emergency</div>
              <div class="v">{esc(s.emergency_contact_phone or "")}</div>
            </div>
            <div class="row">
              <div class="k">Issued</div>
              <div class="v mono">{esc(issue_date)}</div>
            </div>
            <div class="sign">
              <div class="sig">Student Signature</div>
              <div class="sig">Authorized Signature</div>
            </div>
          </div>
          <div class="qr">
            <div class="box">{qr_svg if qr_svg else '<div class="txt">QR</div>'}</div>
            <div class="txt">{qr_display}</div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
"""

    content = html_doc.encode("utf-8")
    headers = {"Content-Disposition": f'attachment; filename="id_card_{s.id}.html"'}
    return StreamingResponse(iter([content]), media_type="text/html; charset=utf-8", headers=headers)
