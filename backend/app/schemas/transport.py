import uuid
from datetime import time
from typing import Optional

from pydantic import BaseModel, Field


class TransportVehicleOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    name: str
    registration_no: Optional[str]
    capacity: int
    driver_name: Optional[str]
    status: str


class TransportVehicleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    registration_no: Optional[str] = Field(default=None, max_length=64)
    capacity: int = Field(default=0, ge=0, le=100000)
    driver_name: Optional[str] = Field(default=None, max_length=150)
    status: str = Field(default="active", max_length=32)


class TransportVehicleUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    registration_no: Optional[str] = Field(default=None, max_length=64)
    capacity: Optional[int] = Field(default=None, ge=0, le=100000)
    driver_name: Optional[str] = Field(default=None, max_length=150)
    status: Optional[str] = Field(default=None, max_length=32)


class TransportRouteOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    name: str
    code: Optional[str]
    description: Optional[str]
    is_active: bool


class TransportRouteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    code: Optional[str] = Field(default=None, max_length=50)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = True


class TransportRouteUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    code: Optional[str] = Field(default=None, max_length=50)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: Optional[bool] = None


class TransportRouteStopOut(BaseModel):
    id: uuid.UUID
    route_id: uuid.UUID
    name: str
    sequence: int
    pickup_time: Optional[time]
    drop_time: Optional[time]


class TransportRouteStopCreate(BaseModel):
    route_id: uuid.UUID
    name: str = Field(min_length=1, max_length=150)
    sequence: int = Field(default=1, ge=1, le=100000)
    pickup_time: Optional[time] = None
    drop_time: Optional[time] = None


class TransportRouteStopUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    sequence: Optional[int] = Field(default=None, ge=1, le=100000)
    pickup_time: Optional[time] = None
    drop_time: Optional[time] = None


class StudentTransportAssignmentOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    student_id: uuid.UUID
    route_id: uuid.UUID
    stop_id: Optional[uuid.UUID]
    vehicle_id: Optional[uuid.UUID]
    status: str


class AssignStudentTransportRequest(BaseModel):
    student_id: uuid.UUID
    route_id: uuid.UUID
    vehicle_id: Optional[uuid.UUID] = None
    stop_id: Optional[uuid.UUID] = None
    status: str = Field(default="active", max_length=32)


class UpdateStudentTransportRequest(BaseModel):
    route_id: Optional[uuid.UUID] = None
    vehicle_id: Optional[uuid.UUID] = None
    stop_id: Optional[uuid.UUID] = None
    status: Optional[str] = Field(default=None, max_length=32)

