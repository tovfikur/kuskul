import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class ParentProfileOut(BaseModel):
    user_id: uuid.UUID
    guardian_id: uuid.UUID
    full_name: str
    phone: Optional[str]
    email: Optional[EmailStr]
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]
    address: Optional[str]
    photo_url: Optional[str]


class ParentProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=32)
    email: Optional[EmailStr] = None
    emergency_contact_name: Optional[str] = Field(default=None, max_length=200)
    emergency_contact_phone: Optional[str] = Field(default=None, max_length=32)
    address: Optional[str] = Field(default=None, max_length=500)
    photo_url: Optional[str] = Field(default=None, max_length=500)


class ParentLinkGuardianRequest(BaseModel):
    guardian_id: uuid.UUID
    phone: Optional[str] = Field(default=None, max_length=32)
    email: Optional[EmailStr] = None


class UserPreferenceOut(BaseModel):
    language: Optional[str]
    notify_sms: bool
    notify_email: bool
    notify_push: bool


class UserPreferenceUpdate(BaseModel):
    language: Optional[str] = Field(default=None, max_length=16)
    notify_sms: Optional[bool] = None
    notify_email: Optional[bool] = None
    notify_push: Optional[bool] = None


class AttendanceExcuseCreate(BaseModel):
    attendance_date: date
    reason: str = Field(min_length=1, max_length=1000)


class AttendanceExcuseOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    attendance_date: date
    reason: str
    status: str
    decided_at: Optional[datetime]


class AppointmentRequestCreate(BaseModel):
    student_id: Optional[uuid.UUID] = None
    staff_id: Optional[uuid.UUID] = None
    requested_for: Optional[datetime] = None
    reason: str = Field(min_length=1, max_length=1000)


class AppointmentRequestOut(BaseModel):
    id: uuid.UUID
    student_id: Optional[uuid.UUID]
    staff_id: Optional[uuid.UUID]
    requested_for: Optional[datetime]
    reason: str
    status: str
    response_note: Optional[str]
    updated_at: datetime


class DisciplineRecordOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    category: Optional[str]
    note: str
    is_positive: bool
    requires_ack: bool
    acknowledged_at: Optional[datetime]
    created_at: datetime


class DisciplineRecordCreate(BaseModel):
    student_id: uuid.UUID
    category: Optional[str] = Field(default=None, max_length=64)
    note: str = Field(min_length=1, max_length=2000)
    is_positive: bool = False
    requires_ack: bool = False


class AppointmentDecisionRequest(BaseModel):
    status: str = Field(min_length=2, max_length=32)
    response_note: Optional[str] = Field(default=None, max_length=1000)
