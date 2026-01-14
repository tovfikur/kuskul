import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.class_subject import ClassSubject
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.schemas.subjects import AssignSubjectToClassRequest, SubjectCreate, SubjectOut, SubjectUpdate

router = APIRouter(dependencies=[Depends(require_permission("academic:read"))])


def _out(s: Subject) -> SubjectOut:
    return SubjectOut(id=s.id, school_id=s.school_id, name=s.name, code=s.code)


@router.get("", response_model=list[SubjectOut])
def list_subjects(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[SubjectOut]:
    subjects = db.execute(select(Subject).where(Subject.school_id == school_id).order_by(Subject.name.asc())).scalars().all()
    return [_out(s) for s in subjects]


@router.get("/{subject_id}", response_model=SubjectOut)
def get_subject(subject_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> SubjectOut:
    s = db.get(Subject, subject_id)
    if not s or s.school_id != school_id:
        raise not_found("Subject not found")
    return _out(s)


@router.post("", response_model=SubjectOut, dependencies=[Depends(require_permission("academic:write"))])
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> SubjectOut:
    now = datetime.now(timezone.utc)
    s = Subject(school_id=school_id, name=payload.name, code=payload.code, created_at=now)
    db.add(s)
    db.commit()
    db.refresh(s)
    return _out(s)


@router.put("/{subject_id}", response_model=SubjectOut, dependencies=[Depends(require_permission("academic:write"))])
def update_subject(
    subject_id: uuid.UUID, payload: SubjectUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> SubjectOut:
    s = db.get(Subject, subject_id)
    if not s or s.school_id != school_id:
        raise not_found("Subject not found")
    if payload.name is not None:
        s.name = payload.name
    if payload.code is not None:
        s.code = payload.code
    db.commit()
    return _out(s)


@router.delete("/{subject_id}", dependencies=[Depends(require_permission("academic:write"))])
def delete_subject(subject_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    s = db.get(Subject, subject_id)
    if not s or s.school_id != school_id:
        raise not_found("Subject not found")
    db.delete(s)
    db.commit()
    return {"status": "ok"}


@router.post("/{subject_id}/assign-to-class", dependencies=[Depends(require_permission("academic:write"))])
def assign_subject_to_class(
    subject_id: uuid.UUID,
    payload: AssignSubjectToClassRequest,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    s = db.get(Subject, subject_id)
    if not s or s.school_id != school_id:
        raise not_found("Subject not found")
    c = db.get(SchoolClass, payload.class_id)
    if not c or c.school_id != school_id:
        raise not_found("Class not found")
    exists = db.get(ClassSubject, {"class_id": payload.class_id, "subject_id": subject_id})
    if exists:
        raise problem(status_code=409, title="Conflict", detail="Subject already assigned to class")
    db.add(ClassSubject(class_id=payload.class_id, subject_id=subject_id))
    db.commit()
    return {"status": "ok"}


@router.delete("/{subject_id}/remove-from-class/{class_id}", dependencies=[Depends(require_permission("academic:write"))])
def remove_subject_from_class(
    subject_id: uuid.UUID,
    class_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    s = db.get(Subject, subject_id)
    if not s or s.school_id != school_id:
        raise not_found("Subject not found")
    c = db.get(SchoolClass, class_id)
    if not c or c.school_id != school_id:
        raise not_found("Class not found")
    link = db.get(ClassSubject, {"class_id": class_id, "subject_id": subject_id})
    if not link:
        raise not_found("Assignment not found")
    db.delete(link)
    db.commit()
    return {"status": "ok"}

