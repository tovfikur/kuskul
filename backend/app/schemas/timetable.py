import uuid
from typing import Optional

from pydantic import BaseModel, Field


class TimetableEntryOut(BaseModel):
    id: uuid.UUID
    academic_year_id: uuid.UUID
    section_id: uuid.UUID
    staff_id: Optional[uuid.UUID]
    subject_id: Optional[uuid.UUID]
    time_slot_id: uuid.UUID
    day_of_week: int
    room: Optional[str]


class TimetableEntryCreate(BaseModel):
    academic_year_id: uuid.UUID
    section_id: uuid.UUID
    staff_id: Optional[uuid.UUID] = None
    subject_id: Optional[uuid.UUID] = None
    time_slot_id: uuid.UUID
    day_of_week: int = Field(ge=0, le=6)
    room: Optional[str] = Field(default=None, max_length=50)


class TimetableEntryUpdate(BaseModel):
    staff_id: Optional[uuid.UUID] = None
    subject_id: Optional[uuid.UUID] = None
    time_slot_id: Optional[uuid.UUID] = None
    day_of_week: Optional[int] = Field(default=None, ge=0, le=6)
    room: Optional[str] = Field(default=None, max_length=50)


class TimetableBulkCreate(BaseModel):
    items: list[TimetableEntryCreate] = Field(min_length=1)

