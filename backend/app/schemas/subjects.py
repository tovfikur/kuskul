import uuid
from typing import Optional

from pydantic import BaseModel, Field


class SubjectOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    name: str
    code: Optional[str]
    subject_type: str
    credits: Optional[int] = None
    max_marks: Optional[int] = None
    group_id: Optional[uuid.UUID] = None
    stream_id: Optional[uuid.UUID] = None
    is_active: bool


class SubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    code: Optional[str] = Field(default=None, max_length=64)
    subject_type: str = Field(default="theory", max_length=32)
    credits: Optional[int] = Field(default=None, ge=0, le=100)
    max_marks: Optional[int] = Field(default=None, ge=0, le=1000)
    group_id: Optional[uuid.UUID] = None
    stream_id: Optional[uuid.UUID] = None
    is_active: bool = True


class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    code: Optional[str] = Field(default=None, max_length=64)
    subject_type: Optional[str] = Field(default=None, max_length=32)
    credits: Optional[int] = Field(default=None, ge=0, le=100)
    max_marks: Optional[int] = Field(default=None, ge=0, le=1000)
    group_id: Optional[uuid.UUID] = None
    stream_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None


class AssignSubjectToClassRequest(BaseModel):
    class_id: uuid.UUID
