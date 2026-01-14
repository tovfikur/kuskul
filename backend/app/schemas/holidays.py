import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class HolidayOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    holiday_date: date
    name: str
    holiday_type: Optional[str]
    description: Optional[str]


class HolidayCreate(BaseModel):
    holiday_date: date
    name: str = Field(min_length=1, max_length=200)
    holiday_type: Optional[str] = Field(default=None, max_length=32)
    description: Optional[str] = Field(default=None, max_length=500)


class HolidayUpdate(BaseModel):
    holiday_date: Optional[date] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    holiday_type: Optional[str] = Field(default=None, max_length=32)
    description: Optional[str] = Field(default=None, max_length=500)

