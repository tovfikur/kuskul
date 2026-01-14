import uuid
from typing import Optional

from pydantic import BaseModel, Field


class ClassOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    name: str
    numeric_value: Optional[int]


class ClassCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    numeric_value: Optional[int] = None


class ClassUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    numeric_value: Optional[int] = None

