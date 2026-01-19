import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found
from app.db.session import get_db
from app.models.student import Student
from app.models.transport_assignment import StudentTransportAssignment
from app.models.transport_route import TransportRoute
from app.models.transport_route_stop import TransportRouteStop
from app.schemas.students import StudentOut
from app.schemas.transport import TransportRouteCreate, TransportRouteOut, TransportRouteStopOut, TransportRouteUpdate

router = APIRouter(dependencies=[Depends(require_permission("transport_routes:read"))])


def _out(r: TransportRoute) -> TransportRouteOut:
    return TransportRouteOut(
        id=r.id,
        school_id=r.school_id,
        name=r.name,
        code=r.code,
        description=r.description,
        is_active=r.is_active,
    )


def _stop_out(s: TransportRouteStop) -> TransportRouteStopOut:
    return TransportRouteStopOut(
        id=s.id,
        route_id=s.route_id,
        name=s.name,
        sequence=s.sequence,
        pickup_time=s.pickup_time,
        drop_time=s.drop_time,
    )


@router.get("", response_model=list[TransportRouteOut])
def list_routes(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[TransportRouteOut]:
    rows = db.execute(select(TransportRoute).where(TransportRoute.school_id == school_id).order_by(TransportRoute.created_at.desc())).scalars().all()
    return [_out(r) for r in rows]


@router.get("/{route_id}/stops", response_model=list[TransportRouteStopOut])
def get_route_stops(route_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[TransportRouteStopOut]:
    r = db.get(TransportRoute, route_id)
    if not r or r.school_id != school_id:
        raise not_found("Route not found")
    rows = db.execute(select(TransportRouteStop).where(TransportRouteStop.route_id == route_id).order_by(TransportRouteStop.sequence.asc())).scalars().all()
    return [_stop_out(s) for s in rows]


@router.get("/{route_id}/students", response_model=list[StudentOut])
def get_route_students(route_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[StudentOut]:
    r = db.get(TransportRoute, route_id)
    if not r or r.school_id != school_id:
        raise not_found("Route not found")
    student_ids = db.execute(
        select(StudentTransportAssignment.student_id).where(
            StudentTransportAssignment.route_id == route_id,
            StudentTransportAssignment.school_id == school_id,
            StudentTransportAssignment.status == "active",
        )
    ).scalars().all()
    if not student_ids:
        return []
    students = db.execute(select(Student).where(Student.id.in_(student_ids), Student.school_id == school_id)).scalars().all()
    return [StudentOut.model_validate(s) for s in students]


@router.get("/{route_id}", response_model=TransportRouteOut)
def get_route(route_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> TransportRouteOut:
    r = db.get(TransportRoute, route_id)
    if not r or r.school_id != school_id:
        raise not_found("Route not found")
    return _out(r)


@router.post("", response_model=TransportRouteOut, dependencies=[Depends(require_permission("transport_routes:write"))])
def create_route(payload: TransportRouteCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> TransportRouteOut:
    now = datetime.now(timezone.utc)
    r = TransportRoute(school_id=school_id, name=payload.name, code=payload.code, description=payload.description, is_active=payload.is_active, created_at=now)
    db.add(r)
    db.commit()
    db.refresh(r)
    return _out(r)


@router.put("/{route_id}", response_model=TransportRouteOut, dependencies=[Depends(require_permission("transport_routes:write"))])
def update_route(
    route_id: uuid.UUID, payload: TransportRouteUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> TransportRouteOut:
    r = db.get(TransportRoute, route_id)
    if not r or r.school_id != school_id:
        raise not_found("Route not found")
    data = payload.model_dump(exclude_unset=True)
    for k, val in data.items():
        setattr(r, k, val)
    db.commit()
    return _out(r)


@router.delete("/{route_id}", dependencies=[Depends(require_permission("transport_routes:write"))])
def delete_route(route_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    r = db.get(TransportRoute, route_id)
    if not r or r.school_id != school_id:
        raise not_found("Route not found")
    db.delete(r)
    db.commit()
    return {"status": "ok"}

