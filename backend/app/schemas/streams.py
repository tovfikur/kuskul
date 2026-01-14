import uuid
from typing import Optional

from pydantic import BaseModel, Field


class StreamOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    name: str
    is_active: bool


class StreamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    is_active: bool = True


class StreamUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    is_active: Optional[bool] = None

