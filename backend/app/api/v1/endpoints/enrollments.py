import uuid
from datetime import datetime, timezone
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
    e = Enrollment(
        student_id=payload.student_id,
        academic_year_id=payload.academic_year_id,
        class_id=payload.class_id,
        section_id=payload.section_id,
        roll_number=payload.roll_number,
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
    if payload.section_id is not None:
        if payload.section_id:
            sec = db.get(Section, payload.section_id)
            if not sec or sec.class_id != e.class_id:
                raise not_found("Section not found")
        e.section_id = payload.section_id
    if payload.roll_number is not None:
        e.roll_number = payload.roll_number
    if payload.status is not None:
        e.status = payload.status

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
