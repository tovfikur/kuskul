import uuid
from datetime import time
from typing import Optional

from pydantic import BaseModel, Field


class TimeSlotOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    name: str
    start_time: time
    end_time: time
    slot_type: str
    shift: str
    is_active: bool


class TimeSlotCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    start_time: time
    end_time: time
    slot_type: str = Field(default="class", max_length=32)
    shift: str = Field(default="morning", max_length=32)
    is_active: bool = True


class TimeSlotUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    slot_type: Optional[str] = Field(default=None, max_length=32)
    shift: Optional[str] = Field(default=None, max_length=32)
    is_active: Optional[bool] = None

