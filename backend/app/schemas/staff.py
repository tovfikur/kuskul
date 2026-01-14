import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class StaffOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    full_name: str
    designation: Optional[str]
    department: Optional[str]
    email: Optional[EmailStr]
    phone: Optional[str]
    date_of_joining: Optional[date]
    status: str
    photo_url: Optional[str]


class StaffCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    designation: Optional[str] = Field(default=None, max_length=100)
    department: Optional[str] = Field(default=None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=32)
    date_of_joining: Optional[date] = None
    status: str = Field(default="active", max_length=32)


class StaffUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    designation: Optional[str] = Field(default=None, max_length=100)
    department: Optional[str] = Field(default=None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=32)
    date_of_joining: Optional[date] = None
    status: Optional[str] = Field(default=None, max_length=32)
    photo_url: Optional[str] = Field(default=None, max_length=500)

