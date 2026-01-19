import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found
from app.db.session import get_db
from app.models.student import Student
from app.models.transport_assignment import StudentTransportAssignment
from app.models.transport_vehicle import TransportVehicle
from app.schemas.students import StudentOut
from app.schemas.transport import TransportVehicleCreate, TransportVehicleOut, TransportVehicleUpdate

router = APIRouter(dependencies=[Depends(require_permission("transport_vehicles:read"))])


def _out(v: TransportVehicle) -> TransportVehicleOut:
    return TransportVehicleOut(
        id=v.id,
        school_id=v.school_id,
        name=v.name,
        registration_no=v.registration_no,
        capacity=v.capacity,
        driver_name=v.driver_name,
        status=v.status,
    )


@router.get("", response_model=list[TransportVehicleOut])
def list_vehicles(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    status: Optional[str] = None,
) -> list[TransportVehicleOut]:
    q = select(TransportVehicle).where(TransportVehicle.school_id == school_id).order_by(TransportVehicle.created_at.desc())
    if status:
        q = q.where(TransportVehicle.status == status)
    rows = db.execute(q).scalars().all()
    return [_out(v) for v in rows]


@router.get("/{vehicle_id}/students", response_model=list[StudentOut])
def get_vehicle_students(
    vehicle_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> list[StudentOut]:
    v = db.get(TransportVehicle, vehicle_id)
    if not v or v.school_id != school_id:
        raise not_found("Vehicle not found")
    student_ids = db.execute(
        select(StudentTransportAssignment.student_id).where(
            StudentTransportAssignment.vehicle_id == vehicle_id,
            StudentTransportAssignment.school_id == school_id,
            StudentTransportAssignment.status == "active",
        )
    ).scalars().all()
    if not student_ids:
        return []
    students = db.execute(select(Student).where(Student.id.in_(student_ids), Student.school_id == school_id)).scalars().all()
    return [StudentOut.model_validate(s) for s in students]


@router.patch("/{vehicle_id}/maintenance", dependencies=[Depends(require_permission("transport_vehicles:write"))])
def mark_vehicle_maintenance(
    vehicle_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> dict[str, str]:
    v = db.get(TransportVehicle, vehicle_id)
    if not v or v.school_id != school_id:
        raise not_found("Vehicle not found")
    v.status = "maintenance"
    db.commit()
    return {"status": "ok"}


@router.get("/{vehicle_id}", response_model=TransportVehicleOut)
def get_vehicle(vehicle_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> TransportVehicleOut:
    v = db.get(TransportVehicle, vehicle_id)
    if not v or v.school_id != school_id:
        raise not_found("Vehicle not found")
    return _out(v)


@router.post("", response_model=TransportVehicleOut, dependencies=[Depends(require_permission("transport_vehicles:write"))])
def create_vehicle(
    payload: TransportVehicleCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> TransportVehicleOut:
    now = datetime.now(timezone.utc)
    v = TransportVehicle(
        school_id=school_id,
        name=payload.name,
        registration_no=payload.registration_no,
        capacity=payload.capacity,
        driver_name=payload.driver_name,
        status=payload.status,
        created_at=now,
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return _out(v)


@router.put("/{vehicle_id}", response_model=TransportVehicleOut, dependencies=[Depends(require_permission("transport_vehicles:write"))])
def update_vehicle(
    vehicle_id: uuid.UUID,
    payload: TransportVehicleUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> TransportVehicleOut:
    v = db.get(TransportVehicle, vehicle_id)
    if not v or v.school_id != school_id:
        raise not_found("Vehicle not found")
    data = payload.model_dump(exclude_unset=True)
    for k, val in data.items():
        setattr(v, k, val)
    db.commit()
    return _out(v)


@router.delete("/{vehicle_id}", dependencies=[Depends(require_permission("transport_vehicles:write"))])
def delete_vehicle(vehicle_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    v = db.get(TransportVehicle, vehicle_id)
    if not v or v.school_id != school_id:
        raise not_found("Vehicle not found")
    db.delete(v)
    db.commit()
    return {"status": "ok"}

