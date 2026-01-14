import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
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
from app.schemas.batch import BatchPromoteStudentsRequest, BatchTransferStudentsRequest

router = APIRouter(dependencies=[Depends(require_permission("batch:write"))])


def _ensure_year(db: Session, school_id: uuid.UUID, year_id: uuid.UUID) -> None:
    y = db.get(AcademicYear, year_id)
    if not y or y.school_id != school_id:
        raise not_found("Academic year not found")


def _ensure_class(db: Session, school_id: uuid.UUID, class_id: uuid.UUID) -> None:
    c = db.get(SchoolClass, class_id)
    if not c or c.school_id != school_id:
        raise not_found("Class not found")


def _ensure_section(db: Session, class_id: uuid.UUID, section_id: uuid.UUID) -> None:
    s = db.get(Section, section_id)
    if not s or s.class_id != class_id:
        raise not_found("Section not found")


@router.post("/students/transfer")
def batch_transfer_students(
    payload: BatchTransferStudentsRequest, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> dict[str, int]:
    updated = 0
    for eid in payload.enrollment_ids:
        e = db.get(Enrollment, eid)
        if not e:
            raise not_found("Enrollment not found")
        student = db.get(Student, e.student_id)
        if not student or student.school_id != school_id:
            raise not_found("Enrollment not found")
        if payload.new_section_id:
            _ensure_section(db, e.class_id, payload.new_section_id)
            e.section_id = payload.new_section_id
        updated += 1
    db.commit()
    return {"updated": updated}


@router.post("/students/promote")
def batch_promote_students(
    payload: BatchPromoteStudentsRequest, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> dict[str, int]:
    _ensure_year(db, school_id, payload.new_academic_year_id)
    _ensure_class(db, school_id, payload.new_class_id)
    if payload.new_section_id:
        _ensure_section(db, payload.new_class_id, payload.new_section_id)
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

