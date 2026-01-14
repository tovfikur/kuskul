import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class FeeStructureOut(BaseModel):
    id: uuid.UUID
    academic_year_id: uuid.UUID
    class_id: uuid.UUID
    name: str
    amount: int
    due_date: Optional[date]


class FeeStructureCreate(BaseModel):
    academic_year_id: uuid.UUID
    class_id: uuid.UUID
    name: str = Field(min_length=1, max_length=150)
    amount: int = Field(ge=0, le=10_000_000)
    due_date: Optional[date] = None


class FeeStructureUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    amount: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    due_date: Optional[date] = None


class FeeStructureBulkCreate(BaseModel):
    items: list[FeeStructureCreate] = Field(min_length=1)


class FeePaymentOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    academic_year_id: uuid.UUID
    payment_date: date
    amount: int
    payment_method: Optional[str]
    reference: Optional[str]
    is_refund: bool


class FeeCollect(BaseModel):
    student_id: uuid.UUID
    academic_year_id: uuid.UUID
    payment_date: date
    amount: int = Field(ge=1, le=10_000_000)
    payment_method: Optional[str] = Field(default=None, max_length=32)
    reference: Optional[str] = Field(default=None, max_length=128)


class FeePaymentUpdate(BaseModel):
    payment_date: Optional[date] = None
    amount: Optional[int] = Field(default=None, ge=1, le=10_000_000)
    payment_method: Optional[str] = Field(default=None, max_length=32)
    reference: Optional[str] = Field(default=None, max_length=128)


class FeeDueOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    academic_year_id: uuid.UUID
    total_fee: int
    discount_amount: int
    paid_amount: int
    due_amount: int
    status: str
    last_calculated_date: date

