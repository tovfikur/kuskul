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
    is_active: bool


class TimeSlotCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    start_time: time
    end_time: time
    is_active: bool = True


class TimeSlotUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_active: Optional[bool] = None

