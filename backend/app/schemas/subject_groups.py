import uuid
from typing import Optional

from pydantic import BaseModel, Field


class SubjectGroupOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    name: str
    class_id: Optional[uuid.UUID] = None
    stream_id: Optional[uuid.UUID] = None
    is_optional: bool


class SubjectGroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    class_id: Optional[uuid.UUID] = None
    stream_id: Optional[uuid.UUID] = None
    is_optional: bool = False


class SubjectGroupUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    class_id: Optional[uuid.UUID] = None
    stream_id: Optional[uuid.UUID] = None
    is_optional: Optional[bool] = None

