import uuid
from typing import Optional

from pydantic import BaseModel, Field


class AcademicCalendarSettingsOut(BaseModel):
    id: uuid.UUID
    academic_year_id: uuid.UUID
    working_days_mask: int
    shift: str


class AcademicCalendarSettingsUpsert(BaseModel):
    working_days_mask: int = Field(ge=0, le=127)
    shift: str = Field(default="morning", max_length=32)

