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
from app.models.curriculum_unit import CurriculumUnit
from app.models.subject import Subject
from app.schemas.curriculum import CurriculumUnitCreate, CurriculumUnitOut, CurriculumUnitUpdate

router = APIRouter(dependencies=[Depends(require_permission("academic:read"))])


def _out(c: CurriculumUnit) -> CurriculumUnitOut:
    return CurriculumUnitOut(
        id=c.id,
        academic_year_id=c.academic_year_id,
        subject_id=c.subject_id,
        title=c.title,
        description=c.description,
        order_index=c.order_index,
    )


@router.get("", response_model=list[CurriculumUnitOut])
def list_curriculum(
    academic_year_id: Optional[uuid.UUID] = None,
    subject_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[CurriculumUnitOut]:
    q = (
        select(CurriculumUnit)
        .join(AcademicYear, AcademicYear.id == CurriculumUnit.academic_year_id)
        .where(AcademicYear.school_id == school_id)
    )
    if academic_year_id:
        q = q.where(CurriculumUnit.academic_year_id == academic_year_id)
    if subject_id:
        q = q.where(CurriculumUnit.subject_id == subject_id)
    rows = db.execute(q.order_by(CurriculumUnit.order_index.asc(), CurriculumUnit.created_at.asc())).scalars().all()
    return [_out(r) for r in rows]


@router.post("", response_model=CurriculumUnitOut, dependencies=[Depends(require_permission("academic:write"))])
def create_curriculum_unit(
    payload: CurriculumUnitCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> CurriculumUnitOut:
    year = db.get(AcademicYear, payload.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    subj = db.get(Subject, payload.subject_id)
    if not subj or subj.school_id != school_id:
        raise not_found("Subject not found")
    now = datetime.now(timezone.utc)
    c = CurriculumUnit(
        academic_year_id=payload.academic_year_id,
        subject_id=payload.subject_id,
        title=payload.title,
        description=payload.description,
        order_index=payload.order_index,
        created_at=now,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _out(c)


@router.put("/{unit_id}", response_model=CurriculumUnitOut, dependencies=[Depends(require_permission("academic:write"))])
def update_curriculum_unit(
    unit_id: uuid.UUID, payload: CurriculumUnitUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> CurriculumUnitOut:
    c = db.get(CurriculumUnit, unit_id)
    if not c:
        raise not_found("Curriculum unit not found")
    year = db.get(AcademicYear, c.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Curriculum unit not found")
    if payload.title is not None:
        c.title = payload.title
    if payload.description is not None or payload.description is None:
        c.description = payload.description
    if payload.order_index is not None:
        c.order_index = payload.order_index
    db.commit()
    return _out(c)


@router.delete("/{unit_id}", dependencies=[Depends(require_permission("academic:write"))])
def delete_curriculum_unit(
    unit_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> dict[str, str]:
    c = db.get(CurriculumUnit, unit_id)
    if not c:
        raise not_found("Curriculum unit not found")
    year = db.get(AcademicYear, c.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Curriculum unit not found")
    db.delete(c)
    db.commit()
    return {"status": "ok"}

