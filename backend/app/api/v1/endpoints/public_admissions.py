from __future__ import annotations

import os
import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.problems import bad_request, not_found
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.document import Document
from app.models.enrollment import Enrollment
from app.models.guardian import Guardian
from app.models.school_class import SchoolClass
from app.models.section import Section
from app.models.setting import Setting
from app.models.student import Student
from app.models.student_guardian import StudentGuardian
from app.schemas.admissions import (
    PublicAcademicYearOut,
    PublicAdmissionConfigOut,
    PublicAdmissionResult,
    PublicAdmissionSubmit,
    PublicClassOut,
    PublicSchoolOut,
    PublicSectionOut,
)
from app.services.admission_form import resolve_admission_form_token

router = APIRouter()

PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
DOCUMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_PHOTO_BYTES = 2 * 1024 * 1024
MAX_DOCUMENT_BYTES = 5 * 1024 * 1024


def _resolve_school(db: Session, token: str):
    try:
        return resolve_admission_form_token(db, token)
    except ValueError as exc:
        raise not_found("Admission form is not available") from exc


def _read_upload(
    upload: Optional[UploadFile], *, allowed: set[str], max_bytes: int, label: str
) -> Optional[dict]:
    if not upload or not upload.filename:
        return None

    filename = os.path.basename(upload.filename).replace("\x00", "").strip() or "file"
    extension = os.path.splitext(filename)[1].lower()
    if extension not in allowed:
        raise bad_request(f"{label} has an unsupported file type")

    content = upload.file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise bad_request(f"{label} is too large")
    if not content:
        raise bad_request(f"{label} is empty")

    return {
        "filename": filename[:255],
        "extension": extension,
        "content_type": upload.content_type,
        "content": content,
    }


def _find_or_create_guardian(
    db: Session, school_id: uuid.UUID, data, now: datetime
) -> Guardian:
    existing = None
    if data.email:
        existing = db.scalar(
            select(Guardian).where(
                Guardian.school_id == school_id, Guardian.email == str(data.email)
            ).limit(1)
        )
    if not existing and data.phone:
        existing = db.scalar(
            select(Guardian).where(
                Guardian.school_id == school_id, Guardian.phone == data.phone
            ).limit(1)
        )
    if existing:
        return existing

    guardian = Guardian(
        school_id=school_id,
        full_name=data.full_name,
        phone=data.phone,
        email=str(data.email) if data.email else None,
        occupation=data.occupation,
        id_number=data.id_number,
        created_at=now,
    )
    db.add(guardian)
    db.flush()
    return guardian


def _add_document(
    db: Session,
    *,
    school_id: uuid.UUID,
    student_id: uuid.UUID,
    document_type: str,
    upload: Optional[dict],
    now: datetime,
) -> None:
    if not upload:
        return
    db.add(
        Document(
            school_id=school_id,
            uploaded_by_user_id=None,
            entity_type=f"student:{document_type}",
            entity_id=str(student_id),
            filename=upload["filename"],
            content_type=upload["content_type"],
            content=upload["content"],
            created_at=now,
        )
    )


@router.get("/{token}", response_model=PublicAdmissionConfigOut)
def get_public_admission_config(
    token: str,
    db: Session = Depends(get_db),
) -> PublicAdmissionConfigOut:
    school, _ = _resolve_school(db, token)

    rows = db.execute(
        select(SchoolClass)
        .where(SchoolClass.school_id == school.id, SchoolClass.is_active.is_(True))
        .order_by(SchoolClass.name.asc())
    ).scalars().all()
    class_ids = [row.id for row in rows]

    sections_by_class: dict[uuid.UUID, list[PublicSectionOut]] = {class_id: [] for class_id in class_ids}
    if class_ids:
        sections = db.execute(
            select(Section)
            .where(Section.class_id.in_(class_ids), Section.is_active.is_(True))
            .order_by(Section.name.asc())
        ).scalars().all()
        for section in sections:
            sections_by_class.setdefault(section.class_id, []).append(
                PublicSectionOut(id=section.id, name=section.name)
            )

    classes = [
        PublicClassOut(
            id=row.id,
            name=row.name,
            numeric_value=row.numeric_value,
            sections=sections_by_class.get(row.id, []),
        )
        for row in rows
    ]

    year = db.scalar(
        select(AcademicYear).where(
            AcademicYear.school_id == school.id, AcademicYear.is_current.is_(True)
        ).limit(1)
    )
    logo = db.scalar(
        select(Setting).where(
            Setting.school_id == school.id, Setting.key == "school.profile.logo_url"
        ).limit(1)
    )

    return PublicAdmissionConfigOut(
        school=PublicSchoolOut(
            id=school.id,
            name=school.name,
            code=school.code,
            logo_url=logo.value if logo and logo.value else None,
        ),
        academic_year=(
            PublicAcademicYearOut(
                id=year.id,
                name=year.name,
                start_date=year.start_date,
                end_date=year.end_date,
            )
            if year
            else None
        ),
        classes=classes,
        admission_open=bool(year and any(item.sections for item in classes)),
    )


@router.post("/{token}/apply", response_model=PublicAdmissionResult, status_code=201)
def submit_public_admission(
    token: str,
    payload: str = Form(...),
    student_photo: Optional[UploadFile] = File(default=None),
    birth_certificate: Optional[UploadFile] = File(default=None),
    transfer_certificate: Optional[UploadFile] = File(default=None),
    db: Session = Depends(get_db),
) -> PublicAdmissionResult:
    school, _ = _resolve_school(db, token)

    try:
        data = PublicAdmissionSubmit.model_validate_json(payload)
    except ValidationError as exc:
        errors = exc.errors()
        detail = errors[0].get("msg") if errors else "Invalid application data"
        raise bad_request(str(detail)) from exc

    if data.website:
        raise bad_request("Invalid submission")

    school_class = db.get(SchoolClass, data.class_id)
    if (
        not school_class
        or school_class.school_id != school.id
        or not school_class.is_active
    ):
        raise bad_request("Selected class is not available")

    section = db.get(Section, data.section_id)
    if (
        not section
        or section.class_id != school_class.id
        or not section.is_active
    ):
        raise bad_request("Selected section is not available")

    year = db.scalar(
        select(AcademicYear).where(
            AcademicYear.school_id == school.id, AcademicYear.is_current.is_(True)
        ).limit(1)
    )
    if not year:
        raise bad_request("Admissions are not open")

    photo = _read_upload(
        student_photo,
        allowed=PHOTO_EXTENSIONS,
        max_bytes=MAX_PHOTO_BYTES,
        label="Student photo",
    )
    birth_doc = _read_upload(
        birth_certificate,
        allowed=DOCUMENT_EXTENSIONS,
        max_bytes=MAX_DOCUMENT_BYTES,
        label="Birth certificate",
    )
    transfer_doc = _read_upload(
        transfer_certificate,
        allowed=DOCUMENT_EXTENSIONS,
        max_bytes=MAX_DOCUMENT_BYTES,
        label="Transfer certificate",
    )

    now = datetime.now(timezone.utc)
    saved_paths: list[str] = []
    try:
        from app.api.v1.endpoints.students import _generate_admission_no

        student = Student(
            tenant_id=school.tenant_id,
            school_id=school.id,
            first_name=data.first_name,
            last_name=data.last_name,
            gender=data.gender,
            date_of_birth=data.date_of_birth,
            nationality=data.nationality,
            religion=data.religion,
            blood_group=data.blood_group,
            admission_date=date.today(),
            admission_status="pending",
            medium=data.medium,
            shift=data.shift,
            previous_school_name=data.previous_school_name,
            previous_class=data.previous_class,
            present_address=data.present_address,
            city=data.city,
            postal_code=data.postal_code,
            emergency_contact_name=data.emergency_contact_name,
            emergency_contact_phone=data.emergency_contact_phone,
            portal_access_student=False,
            portal_access_parent=False,
            status="inactive",
            created_at=now,
        )
        db.add(student)
        db.flush()
        student.admission_no = _generate_admission_no(db, school.id)

        if photo:
            os.makedirs("static", exist_ok=True)
            filename = f"student_{student.id}_{uuid.uuid4().hex[:8]}{photo['extension']}"
            static_path = os.path.join("static", filename)
            with open(static_path, "wb") as handle:
                handle.write(photo["content"])
            saved_paths.append(static_path)
            student.photo_url = f"/static/{filename}"

        father = _find_or_create_guardian(db, school.id, data.father, now)
        db.add(
            StudentGuardian(
                student_id=student.id,
                guardian_id=father.id,
                relation="father",
                is_primary=True,
            )
        )
        if data.mother:
            mother = _find_or_create_guardian(db, school.id, data.mother, now)
            if mother.id != father.id:
                db.add(
                    StudentGuardian(
                        student_id=student.id,
                        guardian_id=mother.id,
                        relation="mother",
                        is_primary=False,
                    )
                )

        db.add(
            Enrollment(
                student_id=student.id,
                academic_year_id=year.id,
                class_id=school_class.id,
                section_id=section.id,
                roll_number=None,
                status="active",
                created_at=now,
            )
        )
        _add_document(
            db,
            school_id=school.id,
            student_id=student.id,
            document_type="birth_certificate",
            upload=birth_doc,
            now=now,
        )
        _add_document(
            db,
            school_id=school.id,
            student_id=student.id,
            document_type="transfer_certificate",
            upload=transfer_doc,
            now=now,
        )

        db.commit()
        reference = student.admission_no or str(student.id)
    except Exception:
        db.rollback()
        for path in saved_paths:
            try:
                os.remove(path)
            except OSError:
                pass
        raise

    return PublicAdmissionResult(
        reference=reference,
        message="Application submitted successfully. The school will contact you after review.",
    )
