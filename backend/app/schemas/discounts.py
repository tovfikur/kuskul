import uuid
from typing import Optional

from pydantic import BaseModel, Field


class DiscountOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    name: str
    discount_type: str
    value: int
    description: Optional[str]


class DiscountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    discount_type: str = Field(default="percent", max_length=16)
    value: int = Field(ge=0, le=10_000_000)
    description: Optional[str] = Field(default=None, max_length=500)


class DiscountUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    discount_type: Optional[str] = Field(default=None, max_length=16)
    value: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    description: Optional[str] = Field(default=None, max_length=500)


class ApplyDiscountRequest(BaseModel):
    student_id: uuid.UUID
    discount_id: uuid.UUID

