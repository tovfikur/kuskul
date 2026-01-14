import uuid
from typing import Optional

from pydantic import BaseModel, Field


class MarkOut(BaseModel):
    id: uuid.UUID
    exam_schedule_id: uuid.UUID
    student_id: uuid.UUID
    marks_obtained: Optional[int]
    is_absent: bool
    remarks: Optional[str]


class MarkEnterItem(BaseModel):
    student_id: uuid.UUID
    marks_obtained: Optional[int] = Field(default=None, ge=0, le=1000)
    is_absent: bool = False
    remarks: Optional[str] = Field(default=None, max_length=255)


class EnterMarksRequest(BaseModel):
    exam_schedule_id: uuid.UUID
    items: list[MarkEnterItem] = Field(min_length=1)

