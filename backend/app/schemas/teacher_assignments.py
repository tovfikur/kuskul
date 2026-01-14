import uuid
from typing import Optional

from pydantic import BaseModel, Field


class TeacherAssignmentOut(BaseModel):
    id: uuid.UUID
    academic_year_id: uuid.UUID
    staff_id: uuid.UUID
    section_id: uuid.UUID
    subject_id: uuid.UUID
    is_active: bool


class TeacherAssignmentCreate(BaseModel):
    academic_year_id: uuid.UUID
    staff_id: uuid.UUID
    section_id: uuid.UUID
    subject_id: uuid.UUID
    is_active: bool = True


class TeacherAssignmentUpdate(BaseModel):
    academic_year_id: Optional[uuid.UUID] = None
    staff_id: Optional[uuid.UUID] = None
    section_id: Optional[uuid.UUID] = None
    subject_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None


class BulkAssignRequest(BaseModel):
    items: list[TeacherAssignmentCreate] = Field(min_length=1)

