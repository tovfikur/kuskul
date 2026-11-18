from __future__ import annotations

import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class PublicGuardianInput(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    phone: str = Field(min_length=3, max_length=32)
    email: Optional[EmailStr] = None
    occupation: Optional[str] = Field(default=None, max_length=100)
    id_number: Optional[str] = Field(default=None, max_length=64)

    @field_validator("full_name", "phone", "occupation", "id_number", mode="before")
    @classmethod
    def strip_text(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("email", mode="before")
    @classmethod
    def empty_email(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value


class PublicAdmissionSubmit(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    gender: str = Field(min_length=1, max_length=16)
    date_of_birth: date
    nationality: Optional[str] = Field(default=None, max_length=64)
    religion: Optional[str] = Field(default=None, max_length=64)
    blood_group: Optional[str] = Field(default=None, max_length=8)
    present_address: Optional[str] = Field(default=None, max_length=500)
    city: Optional[str] = Field(default=None, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=20)
    emergency_contact_name: Optional[str] = Field(default=None, max_length=200)
    emergency_contact_phone: Optional[str] = Field(default=None, max_length=32)
    class_id: uuid.UUID
    section_id: uuid.UUID
    medium: Optional[str] = Field(default=None, max_length=32)
    shift: Optional[str] = Field(default=None, max_length=32)
    previous_school_name: Optional[str] = Field(default=None, max_length=200)
    previous_class: Optional[str] = Field(default=None, max_length=64)
    father: PublicGuardianInput
    mother: Optional[PublicGuardianInput] = None
    declaration_accepted: bool
    website: Optional[str] = Field(default=None, max_length=200)

    @field_validator(
        "first_name",
        "last_name",
        "gender",
        "nationality",
        "religion",
        "blood_group",
        "present_address",
        "city",
        "postal_code",
        "emergency_contact_name",
        "emergency_contact_phone",
        "medium",
        "shift",
        "previous_school_name",
        "previous_class",
        "website",
        mode="before",
    )
    @classmethod
    def strip_optional_text(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("declaration_accepted")
    @classmethod
    def declaration_required(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Declaration must be accepted")
        return value

    @field_validator("date_of_birth")
    @classmethod
    def birth_date_not_future(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return value


class PublicSectionOut(BaseModel):
    id: uuid.UUID
    name: str


class PublicClassOut(BaseModel):
    id: uuid.UUID
    name: str
    numeric_value: Optional[int] = None
    sections: list[PublicSectionOut]


class PublicAcademicYearOut(BaseModel):
    id: uuid.UUID
    name: str
    start_date: date
    end_date: date


class PublicSchoolOut(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    logo_url: Optional[str] = None


class PublicAdmissionConfigOut(BaseModel):
    school: PublicSchoolOut
    academic_year: Optional[PublicAcademicYearOut]
    classes: list[PublicClassOut]
    admission_open: bool


class PublicAdmissionResult(BaseModel):
    reference: str
    message: str


class AdmissionFormLinkOut(BaseModel):
    token: str
    enabled: bool


class AdmissionFormStateUpdate(BaseModel):
    enabled: bool
