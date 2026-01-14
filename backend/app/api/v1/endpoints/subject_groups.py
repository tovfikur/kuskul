import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found
from app.db.session import get_db
from app.models.school_class import SchoolClass
from app.models.stream import Stream
from app.models.subject_group import SubjectGroup
from app.schemas.subject_groups import SubjectGroupCreate, SubjectGroupOut, SubjectGroupUpdate

router = APIRouter(dependencies=[Depends(require_permission("academic:read"))])


def _out(g: SubjectGroup) -> SubjectGroupOut:
    return SubjectGroupOut(
        id=g.id,
        school_id=g.school_id,
        name=g.name,
        class_id=g.class_id,
        stream_id=g.stream_id,
        is_optional=g.is_optional,
    )


@router.get("", response_model=list[SubjectGroupOut])
def list_subject_groups(
    class_id: Optional[uuid.UUID] = None,
    stream_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[SubjectGroupOut]:
    q = select(SubjectGroup).where(SubjectGroup.school_id == school_id)
    if class_id:
        q = q.where(SubjectGroup.class_id == class_id)
    if stream_id:
        q = q.where(SubjectGroup.stream_id == stream_id)
    rows = db.execute(q.order_by(SubjectGroup.name.asc())).scalars().all()
    return [_out(r) for r in rows]


@router.post("", response_model=SubjectGroupOut, dependencies=[Depends(require_permission("academic:write"))])
def create_subject_group(
    payload: SubjectGroupCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> SubjectGroupOut:
    if payload.class_id is not None:
        c = db.get(SchoolClass, payload.class_id)
        if not c or c.school_id != school_id:
            raise not_found("Class not found")
    if payload.stream_id is not None:
        st = db.get(Stream, payload.stream_id)
        if not st or st.school_id != school_id:
            raise not_found("Stream not found")
    now = datetime.now(timezone.utc)
    g = SubjectGroup(
        school_id=school_id,
        name=payload.name,
        class_id=payload.class_id,
        stream_id=payload.stream_id,
        is_optional=payload.is_optional,
        created_at=now,
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return _out(g)


@router.put("/{group_id}", response_model=SubjectGroupOut, dependencies=[Depends(require_permission("academic:write"))])
def update_subject_group(
    group_id: uuid.UUID,
    payload: SubjectGroupUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> SubjectGroupOut:
    g = db.get(SubjectGroup, group_id)
    if not g or g.school_id != school_id:
        raise not_found("Subject group not found")
    if payload.name is not None:
        g.name = payload.name
    if payload.class_id is not None:
        c = db.get(SchoolClass, payload.class_id)
        if not c or c.school_id != school_id:
            raise not_found("Class not found")
        g.class_id = payload.class_id
    if payload.stream_id is not None:
        st = db.get(Stream, payload.stream_id)
        if not st or st.school_id != school_id:
            raise not_found("Stream not found")
        g.stream_id = payload.stream_id
    if payload.is_optional is not None:
        g.is_optional = payload.is_optional
    db.commit()
    return _out(g)


@router.delete("/{group_id}", dependencies=[Depends(require_permission("academic:write"))])
def delete_subject_group(
    group_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> dict[str, str]:
    g = db.get(SubjectGroup, group_id)
    if not g or g.school_id != school_id:
        raise not_found("Subject group not found")
    db.delete(g)
    db.commit()
    return {"status": "ok"}

