import uuid
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class EnrollmentOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    academic_year_id: uuid.UUID
    class_id: uuid.UUID
    section_id: Optional[uuid.UUID]
    roll_number: Optional[str]
    status: str


class EnrollmentCreate(BaseModel):
    student_id: uuid.UUID
    academic_year_id: uuid.UUID
    class_id: uuid.UUID
    section_id: Optional[uuid.UUID] = None
    roll_number: Optional[str] = Field(default=None, max_length=32)
    status: str = Field(default="active", max_length=32)

    @field_validator("roll_number", mode="before")
    @classmethod
    def coerce_roll_number(cls, value: object) -> Optional[str]:
        if value is None:
            return None
        text = str(value).strip()
        return text or None


class EnrollmentUpdate(BaseModel):
    academic_year_id: Optional[uuid.UUID] = None
    class_id: Optional[uuid.UUID] = None
    section_id: Optional[uuid.UUID] = None
    roll_number: Optional[str] = Field(default=None, max_length=32)
    status: Optional[str] = Field(default=None, max_length=32)

    @field_validator("roll_number", mode="before")
    @classmethod
    def coerce_roll_number(cls, value: object) -> Optional[str]:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

