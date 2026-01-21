"""Enhanced leave management models for staff."""
from datetime import date, datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class LeaveType(Base):
    """Leave type configuration model."""
    
    __tablename__ = "leave_types"
    
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    school_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("schools.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    days_per_year: Mapped[int] = mapped_column(Integer, nullable=False)
    requires_approval: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    max_consecutive_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_paid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#1976d2")  # for calendar display
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class LeaveBalance(Base):
    """Staff leave balance tracking model."""
    
    __tablename__ = "leave_balances"
    
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    staff_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("staff.id"), nullable=False, index=True)
    leave_type_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("leave_types.id"), nullable=False, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    total_days: Mapped[int] = mapped_column(Integer, nullable=False)  # allocated for the year
    used_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pending_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # in pending requests
    carried_forward: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # from previous year
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class StaffLeaveRequest(Base):
    """Staff leave request model."""
    
    __tablename__ = "staff_leave_requests"
    
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    staff_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("staff.id"), nullable=False, index=True)
    leave_type_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("leave_types.id"), nullable=False, index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    end_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    total_days: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending", index=True)  # pending, approved, rejected, cancelled
    approved_by_user_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
