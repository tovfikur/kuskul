"""Pydantic schemas for payroll management."""
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================================
# Payroll Cycle Schemas
# ============================================================================

class PayrollCycleBase(BaseModel):
    """Base schema for PayrollCycle."""
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    notes: Optional[str] = None


class PayrollCycleCreate(PayrollCycleBase):
    """Schema for creating a PayrollCycle."""
    pass


class PayrollCycleUpdate(BaseModel):
    """Schema for updating a PayrollCycle."""
    notes: Optional[str] = None


class PayrollCycleOut(PayrollCycleBase):
    """Schema for PayrollCycle output."""
    id: UUID
    school_id: UUID
    status: str  # draft, processing, completed, paid
    total_amount: Decimal
    processed_by_user_id: Optional[UUID] = None
    processed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PayrollCycleWithStats(PayrollCycleOut):
    """Schema for PayrollCycle with statistics."""
    payslip_count: int
    paid_count: int
    pending_count: int


# ============================================================================
# Payslip Schemas
# ============================================================================

class PayslipBase(BaseModel):
    """Base schema for Payslip."""
    basic_salary: Decimal = Field(..., ge=0)
    allowances: Dict[str, Decimal] = Field(default_factory=dict)  # {housing: 5000, transport: 2000}
    deductions: Dict[str, Decimal] = Field(default_factory=dict)  # {tax: 1500, insurance: 500}
    working_days: int = Field(0, ge=0)
    present_days: int = Field(0, ge=0)
    leave_days: int = Field(0, ge=0)
    payment_method: str = Field("bank_transfer", pattern="^(bank_transfer|cash|cheque)$")
    payment_reference: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None


class PayslipCreate(PayslipBase):
    """Schema for creating a Payslip."""
    payroll_cycle_id: UUID
    staff_id: UUID


class PayslipUpdate(BaseModel):
    """Schema for updating a Payslip (only if not paid)."""
    basic_salary: Optional[Decimal] = Field(None, ge=0)
    allowances: Optional[Dict[str, Decimal]] = None
    deductions: Optional[Dict[str, Decimal]] = None
    working_days: Optional[int] = Field(None, ge=0)
    present_days: Optional[int] = Field(None, ge=0)
    leave_days: Optional[int] = Field(None, ge=0)
    payment_method: Optional[str] = Field(None, pattern="^(bank_transfer|cash|cheque)$")
    payment_reference: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None


class PayslipMarkPaid(BaseModel):
    """Schema for marking a payslip as paid."""
    payment_date: date
    payment_reference: Optional[str] = Field(None, max_length=200)


class PayslipOut(PayslipBase):
    """Schema for Payslip output."""
    id: UUID
    payroll_cycle_id: UUID
    staff_id: UUID
    gross_salary: Decimal
    total_deductions: Decimal
    net_salary: Decimal
    payment_date: Optional[date] = None
    status: str  # generated, sent, paid
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PayslipWithDetails(PayslipOut):
    """Schema for Payslip with staff details."""
    staff_name: str
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    month: int
    year: int


# ============================================================================
# Payroll Processing
# ============================================================================

class PayrollProcessRequest(BaseModel):
    """Schema for processing payroll."""
    auto_generate_payslips: bool = True
    include_inactive_staff: bool = False


class PayrollSendPayslipsRequest(BaseModel):
    """Schema for sending payslips via email."""
    staff_ids: Optional[list[UUID]] = None  # If None, send to all


class PayrollSummary(BaseModel):
    """Schema for payroll summary."""
    cycle_id: UUID
    month: int
    year: int
    total_staff: int
    total_gross: Decimal
    total_deductions: Decimal
    total_net: Decimal
    department_breakdown: Dict[str, Decimal]  # {department_name: total_amount}


# ============================================================================
# Allowances & Deductions Configuration
# ============================================================================

class AllowanceConfig(BaseModel):
    """Schema for allowance configuration."""
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    default_amount: Optional[Decimal] = Field(None, ge=0)
    is_percentage: bool = False  # If true, default_amount is percentage of basic
    is_active: bool = True


class DeductionConfig(BaseModel):
    """Schema for deduction configuration."""
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    default_amount: Optional[Decimal] = Field(None, ge=0)
    is_percentage: bool = False  # If true, default_amount is percentage of basic
    is_mandatory: bool = False
    is_active: bool = True
