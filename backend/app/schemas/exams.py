import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class ExamOut(BaseModel):
    id: uuid.UUID
    academic_year_id: uuid.UUID
    name: str
    exam_type: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    is_published: bool


class ExamCreate(BaseModel):
    academic_year_id: uuid.UUID
    name: str = Field(min_length=1, max_length=150)
    exam_type: Optional[str] = Field(default=None, max_length=64)
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ExamUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    exam_type: Optional[str] = Field(default=None, max_length=64)
    start_date: Optional[date] = None
    end_date: Optional[date] = None

