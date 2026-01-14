import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.time_slot import TimeSlot
from app.schemas.time_slots import TimeSlotCreate, TimeSlotOut, TimeSlotUpdate

router = APIRouter(dependencies=[Depends(require_permission("time_slots:read"))])


def _out(s: TimeSlot) -> TimeSlotOut:
    return TimeSlotOut(
        id=s.id,
        school_id=s.school_id,
        name=s.name,
        start_time=s.start_time,
        end_time=s.end_time,
        is_active=s.is_active,
    )


@router.get("", response_model=list[TimeSlotOut])
def list_time_slots(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[TimeSlotOut]:
    slots = db.execute(select(TimeSlot).where(TimeSlot.school_id == school_id).order_by(TimeSlot.start_time.asc())).scalars().all()
    return [_out(s) for s in slots]


@router.get("/{slot_id}", response_model=TimeSlotOut)
def get_time_slot(slot_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> TimeSlotOut:
    s = db.get(TimeSlot, slot_id)
    if not s or s.school_id != school_id:
        raise not_found("Time slot not found")
    return _out(s)


@router.post("", response_model=TimeSlotOut, dependencies=[Depends(require_permission("time_slots:write"))])
def create_time_slot(payload: TimeSlotCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> TimeSlotOut:
    if payload.end_time <= payload.start_time:
        raise problem(status_code=400, title="Bad Request", detail="end_time must be > start_time")
    now = datetime.now(timezone.utc)
    s = TimeSlot(
        school_id=school_id,
        name=payload.name,
        start_time=payload.start_time,
        end_time=payload.end_time,
        is_active=payload.is_active,
        created_at=now,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _out(s)


@router.put("/{slot_id}", response_model=TimeSlotOut, dependencies=[Depends(require_permission("time_slots:write"))])
def update_time_slot(
    slot_id: uuid.UUID, payload: TimeSlotUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> TimeSlotOut:
    s = db.get(TimeSlot, slot_id)
    if not s or s.school_id != school_id:
        raise not_found("Time slot not found")
    if payload.name is not None:
        s.name = payload.name
    if payload.start_time is not None:
        s.start_time = payload.start_time
    if payload.end_time is not None:
        s.end_time = payload.end_time
    if payload.is_active is not None:
        s.is_active = payload.is_active
    if s.end_time <= s.start_time:
        raise problem(status_code=400, title="Bad Request", detail="end_time must be > start_time")
    db.commit()
    return _out(s)


@router.delete("/{slot_id}", dependencies=[Depends(require_permission("time_slots:write"))])
def delete_time_slot(slot_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    s = db.get(TimeSlot, slot_id)
    if not s or s.school_id != school_id:
        raise not_found("Time slot not found")
    db.delete(s)
    db.commit()
    return {"status": "ok"}

