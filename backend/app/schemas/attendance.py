import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class StudentAttendanceOut(BaseModel):
    id: uuid.UUID
    attendance_date: date
    student_id: uuid.UUID
    class_id: Optional[uuid.UUID]
    section_id: Optional[uuid.UUID]
    status: str


class StaffAttendanceOut(BaseModel):
    id: uuid.UUID
    attendance_date: date
    staff_id: uuid.UUID
    status: str


class StudentAttendanceMarkItem(BaseModel):
    student_id: uuid.UUID
    status: str = Field(default="present", max_length=32)


class MarkStudentAttendanceRequest(BaseModel):
    attendance_date: date
    class_id: Optional[uuid.UUID] = None
    section_id: Optional[uuid.UUID] = None
    items: list[StudentAttendanceMarkItem] = Field(min_length=1)


class StaffAttendanceMarkItem(BaseModel):
    staff_id: uuid.UUID
    status: str = Field(default="present", max_length=32)


class MarkStaffAttendanceRequest(BaseModel):
    attendance_date: date
    items: list[StaffAttendanceMarkItem] = Field(min_length=1)
