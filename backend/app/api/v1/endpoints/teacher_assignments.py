import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.school_class import SchoolClass
from app.models.section import Section
from app.models.staff import Staff
from app.models.subject import Subject
from app.models.teacher_assignment import TeacherAssignment
from app.schemas.teacher_assignments import (
    BulkAssignRequest,
    TeacherAssignmentCreate,
    TeacherAssignmentOut,
    TeacherAssignmentUpdate,
)

router = APIRouter(dependencies=[Depends(require_permission("teacher_assignments:read"))])


def _out(a: TeacherAssignment) -> TeacherAssignmentOut:
    return TeacherAssignmentOut(
        id=a.id,
        academic_year_id=a.academic_year_id,
        staff_id=a.staff_id,
        section_id=a.section_id,
        subject_id=a.subject_id,
        is_active=a.is_active,
    )


def _validate_school_scope(db: Session, school_id: uuid.UUID, payload: TeacherAssignmentCreate) -> None:
    year = db.get(AcademicYear, payload.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    staff = db.get(Staff, payload.staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.school_id != school_id:
        raise not_found("Subject not found")
    sec = db.get(Section, payload.section_id)
    if not sec:
        raise not_found("Section not found")
    cls = db.get(SchoolClass, sec.class_id)
    if not cls or cls.school_id != school_id:
        raise not_found("Section not found")


@router.get("", response_model=list[TeacherAssignmentOut])
def list_assignments(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    academic_year_id: Optional[uuid.UUID] = None,
    staff_id: Optional[uuid.UUID] = None,
    section_id: Optional[uuid.UUID] = None,
) -> list[TeacherAssignmentOut]:
    q = (
        select(TeacherAssignment)
        .join(AcademicYear, AcademicYear.id == TeacherAssignment.academic_year_id)
        .where(AcademicYear.school_id == school_id)
        .order_by(TeacherAssignment.created_at.desc())
    )
    if academic_year_id:
        q = q.where(TeacherAssignment.academic_year_id == academic_year_id)
    if staff_id:
        q = q.where(TeacherAssignment.staff_id == staff_id)
    if section_id:
        q = q.where(TeacherAssignment.section_id == section_id)
    rows = db.execute(q).scalars().all()
    return [_out(a) for a in rows]


@router.get("/{assignment_id}", response_model=TeacherAssignmentOut)
def get_assignment(
    assignment_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> TeacherAssignmentOut:
    a = db.get(TeacherAssignment, assignment_id)
    if not a:
        raise not_found("Assignment not found")
    year = db.get(AcademicYear, a.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Assignment not found")
    return _out(a)


@router.post("", response_model=TeacherAssignmentOut, dependencies=[Depends(require_permission("teacher_assignments:write"))])
def create_assignment(
    payload: TeacherAssignmentCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> TeacherAssignmentOut:
    _validate_school_scope(db, school_id, payload)
    now = datetime.now(timezone.utc)
    a = TeacherAssignment(
        academic_year_id=payload.academic_year_id,
        staff_id=payload.staff_id,
        section_id=payload.section_id,
        subject_id=payload.subject_id,
        is_active=payload.is_active,
        created_at=now,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return _out(a)


@router.put("/{assignment_id}", response_model=TeacherAssignmentOut, dependencies=[Depends(require_permission("teacher_assignments:write"))])
def update_assignment(
    assignment_id: uuid.UUID,
    payload: TeacherAssignmentUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> TeacherAssignmentOut:
    a = db.get(TeacherAssignment, assignment_id)
    if not a:
        raise not_found("Assignment not found")
    year = db.get(AcademicYear, a.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Assignment not found")

    next_state = TeacherAssignmentCreate(
        academic_year_id=payload.academic_year_id or a.academic_year_id,
        staff_id=payload.staff_id or a.staff_id,
        section_id=payload.section_id or a.section_id,
        subject_id=payload.subject_id or a.subject_id,
        is_active=payload.is_active if payload.is_active is not None else a.is_active,
    )
    _validate_school_scope(db, school_id, next_state)

    a.academic_year_id = next_state.academic_year_id
    a.staff_id = next_state.staff_id
    a.section_id = next_state.section_id
    a.subject_id = next_state.subject_id
    a.is_active = next_state.is_active
    db.commit()
    return _out(a)


@router.delete("/{assignment_id}", dependencies=[Depends(require_permission("teacher_assignments:write"))])
def delete_assignment(
    assignment_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    a = db.get(TeacherAssignment, assignment_id)
    if not a:
        raise not_found("Assignment not found")
    year = db.get(AcademicYear, a.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Assignment not found")
    db.delete(a)
    db.commit()
    return {"status": "ok"}


@router.post("/bulk-assign", dependencies=[Depends(require_permission("teacher_assignments:write"))])
def bulk_assign_teachers(
    payload: BulkAssignRequest,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    created = 0
    for item in payload.items:
        _validate_school_scope(db, school_id, item)
        db.add(
            TeacherAssignment(
                academic_year_id=item.academic_year_id,
                staff_id=item.staff_id,
                section_id=item.section_id,
                subject_id=item.subject_id,
                is_active=item.is_active,
                created_at=now,
            )
        )
        created += 1
    db.commit()
    return {"created": created}

