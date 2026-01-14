import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class TermOut(BaseModel):
    id: uuid.UUID
    academic_year_id: uuid.UUID
    name: str
    start_date: date
    end_date: date
    weightage: int
    is_active: bool


class TermCreate(BaseModel):
    academic_year_id: uuid.UUID
    name: str = Field(min_length=1, max_length=100)
    start_date: date
    end_date: date
    weightage: int = Field(default=0, ge=0, le=100)
    is_active: bool = True


class TermUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    weightage: Optional[int] = Field(default=None, ge=0, le=100)
    is_active: Optional[bool] = None

