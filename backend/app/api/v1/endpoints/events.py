import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.event import Event
from app.schemas.events import EventCreate, EventOut, EventUpdate

router = APIRouter(dependencies=[Depends(require_permission("events:read"))])


def _out(e: Event) -> EventOut:
    return EventOut(
        id=e.id,
        school_id=e.school_id,
        event_type=e.event_type,
        title=e.title,
        description=e.description,
        start_date=e.start_date,
        end_date=e.end_date,
        location=e.location,
        is_all_day=e.is_all_day,
    )


@router.get("", response_model=list[EventOut])
def list_events(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    event_type: Optional[str] = None,
) -> list[EventOut]:
    q = select(Event).where(Event.school_id == school_id).order_by(Event.start_date.asc())
    if start_date:
        q = q.where(Event.end_date >= start_date)
    if end_date:
        q = q.where(Event.start_date <= end_date)
    if event_type:
        q = q.where(Event.event_type == event_type)
    rows = db.execute(q).scalars().all()
    return [_out(e) for e in rows]


@router.get("/upcoming", response_model=list[EventOut])
def get_upcoming_events(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[EventOut]:
    today = date.today()
    end = today + timedelta(days=30)
    rows = db.execute(
        select(Event)
        .where(Event.school_id == school_id, Event.start_date <= end, Event.end_date >= today)
        .order_by(Event.start_date.asc())
    ).scalars().all()
    return [_out(e) for e in rows]


@router.get("/calendar")
def get_calendar(month: int, year: int, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict:
    start = date(year, month, 1)
    end = (start.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    rows = db.execute(
        select(Event).where(Event.school_id == school_id, Event.start_date <= end, Event.end_date >= start).order_by(Event.start_date.asc())
    ).scalars().all()
    by_date: dict[str, list[dict]] = {}
    for e in rows:
        d = e.start_date
        while d <= e.end_date:
            if start <= d <= end:
                by_date.setdefault(d.isoformat(), []).append(_out(e).model_dump())
            d = d + timedelta(days=1)
    return {"month": month, "year": year, "days": by_date}


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> EventOut:
    e = db.get(Event, event_id)
    if not e or e.school_id != school_id:
        raise not_found("Event not found")
    return _out(e)


@router.post("", response_model=EventOut, dependencies=[Depends(require_permission("events:write"))])
def create_event(payload: EventCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> EventOut:
    if payload.end_date < payload.start_date:
        raise problem(status_code=400, title="Bad Request", detail="end_date must be >= start_date")
    now = datetime.now(timezone.utc)
    e = Event(
        school_id=school_id,
        event_type=payload.event_type,
        title=payload.title,
        description=payload.description,
        start_date=payload.start_date,
        end_date=payload.end_date,
        location=payload.location,
        is_all_day=payload.is_all_day,
        created_at=now,
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return _out(e)


@router.put("/{event_id}", response_model=EventOut, dependencies=[Depends(require_permission("events:write"))])
def update_event(
    event_id: uuid.UUID, payload: EventUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> EventOut:
    e = db.get(Event, event_id)
    if not e or e.school_id != school_id:
        raise not_found("Event not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(e, k, v)
    if e.end_date < e.start_date:
        raise problem(status_code=400, title="Bad Request", detail="end_date must be >= start_date")
    db.commit()
    return _out(e)


@router.delete("/{event_id}", dependencies=[Depends(require_permission("events:write"))])
def delete_event(event_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    e = db.get(Event, event_id)
    if not e or e.school_id != school_id:
        raise not_found("Event not found")
    db.delete(e)
    db.commit()
    return {"status": "ok"}

