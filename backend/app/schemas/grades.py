import uuid
from typing import Optional

from pydantic import BaseModel, Field


class GradeOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    name: str
    min_percentage: float
    max_percentage: float


class GradeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=32)
    min_percentage: float = Field(ge=0, le=100)
    max_percentage: float = Field(ge=0, le=100)


class GradeUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=32)
    min_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    max_percentage: Optional[float] = Field(default=None, ge=0, le=100)

