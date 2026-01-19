import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class StaffOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    full_name: str
    employee_id: Optional[str] = None
    designation: Optional[str]
    department: Optional[str]
    email: Optional[EmailStr]
    phone: Optional[str]
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    date_of_joining: Optional[date]
    status: str
    photo_url: Optional[str]


class StaffCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    employee_id: Optional[str] = Field(default=None, max_length=64)
    designation: Optional[str] = Field(default=None, max_length=100)
    department: Optional[str] = Field(default=None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=32)
    emergency_contact_name: Optional[str] = Field(default=None, max_length=200)
    emergency_contact_phone: Optional[str] = Field(default=None, max_length=32)
    emergency_contact_relation: Optional[str] = Field(default=None, max_length=64)
    date_of_joining: Optional[date] = None
    status: str = Field(default="active", max_length=32)


class StaffUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    employee_id: Optional[str] = Field(default=None, max_length=64)
    designation: Optional[str] = Field(default=None, max_length=100)
    department: Optional[str] = Field(default=None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=32)
    emergency_contact_name: Optional[str] = Field(default=None, max_length=200)
    emergency_contact_phone: Optional[str] = Field(default=None, max_length=32)
    emergency_contact_relation: Optional[str] = Field(default=None, max_length=64)
    date_of_joining: Optional[date] = None
    status: Optional[str] = Field(default=None, max_length=32)
    photo_url: Optional[str] = Field(default=None, max_length=500)


class StaffQualificationOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    staff_id: uuid.UUID
    title: str
    institution: Optional[str] = None
    issued_on: Optional[date] = None
    expires_on: Optional[date] = None
    credential_id: Optional[str] = None


class StaffQualificationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    institution: Optional[str] = Field(default=None, max_length=200)
    issued_on: Optional[date] = None
    expires_on: Optional[date] = None
    credential_id: Optional[str] = Field(default=None, max_length=100)


class StaffPerformanceRecordOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    staff_id: uuid.UUID
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    rating: Optional[int] = None
    summary: Optional[str] = None
    created_by_user_id: uuid.UUID


class StaffPerformanceRecordCreate(BaseModel):
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    summary: Optional[str] = Field(default=None, max_length=2000)
