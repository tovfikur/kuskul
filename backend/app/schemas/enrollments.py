import uuid
from typing import Optional

from pydantic import BaseModel, Field


class EnrollmentOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    academic_year_id: uuid.UUID
    class_id: uuid.UUID
    section_id: Optional[uuid.UUID]
    roll_number: Optional[int]
    status: str


class EnrollmentCreate(BaseModel):
    student_id: uuid.UUID
    academic_year_id: uuid.UUID
    class_id: uuid.UUID
    section_id: Optional[uuid.UUID] = None
    roll_number: Optional[int] = Field(default=None, ge=1, le=10000)
    status: str = Field(default="active", max_length=32)


class EnrollmentUpdate(BaseModel):
    academic_year_id: Optional[uuid.UUID] = None
    class_id: Optional[uuid.UUID] = None
    section_id: Optional[uuid.UUID] = None
    roll_number: Optional[int] = Field(default=None, ge=1, le=10000)
    status: Optional[str] = Field(default=None, max_length=32)

