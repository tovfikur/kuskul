import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class LeaveOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    requester_user_id: uuid.UUID
    user_type: str
    staff_id: Optional[uuid.UUID]
    student_id: Optional[uuid.UUID]
    start_date: date
    end_date: date
    reason: Optional[str]
    status: str


class LeaveApply(BaseModel):
    user_type: str = Field(default="staff", max_length=32)
    staff_id: Optional[uuid.UUID] = None
    student_id: Optional[uuid.UUID] = None
    start_date: date
    end_date: date
    reason: Optional[str] = Field(default=None, max_length=1000)


class LeaveUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reason: Optional[str] = Field(default=None, max_length=1000)

