import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.grade import Grade
from app.schemas.grades import GradeCreate, GradeOut, GradeUpdate

router = APIRouter(dependencies=[Depends(require_permission("grades:read"))])


def _out(g: Grade) -> GradeOut:
    return GradeOut(id=g.id, school_id=g.school_id, name=g.name, min_percentage=g.min_percentage, max_percentage=g.max_percentage)


@router.get("", response_model=list[GradeOut])
def list_grades(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[GradeOut]:
    rows = db.execute(select(Grade).where(Grade.school_id == school_id).order_by(Grade.min_percentage.desc())).scalars().all()
    return [_out(g) for g in rows]


@router.get("/{grade_id}", response_model=GradeOut)
def get_grade(grade_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> GradeOut:
    g = db.get(Grade, grade_id)
    if not g or g.school_id != school_id:
        raise not_found("Grade not found")
    return _out(g)


@router.post("", response_model=GradeOut, dependencies=[Depends(require_permission("grades:write"))])
def create_grade(payload: GradeCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> GradeOut:
    if payload.max_percentage < payload.min_percentage:
        raise problem(status_code=400, title="Bad Request", detail="max_percentage must be >= min_percentage")
    now = datetime.now(timezone.utc)
    g = Grade(school_id=school_id, name=payload.name, min_percentage=payload.min_percentage, max_percentage=payload.max_percentage, created_at=now)
    db.add(g)
    db.commit()
    db.refresh(g)
    return _out(g)


@router.put("/{grade_id}", response_model=GradeOut, dependencies=[Depends(require_permission("grades:write"))])
def update_grade(
    grade_id: uuid.UUID, payload: GradeUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> GradeOut:
    g = db.get(Grade, grade_id)
    if not g or g.school_id != school_id:
        raise not_found("Grade not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(g, k, v)
    if g.max_percentage < g.min_percentage:
        raise problem(status_code=400, title="Bad Request", detail="max_percentage must be >= min_percentage")
    db.commit()
    return _out(g)


@router.delete("/{grade_id}", dependencies=[Depends(require_permission("grades:write"))])
def delete_grade(grade_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    g = db.get(Grade, grade_id)
    if not g or g.school_id != school_id:
        raise not_found("Grade not found")
    db.delete(g)
    db.commit()
    return {"status": "ok"}

