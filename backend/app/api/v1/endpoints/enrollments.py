import uuid
import re
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.enrollment import Enrollment
from app.models.school_class import SchoolClass
from app.models.section import Section
from app.models.student import Student
from app.schemas.enrollments import EnrollmentCreate, EnrollmentOut, EnrollmentUpdate

router = APIRouter(dependencies=[Depends(require_permission("enrollments:read"))])

ADMISSION_ROLL_PREFIX = "AMD"
STUDENT_ROLL_PREFIX = "STU"
ROLL_SERIAL_WIDTH = 3


def _class_code(school_class: SchoolClass) -> str:
    if school_class.numeric_value is not None:
        return str(school_class.numeric_value)
    name = re.sub(r"^\s*(class|grade)\s*", "", school_class.name or "", flags=re.IGNORECASE)
    digits = re.findall(r"\d+", name)
    if digits:
        return digits[0]
    code = re.sub(r"[^A-Za-z0-9]", "", name).upper()
    return code or "X"


def _section_code(section: Section) -> str:
    name = re.sub(r"^\s*section\s*", "", section.name or "", flags=re.IGNORECASE)
    code = re.sub(r"[^A-Za-z0-9]", "", name).upper()
    return (code or "X")[:4]


def _roll_prefix(
    school_class: SchoolClass,
    section: Section,
    academic_year: AcademicYear,
    prefix: str,
) -> str:
    return f"{prefix}{_class_code(school_class)}{_section_code(section)}{date.today().year}"


def _generate_roll_number(
    db: Session,
    *,
    school_id: uuid.UUID,
    academic_year_id: uuid.UUID,
    class_id: uuid.UUID,
    section_id: Optional[uuid.UUID],
    prefix: str = ADMISSION_ROLL_PREFIX,
) -> Optional[str]:
    if not section_id:
        return None

    year = db.get(AcademicYear, academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    school_class = db.get(SchoolClass, class_id)
    if not school_class or school_class.school_id != school_id:
        raise not_found("Class not found")
    section = db.get(Section, section_id)
    if not section or section.class_id != class_id:
        raise not_found("Section not found")

    roll_prefix = _roll_prefix(school_class, section, year, prefix)
    rows = db.execute(
        select(Enrollment.roll_number)
        .join(Student, Student.id == Enrollment.student_id)
        .where(
            Student.school_id == school_id,
            Enrollment.academic_year_id == academic_year_id,
            Enrollment.class_id == class_id,
            Enrollment.section_id == section_id,
            Enrollment.roll_number.like(f"{roll_prefix}%"),
        )
    ).scalars().all()

    max_serial = 0
    for value in rows:
        if not value:
            continue
        match = re.fullmatch(rf"{re.escape(roll_prefix)}(\d+)", value)
        if match:
            max_serial = max(max_serial, int(match.group(1)))

    return f"{roll_prefix}{max_serial + 1:0{ROLL_SERIAL_WIDTH}d}"


def _normalize_roll_number(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    normalized = value.strip().replace("-", "").replace(" ", "")
    return normalized or None


def _ensure_unique_roll_number(
    db: Session,
    *,
    school_id: uuid.UUID,
    academic_year_id: uuid.UUID,
    class_id: uuid.UUID,
    section_id: Optional[uuid.UUID],
    roll_number: str,
    exclude_enrollment_id: Optional[uuid.UUID] = None,
) -> None:
    q = (
        select(Enrollment.id)
        .join(Student, Student.id == Enrollment.student_id)
        .where(
            Student.school_id == school_id,
            Enrollment.academic_year_id == academic_year_id,
            Enrollment.class_id == class_id,
            Enrollment.roll_number == roll_number,
        )
    )
    if section_id is None:
        q = q.where(Enrollment.section_id.is_(None))
    else:
        q = q.where(Enrollment.section_id == section_id)
    if exclude_enrollment_id:
        q = q.where(Enrollment.id != exclude_enrollment_id)
    if db.scalar(q):
        raise problem(
            status_code=409,
            title="Conflict",
            detail="This roll number is already used in this class and section.",
        )


def _out(e: Enrollment) -> EnrollmentOut:
    return EnrollmentOut(
        id=e.id,
        student_id=e.student_id,
        academic_year_id=e.academic_year_id,
        class_id=e.class_id,
        section_id=e.section_id,
        roll_number=e.roll_number,
        status=e.status,
    )


@router.get("", response_model=list[EnrollmentOut])
def list_enrollments(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    academic_year_id: Optional[uuid.UUID] = None,
    class_id: Optional[uuid.UUID] = None,
    section_id: Optional[uuid.UUID] = None,
) -> list[EnrollmentOut]:
    q = (
        select(Enrollment)
        .join(Student, Student.id == Enrollment.student_id)
        .where(Student.school_id == school_id)
        .order_by(Enrollment.created_at.desc())
    )
    if academic_year_id:
        q = q.where(Enrollment.academic_year_id == academic_year_id)
    if class_id:
        q = q.where(Enrollment.class_id == class_id)
    if section_id:
        q = q.where(Enrollment.section_id == section_id)
    rows = db.execute(q).scalars().all()
    return [_out(e) for e in rows]


@router.get("/by-students", response_model=list[EnrollmentOut])
def list_enrollments_by_students(
    student_ids: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    academic_year_id: Optional[uuid.UUID] = None,
) -> list[EnrollmentOut]:
    ids: list[uuid.UUID] = []
    for part in student_ids.split(","):
        v = part.strip()
        if not v:
            continue
        ids.append(uuid.UUID(v))
    if not ids:
        return []

    year_id = academic_year_id
    if not year_id:
        year = db.scalar(
            select(AcademicYear).where(
                AcademicYear.school_id == school_id,
                AcademicYear.is_current.is_(True),
            )
        )
        if not year:
            return []
        year_id = year.id

    q = (
        select(Enrollment)
        .join(Student, Student.id == Enrollment.student_id)
        .where(
            Student.school_id == school_id,
            Enrollment.academic_year_id == year_id,
            Enrollment.student_id.in_(ids),
        )
        .order_by(Enrollment.created_at.desc())
    )
    rows = db.execute(q).scalars().all()
    return [_out(e) for e in rows]


@router.get("/next-roll-number")
def get_next_roll_number(
    academic_year_id: uuid.UUID,
    class_id: uuid.UUID,
    section_id: uuid.UUID,
    roll_type: str = "admission",
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    if roll_type not in {"admission", "student"}:
        raise problem(status_code=400, title="Invalid roll type", detail="roll_type must be admission or student")

    roll_number = _generate_roll_number(
        db,
        school_id=school_id,
        academic_year_id=academic_year_id,
        class_id=class_id,
        section_id=section_id,
        prefix=STUDENT_ROLL_PREFIX if roll_type == "student" else ADMISSION_ROLL_PREFIX,
    )
    if not roll_number:
        raise problem(status_code=400, title="Invalid roll context", detail="Class, section, and academic year are required")
    return {"roll_number": roll_number}


@router.get("/{enrollment_id}", response_model=EnrollmentOut)
def get_enrollment(enrollment_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> EnrollmentOut:
    e = db.get(Enrollment, enrollment_id)
    if not e:
        raise not_found("Enrollment not found")
    s = db.get(Student, e.student_id)
    if not s or s.school_id != school_id:
        raise not_found("Enrollment not found")
    return _out(e)


@router.post("", response_model=EnrollmentOut, dependencies=[Depends(require_permission("enrollments:write"))])
def create_enrollment(
    payload: EnrollmentCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> EnrollmentOut:
    s = db.get(Student, payload.student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    year = db.get(AcademicYear, payload.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    c = db.get(SchoolClass, payload.class_id)
    if not c or c.school_id != school_id:
        raise not_found("Class not found")
    if payload.section_id:
        sec = db.get(Section, payload.section_id)
        if not sec or sec.class_id != payload.class_id:
            raise not_found("Section not found")

    now = datetime.now(timezone.utc)
    # Hikvision person IDs/card numbers are stored without separators.  Keep
    # manually entered values aligned with the generated roll-number format.
    roll_number = _normalize_roll_number(payload.roll_number)
    if not roll_number:
        roll_number = _generate_roll_number(
            db,
            school_id=school_id,
            academic_year_id=payload.academic_year_id,
            class_id=payload.class_id,
            section_id=payload.section_id,
            prefix=STUDENT_ROLL_PREFIX,
        )
    if roll_number:
        _ensure_unique_roll_number(
            db,
            school_id=school_id,
            academic_year_id=payload.academic_year_id,
            class_id=payload.class_id,
            section_id=payload.section_id,
            roll_number=roll_number,
        )
    e = Enrollment(
        student_id=payload.student_id,
        academic_year_id=payload.academic_year_id,
        class_id=payload.class_id,
        section_id=payload.section_id,
        roll_number=roll_number,
        status=payload.status,
        created_at=now,
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return _out(e)


@router.put("/{enrollment_id}", response_model=EnrollmentOut, dependencies=[Depends(require_permission("enrollments:write"))])
def update_enrollment(
    enrollment_id: uuid.UUID,
    payload: EnrollmentUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> EnrollmentOut:
    e = db.get(Enrollment, enrollment_id)
    if not e:
        raise not_found("Enrollment not found")
    s = db.get(Student, e.student_id)
    if not s or s.school_id != school_id:
        raise not_found("Enrollment not found")

    if payload.academic_year_id is not None:
        year = db.get(AcademicYear, payload.academic_year_id)
        if not year or year.school_id != school_id:
            raise not_found("Academic year not found")
        e.academic_year_id = payload.academic_year_id
    if payload.class_id is not None:
        c = db.get(SchoolClass, payload.class_id)
        if not c or c.school_id != school_id:
            raise not_found("Class not found")
        e.class_id = payload.class_id
    if "section_id" in payload.model_fields_set:
        if payload.section_id:
            sec = db.get(Section, payload.section_id)
            if not sec or sec.class_id != e.class_id:
                raise not_found("Section not found")
        e.section_id = payload.section_id
    if payload.roll_number is not None:
        e.roll_number = _normalize_roll_number(payload.roll_number)
    if payload.status is not None:
        e.status = payload.status
    if e.roll_number:
        _ensure_unique_roll_number(
            db,
            school_id=school_id,
            academic_year_id=e.academic_year_id,
            class_id=e.class_id,
            section_id=e.section_id,
            roll_number=e.roll_number,
            exclude_enrollment_id=e.id,
        )

    db.commit()
    return _out(e)


@router.delete("/{enrollment_id}", dependencies=[Depends(require_permission("enrollments:write"))])
def delete_enrollment(enrollment_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    e = db.get(Enrollment, enrollment_id)
    if not e:
        raise not_found("Enrollment not found")
    s = db.get(Student, e.student_id)
    if not s or s.school_id != school_id:
        raise not_found("Enrollment not found")
    db.delete(e)
    db.commit()
    return {"status": "ok"}


@router.patch("/{enrollment_id}/promote", dependencies=[Depends(require_permission("enrollments:write"))])
def promote_student(
    enrollment_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> dict[str, str]:
    e = db.get(Enrollment, enrollment_id)
    if not e:
        raise not_found("Enrollment not found")
    s = db.get(Student, e.student_id)
    if not s or s.school_id != school_id:
        raise not_found("Enrollment not found")
    e.status = "promoted"
    db.commit()
    return {"status": "ok"}


@router.patch("/{enrollment_id}/detain", dependencies=[Depends(require_permission("enrollments:write"))])
def detain_student(
    enrollment_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> dict[str, str]:
    e = db.get(Enrollment, enrollment_id)
    if not e:
        raise not_found("Enrollment not found")
    s = db.get(Student, e.student_id)
    if not s or s.school_id != school_id:
        raise not_found("Enrollment not found")
    e.status = "detained"
    db.commit()
    return {"status": "ok"}
