import uuid
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class GuardianOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    full_name: str
    phone: Optional[str]
    email: Optional[EmailStr]
    occupation: Optional[str]
    id_number: Optional[str]
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]
    address: Optional[str]
    photo_url: Optional[str]


class GuardianCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=32)
    email: Optional[EmailStr] = None
    occupation: Optional[str] = Field(default=None, max_length=100)
    id_number: Optional[str] = Field(default=None, max_length=64)
    emergency_contact_name: Optional[str] = Field(default=None, max_length=200)
    emergency_contact_phone: Optional[str] = Field(default=None, max_length=32)
    address: Optional[str] = Field(default=None, max_length=500)


class GuardianUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=32)
    email: Optional[EmailStr] = None
    occupation: Optional[str] = Field(default=None, max_length=100)
    id_number: Optional[str] = Field(default=None, max_length=64)
    emergency_contact_name: Optional[str] = Field(default=None, max_length=200)
    emergency_contact_phone: Optional[str] = Field(default=None, max_length=32)
    address: Optional[str] = Field(default=None, max_length=500)
    photo_url: Optional[str] = Field(default=None, max_length=500)


class LinkGuardianRequest(BaseModel):
    guardian_id: uuid.UUID
    relation: str = Field(default="guardian", max_length=32)
    is_primary: bool = False
