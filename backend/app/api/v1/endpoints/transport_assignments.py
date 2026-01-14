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
from app.models.transport_route import TransportRoute
from app.models.transport_route_stop import TransportRouteStop
from app.models.transport_vehicle import TransportVehicle
from app.schemas.transport import AssignStudentTransportRequest, StudentTransportAssignmentOut, UpdateStudentTransportRequest

router = APIRouter(dependencies=[Depends(require_permission("transport_assignments:read"))])


def _out(a: StudentTransportAssignment) -> StudentTransportAssignmentOut:
    return StudentTransportAssignmentOut(
        id=a.id,
        school_id=a.school_id,
        student_id=a.student_id,
        route_id=a.route_id,
        stop_id=a.stop_id,
        vehicle_id=a.vehicle_id,
        status=a.status,
    )


def _ensure_student(db: Session, school_id: uuid.UUID, student_id: uuid.UUID) -> None:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")


def _ensure_route(db: Session, school_id: uuid.UUID, route_id: uuid.UUID) -> None:
    r = db.get(TransportRoute, route_id)
    if not r or r.school_id != school_id:
        raise not_found("Route not found")


def _ensure_vehicle(db: Session, school_id: uuid.UUID, vehicle_id: uuid.UUID) -> None:
    v = db.get(TransportVehicle, vehicle_id)
    if not v or v.school_id != school_id:
        raise not_found("Vehicle not found")


def _ensure_stop(db: Session, school_id: uuid.UUID, stop_id: uuid.UUID, route_id: uuid.UUID) -> None:
    st = db.get(TransportRouteStop, stop_id)
    if not st or st.route_id != route_id:
        raise not_found("Stop not found")
    _ensure_route(db, school_id, route_id)


@router.get("", response_model=list[StudentTransportAssignmentOut])
def list_transport_assignments(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    route_id: Optional[uuid.UUID] = None,
    vehicle_id: Optional[uuid.UUID] = None,
) -> list[StudentTransportAssignmentOut]:
    q = select(StudentTransportAssignment).where(StudentTransportAssignment.school_id == school_id).order_by(
        StudentTransportAssignment.created_at.desc()
    )
    if route_id:
        q = q.where(StudentTransportAssignment.route_id == route_id)
    if vehicle_id:
        q = q.where(StudentTransportAssignment.vehicle_id == vehicle_id)
    rows = db.execute(q).scalars().all()
    return [_out(a) for a in rows]


@router.get("/{assignment_id}", response_model=StudentTransportAssignmentOut)
def get_transport_assignment(
    assignment_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> StudentTransportAssignmentOut:
    a = db.get(StudentTransportAssignment, assignment_id)
    if not a or a.school_id != school_id:
        raise not_found("Assignment not found")
    return _out(a)


@router.post("/assign", response_model=StudentTransportAssignmentOut, dependencies=[Depends(require_permission("transport_assignments:write"))])
def assign_student_to_transport(
    payload: AssignStudentTransportRequest, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> StudentTransportAssignmentOut:
    _ensure_student(db, school_id, payload.student_id)
    _ensure_route(db, school_id, payload.route_id)
    if payload.vehicle_id:
        _ensure_vehicle(db, school_id, payload.vehicle_id)
    if payload.stop_id:
        _ensure_stop(db, school_id, payload.stop_id, payload.route_id)
    now = datetime.now(timezone.utc)
    a = StudentTransportAssignment(
        school_id=school_id,
        student_id=payload.student_id,
        route_id=payload.route_id,
        stop_id=payload.stop_id,
        vehicle_id=payload.vehicle_id,
        status=payload.status,
        created_at=now,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return _out(a)


@router.put("/{assignment_id}", response_model=StudentTransportAssignmentOut, dependencies=[Depends(require_permission("transport_assignments:write"))])
def update_transport_assignment(
    assignment_id: uuid.UUID,
    payload: UpdateStudentTransportRequest,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StudentTransportAssignmentOut:
    a = db.get(StudentTransportAssignment, assignment_id)
    if not a or a.school_id != school_id:
        raise not_found("Assignment not found")
    next_route_id = payload.route_id or a.route_id
    _ensure_route(db, school_id, next_route_id)
    if payload.vehicle_id:
        _ensure_vehicle(db, school_id, payload.vehicle_id)
    next_stop_id = payload.stop_id if payload.stop_id is not None else a.stop_id
    if next_stop_id:
        _ensure_stop(db, school_id, next_stop_id, next_route_id)
    data = payload.model_dump(exclude_unset=True)
    for k, val in data.items():
        setattr(a, k, val)
    if payload.route_id is not None:
        a.route_id = payload.route_id
    if payload.vehicle_id is not None:
        a.vehicle_id = payload.vehicle_id
    if payload.stop_id is not None:
        a.stop_id = payload.stop_id
    if payload.status is not None:
        a.status = payload.status
    db.commit()
    return _out(a)


@router.delete("/{assignment_id}", dependencies=[Depends(require_permission("transport_assignments:write"))])
def remove_transport_assignment(
    assignment_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> dict[str, str]:
    a = db.get(StudentTransportAssignment, assignment_id)
    if not a or a.school_id != school_id:
        raise not_found("Assignment not found")
    db.delete(a)
    db.commit()
    return {"status": "ok"}


@router.get("/student/{student_id}", response_model=list[StudentTransportAssignmentOut])
def get_student_transport(
    student_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> list[StudentTransportAssignmentOut]:
    _ensure_student(db, school_id, student_id)
    rows = db.execute(
        select(StudentTransportAssignment)
        .where(StudentTransportAssignment.school_id == school_id, StudentTransportAssignment.student_id == student_id)
        .order_by(StudentTransportAssignment.created_at.desc())
    ).scalars().all()
    return [_out(a) for a in rows]

