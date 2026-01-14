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
from app.models.stream import Stream
from app.models.subject_group import SubjectGroup
from app.models.subject import Subject
from app.schemas.subjects import AssignSubjectToClassRequest, SubjectCreate, SubjectOut, SubjectUpdate

router = APIRouter(dependencies=[Depends(require_permission("academic:read"))])


def _out(s: Subject) -> SubjectOut:
    return SubjectOut(
        id=s.id,
        school_id=s.school_id,
        name=s.name,
        code=s.code,
        subject_type=s.subject_type,
        credits=s.credits,
        max_marks=s.max_marks,
        group_id=s.group_id,
        stream_id=s.stream_id,
        is_active=s.is_active,
    )


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
    if payload.group_id is not None:
        g = db.get(SubjectGroup, payload.group_id)
        if not g or g.school_id != school_id:
            raise not_found("Subject group not found")
    if payload.stream_id is not None:
        st = db.get(Stream, payload.stream_id)
        if not st or st.school_id != school_id:
            raise not_found("Stream not found")
    now = datetime.now(timezone.utc)
    s = Subject(
        school_id=school_id,
        name=payload.name,
        code=payload.code,
        subject_type=payload.subject_type,
        credits=payload.credits,
        max_marks=payload.max_marks,
        group_id=payload.group_id,
        stream_id=payload.stream_id,
        is_active=payload.is_active,
        created_at=now,
    )
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
    if payload.subject_type is not None:
        s.subject_type = payload.subject_type
    if payload.credits is not None or payload.credits is None:
        s.credits = payload.credits
    if payload.max_marks is not None or payload.max_marks is None:
        s.max_marks = payload.max_marks
    if payload.group_id is not None:
        g = db.get(SubjectGroup, payload.group_id)
        if not g or g.school_id != school_id:
            raise not_found("Subject group not found")
        s.group_id = payload.group_id
    if payload.stream_id is not None:
        st = db.get(Stream, payload.stream_id)
        if not st or st.school_id != school_id:
            raise not_found("Stream not found")
        s.stream_id = payload.stream_id
    if payload.is_active is not None:
        s.is_active = payload.is_active
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
