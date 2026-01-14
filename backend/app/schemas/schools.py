import uuid
from pydantic import BaseModel, Field
from typing import Optional


class SchoolCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    code: str = Field(min_length=2, max_length=64)


class SchoolUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    code: Optional[str] = Field(default=None, min_length=2, max_length=64)
    is_active: Optional[bool] = None


class SchoolOut(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    is_active: bool
