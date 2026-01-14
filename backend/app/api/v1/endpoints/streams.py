import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found
from app.db.session import get_db
from app.models.stream import Stream
from app.schemas.streams import StreamCreate, StreamOut, StreamUpdate

router = APIRouter(dependencies=[Depends(require_permission("academic:read"))])


def _out(s: Stream) -> StreamOut:
    return StreamOut(id=s.id, school_id=s.school_id, name=s.name, is_active=s.is_active)


@router.get("", response_model=list[StreamOut])
def list_streams(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[StreamOut]:
    rows = db.execute(select(Stream).where(Stream.school_id == school_id).order_by(Stream.name.asc())).scalars().all()
    return [_out(s) for s in rows]


@router.post("", response_model=StreamOut, dependencies=[Depends(require_permission("academic:write"))])
def create_stream(payload: StreamCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> StreamOut:
    now = datetime.now(timezone.utc)
    s = Stream(school_id=school_id, name=payload.name, is_active=payload.is_active, created_at=now)
    db.add(s)
    db.commit()
    db.refresh(s)
    return _out(s)


@router.put("/{stream_id}", response_model=StreamOut, dependencies=[Depends(require_permission("academic:write"))])
def update_stream(
    stream_id: uuid.UUID, payload: StreamUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> StreamOut:
    s = db.get(Stream, stream_id)
    if not s or s.school_id != school_id:
        raise not_found("Stream not found")
    if payload.name is not None:
        s.name = payload.name
    if payload.is_active is not None:
        s.is_active = payload.is_active
    db.commit()
    return _out(s)


@router.delete("/{stream_id}", dependencies=[Depends(require_permission("academic:write"))])
def delete_stream(stream_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    s = db.get(Stream, stream_id)
    if not s or s.school_id != school_id:
        raise not_found("Stream not found")
    db.delete(s)
    db.commit()
    return {"status": "ok"}

