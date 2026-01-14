import uuid
from typing import Optional

from pydantic import BaseModel, Field


class SubjectOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    name: str
    code: Optional[str]


class SubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    code: Optional[str] = Field(default=None, max_length=64)


class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    code: Optional[str] = Field(default=None, max_length=64)


class AssignSubjectToClassRequest(BaseModel):
    class_id: uuid.UUID

