"""Pydantic schemas for staff leave management."""
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================================
# Leave Type Schemas
# ============================================================================

class LeaveTypeBase(BaseModel):
    """Base schema for LeaveType."""
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    days_per_year: int = Field(..., ge=0)
    requires_approval: bool = True
    max_consecutive_days: Optional[int] = Field(None, ge=1)
    is_paid: bool = True
    color: str = Field("#1976d2", pattern="^#[0-9A-Fa-f]{6}$")
    description: Optional[str] = None
    is_active: bool = True


class LeaveTypeCreate(LeaveTypeBase):
    """Schema for creating a LeaveType."""
    pass


class LeaveTypeUpdate(BaseModel):
    """Schema for updating a LeaveType."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=20)
    days_per_year: Optional[int] = Field(None, ge=0)
    requires_approval: Optional[bool] = None
    max_consecutive_days: Optional[int] = Field(None, ge=1)
    is_paid: Optional[bool] = None
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    description: Optional[str] = None
    is_active: Optional[bool] = None


class LeaveTypeOut(LeaveTypeBase):
    """Schema for LeaveType output."""
    id: UUID
    school_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# Leave Balance Schemas
# ============================================================================

class LeaveBalanceBase(BaseModel):
    """Base schema for LeaveBalance."""
    year: int = Field(..., ge=2000, le=2100)
    total_days: int = Field(..., ge=0)
    used_days: int = Field(0, ge=0)
    pending_days: int = Field(0, ge=0)
    carried_forward: int = Field(0, ge=0)


class LeaveBalanceCreate(BaseModel):
    """Schema for creating a LeaveBalance."""
    staff_id: UUID
    leave_type_id: UUID
    year: int = Field(..., ge=2000, le=2100)
    total_days: int = Field(..., ge=0)
    carried_forward: int = Field(0, ge=0)


class LeaveBalanceUpdate(BaseModel):
    """Schema for updating a LeaveBalance (admin adjustment)."""
    total_days: Optional[int] = Field(None, ge=0)
    used_days: Optional[int] = Field(None, ge=0)
    pending_days: Optional[int] = Field(None, ge=0)
    carried_forward: Optional[int] = Field(None, ge=0)


class LeaveBalanceOut(LeaveBalanceBase):
    """Schema for LeaveBalance output."""
    id: UUID
    staff_id: UUID
    leave_type_id: UUID
    available_days: int  # Computed: total_days + carried_forward - used_days - pending_days
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LeaveBalanceWithType(LeaveBalanceOut):
    """Schema for LeaveBalance with leave type details."""
    leave_type: LeaveTypeOut


# ============================================================================
# Staff Leave Request Schemas
# ============================================================================

class StaffLeaveRequestBase(BaseModel):
    """Base schema for StaffLeaveRequest."""
    leave_type_id: UUID
    start_date: date
    end_date: date
    reason: str = Field(..., min_length=1)


class StaffLeaveRequestCreate(StaffLeaveRequestBase):
    """Schema for creating a StaffLeaveRequest."""
    staff_id: UUID


class StaffLeaveRequestUpdate(BaseModel):
    """Schema for updating a StaffLeaveRequest (only if pending)."""
    leave_type_id: Optional[UUID] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reason: Optional[str] = Field(None, min_length=1)


class StaffLeaveRequestApprove(BaseModel):
    """Schema for approving a leave request."""
    pass  # No additional fields needed


class StaffLeaveRequestReject(BaseModel):
    """Schema for rejecting a leave request."""
    rejection_reason: str = Field(..., min_length=1)


class StaffLeaveRequestOut(StaffLeaveRequestBase):
    """Schema for StaffLeaveRequest output."""
    id: UUID
    staff_id: UUID
    total_days: int
    status: str  # pending, approved, rejected, cancelled
    approved_by_user_id: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StaffLeaveRequestWithDetails(StaffLeaveRequestOut):
    """Schema for StaffLeaveRequest with staff and leave type details."""
    staff_name: str
    leave_type_name: str
    leave_type_color: str


# ============================================================================
# Bulk Operations
# ============================================================================

class LeaveBalanceInitialize(BaseModel):
    """Schema for initializing leave balances for a year."""
    year: int = Field(..., ge=2000, le=2100)
    carry_forward_percentage: int = Field(0, ge=0, le=100)


class LeaveCalendarEntry(BaseModel):
    """Schema for leave calendar entry."""
    date: date
    staff_id: UUID
    staff_name: str
    leave_type_id: UUID
    leave_type_name: str
    leave_type_color: str
    request_id: UUID
