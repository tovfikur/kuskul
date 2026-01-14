import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, not_implemented
from app.db.session import get_db
from app.models.class_subject import ClassSubject
from app.models.school_class import SchoolClass
from app.models.section import Section
from app.models.subject import Subject
from app.schemas.classes import ClassCreate, ClassOut, ClassUpdate
from app.schemas.sections import SectionOut
from app.schemas.subjects import SubjectOut

router = APIRouter(dependencies=[Depends(require_permission("academic:read"))])


def _class_out(row: SchoolClass) -> ClassOut:
    return ClassOut(id=row.id, school_id=row.school_id, name=row.name, numeric_value=row.numeric_value)


@router.get("", response_model=list[ClassOut])
def list_classes(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[ClassOut]:
    classes = db.execute(select(SchoolClass).where(SchoolClass.school_id == school_id).order_by(SchoolClass.name.asc())).scalars().all()
    return [_class_out(c) for c in classes]


@router.get("/{class_id}", response_model=ClassOut)
def get_class(class_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> ClassOut:
    c = db.get(SchoolClass, class_id)
    if not c or c.school_id != school_id:
        raise not_found("Class not found")
    return _class_out(c)


@router.post("", response_model=ClassOut, dependencies=[Depends(require_permission("academic:write"))])
def create_class(payload: ClassCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> ClassOut:
    now = datetime.now(timezone.utc)
    c = SchoolClass(school_id=school_id, name=payload.name, numeric_value=payload.numeric_value, created_at=now)
    db.add(c)
    db.commit()
    db.refresh(c)
    return _class_out(c)


@router.put("/{class_id}", response_model=ClassOut, dependencies=[Depends(require_permission("academic:write"))])
def update_class(
    class_id: uuid.UUID, payload: ClassUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> ClassOut:
    c = db.get(SchoolClass, class_id)
    if not c or c.school_id != school_id:
        raise not_found("Class not found")
    if payload.name is not None:
        c.name = payload.name
    if payload.numeric_value is not None or payload.numeric_value is None:
        c.numeric_value = payload.numeric_value
    db.commit()
    return _class_out(c)


@router.delete("/{class_id}", dependencies=[Depends(require_permission("academic:write"))])
def delete_class(class_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    c = db.get(SchoolClass, class_id)
    if not c or c.school_id != school_id:
        raise not_found("Class not found")
    db.delete(c)
    db.commit()
    return {"status": "ok"}


@router.get("/{class_id}/sections", response_model=list[SectionOut])
def get_class_sections(class_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[SectionOut]:
    c = db.get(SchoolClass, class_id)
    if not c or c.school_id != school_id:
        raise not_found("Class not found")
    sections = db.execute(select(Section).where(Section.class_id == class_id).order_by(Section.name.asc())).scalars().all()
    return [SectionOut(id=s.id, class_id=s.class_id, name=s.name, capacity=s.capacity, room_number=s.room_number) for s in sections]


@router.get("/{class_id}/subjects", response_model=list[SubjectOut])
def get_class_subjects(class_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[SubjectOut]:
    c = db.get(SchoolClass, class_id)
    if not c or c.school_id != school_id:
        raise not_found("Class not found")
    subjects = db.execute(
        select(Subject)
        .join(ClassSubject, ClassSubject.subject_id == Subject.id)
        .where(ClassSubject.class_id == class_id)
        .order_by(Subject.name.asc())
    ).scalars().all()
    return [SubjectOut(id=s.id, school_id=s.school_id, name=s.name, code=s.code) for s in subjects]


@router.get("/{class_id}/students", include_in_schema=False)
def get_class_students() -> None:
    raise not_implemented("Students are not implemented yet")


@router.get("/{class_id}/statistics", include_in_schema=False)
def get_class_statistics() -> None:
    raise not_implemented("Class statistics are not implemented yet")

