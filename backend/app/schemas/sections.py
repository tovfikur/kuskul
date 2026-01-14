import uuid
from typing import Optional

from pydantic import BaseModel, Field


class SectionOut(BaseModel):
    id: uuid.UUID
    class_id: uuid.UUID
    name: str
    capacity: int
    room_number: Optional[str]


class SectionCreate(BaseModel):
    class_id: uuid.UUID
    name: str = Field(min_length=1, max_length=50)
    capacity: int = Field(default=40, ge=1, le=500)
    room_number: Optional[str] = Field(default=None, max_length=50)


class SectionUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    capacity: Optional[int] = Field(default=None, ge=1, le=500)
    room_number: Optional[str] = Field(default=None, max_length=50)

