import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class EventOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    event_type: Optional[str]
    title: str
    description: Optional[str]
    start_date: date
    end_date: date
    location: Optional[str]
    announced_by: Optional[str]
    is_all_day: bool


class EventCreate(BaseModel):
    event_type: Optional[str] = Field(default=None, max_length=32)
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    start_date: date
    end_date: date
    location: Optional[str] = Field(default=None, max_length=200)
    announced_by: Optional[str] = Field(default=None, max_length=200)
    is_all_day: bool = True


class EventUpdate(BaseModel):
    event_type: Optional[str] = Field(default=None, max_length=32)
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    location: Optional[str] = Field(default=None, max_length=200)
    announced_by: Optional[str] = Field(default=None, max_length=200)
    is_all_day: Optional[bool] = None
