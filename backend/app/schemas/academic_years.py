import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class AcademicYearOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    name: str
    start_date: date
    end_date: date
    is_current: bool


class AcademicYearCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    start_date: date
    end_date: date
    is_current: bool = False


class AcademicYearUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    start_date: Optional[date] = None
    end_date: Optional[date] = None

