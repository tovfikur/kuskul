"""Pydantic schemas for extended staff management (departments, designations, contracts)."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================================
# Department Schemas
# ============================================================================

class DepartmentBase(BaseModel):
    """Base schema for Department."""
    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=50)
    head_staff_id: Optional[UUID] = None
    budget_allocated: Optional[Decimal] = Field(None, ge=0)
    description: Optional[str] = None
    is_active: bool = True


class DepartmentCreate(DepartmentBase):
    """Schema for creating a Department."""
    pass


class DepartmentUpdate(BaseModel):
    """Schema for updating a Department."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    head_staff_id: Optional[UUID] = None
    budget_allocated: Optional[Decimal] = Field(None, ge=0)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentOut(DepartmentBase):
    """Schema for Department output."""
    id: UUID
    school_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# Designation Schemas
# ============================================================================

class DesignationBase(BaseModel):
    """Base schema for Designation."""
    title: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=50)
    level: int = Field(5, ge=1, le=10)  # 1=highest, 10=lowest
    department_id: Optional[UUID] = None
    min_salary: Optional[Decimal] = Field(None, ge=0)
    max_salary: Optional[Decimal] = Field(None, ge=0)
    description: Optional[str] = None
    is_active: bool = True


class DesignationCreate(DesignationBase):
    """Schema for creating a Designation."""
    pass


class DesignationUpdate(BaseModel):
    """Schema for updating a Designation."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    level: Optional[int] = Field(None, ge=1, le=10)
    department_id: Optional[UUID] = None
    min_salary: Optional[Decimal] = Field(None, ge=0)
    max_salary: Optional[Decimal] = Field(None, ge=0)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DesignationOut(DesignationBase):
    """Schema for Designation output."""
    id: UUID
    school_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# Staff Contract Schemas
# ============================================================================

class StaffContractBase(BaseModel):
    """Base schema for StaffContract."""
    contract_type: str = Field(..., pattern="^(permanent|temporary|contract|probation)$")
    start_date: datetime
    end_date: Optional[datetime] = None
    salary: Decimal = Field(..., ge=0)
    salary_currency: str = Field("BDT", max_length=10)
    allowances: dict = Field(default_factory=dict)
    deductions: dict = Field(default_factory=dict)
    working_hours_per_week: int = Field(40, ge=1, le=168)
    contract_document_url: Optional[str] = Field(None, max_length=500)
    terms_and_conditions: Optional[str] = None
    status: str = Field("active", pattern="^(active|expired|terminated)$")


class StaffContractCreate(StaffContractBase):
    """Schema for creating a StaffContract."""
    staff_id: UUID


class StaffContractUpdate(BaseModel):
    """Schema for updating a StaffContract."""
    contract_type: Optional[str] = Field(None, pattern="^(permanent|temporary|contract|probation)$")
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    salary: Optional[Decimal] = Field(None, ge=0)
    salary_currency: Optional[str] = Field(None, max_length=10)
    allowances: Optional[dict] = None
    deductions: Optional[dict] = None
    working_hours_per_week: Optional[int] = Field(None, ge=1, le=168)
    contract_document_url: Optional[str] = Field(None, max_length=500)
    terms_and_conditions: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(active|expired|terminated)$")


class StaffContractTerminate(BaseModel):
    """Schema for terminating a contract."""
    termination_reason: str = Field(..., min_length=1)


class StaffContractOut(StaffContractBase):
    """Schema for StaffContract output."""
    id: UUID
    staff_id: UUID
    termination_reason: Optional[str] = None
    terminated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
