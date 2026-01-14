import uuid
from datetime import date, time
from typing import Optional

from pydantic import BaseModel, Field


class ExamScheduleOut(BaseModel):
    id: uuid.UUID
    exam_id: uuid.UUID
    class_id: uuid.UUID
    subject_id: uuid.UUID
    exam_date: date
    start_time: Optional[time]
    end_time: Optional[time]
    room: Optional[str]
    max_marks: int


class ExamScheduleCreate(BaseModel):
    exam_id: uuid.UUID
    class_id: uuid.UUID
    subject_id: uuid.UUID
    exam_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    room: Optional[str] = Field(default=None, max_length=50)
    max_marks: int = Field(default=100, ge=1, le=1000)


class ExamScheduleUpdate(BaseModel):
    exam_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    room: Optional[str] = Field(default=None, max_length=50)
    max_marks: Optional[int] = Field(default=None, ge=1, le=1000)


class ExamScheduleBulkCreate(BaseModel):
    items: list[ExamScheduleCreate] = Field(min_length=1)

