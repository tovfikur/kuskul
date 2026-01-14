import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found
from app.db.session import get_db
from app.models.transport_route import TransportRoute
from app.models.transport_route_stop import TransportRouteStop
from app.schemas.transport import TransportRouteStopCreate, TransportRouteStopOut, TransportRouteStopUpdate

router = APIRouter(dependencies=[Depends(require_permission("transport_stops:read"))])


def _out(s: TransportRouteStop) -> TransportRouteStopOut:
    return TransportRouteStopOut(
        id=s.id,
        route_id=s.route_id,
        name=s.name,
        sequence=s.sequence,
        pickup_time=s.pickup_time,
        drop_time=s.drop_time,
    )


def _ensure_route(db: Session, school_id: uuid.UUID, route_id: uuid.UUID) -> None:
    r = db.get(TransportRoute, route_id)
    if not r or r.school_id != school_id:
        raise not_found("Route not found")


@router.get("", response_model=list[TransportRouteStopOut])
def list_route_stops(
    route_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[TransportRouteStopOut]:
    q = select(TransportRouteStop).join(TransportRoute, TransportRoute.id == TransportRouteStop.route_id).where(
        TransportRoute.school_id == school_id
    )
    if route_id:
        q = q.where(TransportRouteStop.route_id == route_id)
    rows = db.execute(q.order_by(TransportRouteStop.sequence.asc())).scalars().all()
    return [_out(s) for s in rows]


@router.get("/{stop_id}", response_model=TransportRouteStopOut)
def get_route_stop(stop_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> TransportRouteStopOut:
    s = db.get(TransportRouteStop, stop_id)
    if not s:
        raise not_found("Stop not found")
    _ensure_route(db, school_id, s.route_id)
    return _out(s)


@router.post("", response_model=TransportRouteStopOut, dependencies=[Depends(require_permission("transport_stops:write"))])
def create_route_stop(
    payload: TransportRouteStopCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> TransportRouteStopOut:
    _ensure_route(db, school_id, payload.route_id)
    now = datetime.now(timezone.utc)
    s = TransportRouteStop(
        route_id=payload.route_id,
        name=payload.name,
        sequence=payload.sequence,
        pickup_time=payload.pickup_time,
        drop_time=payload.drop_time,
        created_at=now,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _out(s)


@router.put("/{stop_id}", response_model=TransportRouteStopOut, dependencies=[Depends(require_permission("transport_stops:write"))])
def update_route_stop(
    stop_id: uuid.UUID, payload: TransportRouteStopUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> TransportRouteStopOut:
    s = db.get(TransportRouteStop, stop_id)
    if not s:
        raise not_found("Stop not found")
    _ensure_route(db, school_id, s.route_id)
    data = payload.model_dump(exclude_unset=True)
    for k, val in data.items():
        setattr(s, k, val)
    db.commit()
    return _out(s)


@router.delete("/{stop_id}", dependencies=[Depends(require_permission("transport_stops:write"))])
def delete_route_stop(stop_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    s = db.get(TransportRouteStop, stop_id)
    if not s:
        raise not_found("Stop not found")
    _ensure_route(db, school_id, s.route_id)
    db.delete(s)
    db.commit()
    return {"status": "ok"}

