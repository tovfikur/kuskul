import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.term import Term
from app.schemas.terms import TermCreate, TermOut, TermUpdate

router = APIRouter(dependencies=[Depends(require_permission("academic:read"))])


def _out(t: Term) -> TermOut:
    return TermOut(
        id=t.id,
        academic_year_id=t.academic_year_id,
        name=t.name,
        start_date=t.start_date,
        end_date=t.end_date,
        weightage=t.weightage,
        is_active=t.is_active,
    )


@router.get("", response_model=list[TermOut])
def list_terms(
    academic_year_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[TermOut]:
    q = select(Term).join(AcademicYear, AcademicYear.id == Term.academic_year_id).where(AcademicYear.school_id == school_id)
    if academic_year_id:
        q = q.where(Term.academic_year_id == academic_year_id)
    rows = db.execute(q.order_by(Term.start_date.asc())).scalars().all()
    return [_out(t) for t in rows]


@router.post("", response_model=TermOut, dependencies=[Depends(require_permission("academic:write"))])
def create_term(payload: TermCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> TermOut:
    year = db.get(AcademicYear, payload.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    if payload.end_date <= payload.start_date:
        raise problem(status_code=400, title="Bad Request", detail="end_date must be > start_date")
    now = datetime.now(timezone.utc)
    t = Term(
        academic_year_id=payload.academic_year_id,
        name=payload.name,
        start_date=payload.start_date,
        end_date=payload.end_date,
        weightage=payload.weightage,
        is_active=payload.is_active,
        created_at=now,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _out(t)


@router.put("/{term_id}", response_model=TermOut, dependencies=[Depends(require_permission("academic:write"))])
def update_term(term_id: uuid.UUID, payload: TermUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> TermOut:
    t = db.get(Term, term_id)
    if not t:
        raise not_found("Term not found")
    year = db.get(AcademicYear, t.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Term not found")
    if payload.name is not None:
        t.name = payload.name
    if payload.start_date is not None:
        t.start_date = payload.start_date
    if payload.end_date is not None:
        t.end_date = payload.end_date
    if payload.weightage is not None:
        t.weightage = payload.weightage
    if payload.is_active is not None:
        t.is_active = payload.is_active
    if t.end_date <= t.start_date:
        raise problem(status_code=400, title="Bad Request", detail="end_date must be > start_date")
    db.commit()
    return _out(t)


@router.delete("/{term_id}", dependencies=[Depends(require_permission("academic:write"))])
def delete_term(term_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    t = db.get(Term, term_id)
    if not t:
        raise not_found("Term not found")
    year = db.get(AcademicYear, t.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Term not found")
    db.delete(t)
    db.commit()
    return {"status": "ok"}

