"""Payroll management models."""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class PayrollCycle(Base):
    """Payroll cycle model for monthly salary processing."""
    
    __tablename__ = "payroll_cycles"
    
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    school_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("schools.id"), nullable=False, index=True)
    month: Mapped[int] = mapped_column(Integer, nullable=False, index=True)  # 1-12
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft", index=True)  # draft, processing, completed, paid
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    processed_by_user_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class Payslip(Base):
    """Payslip model for individual staff salary details."""
    
    __tablename__ = "payslips"
    
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    payroll_cycle_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("payroll_cycles.id"), nullable=False, index=True)
    staff_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("staff.id"), nullable=False, index=True)
    
    # Salary components
    basic_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    allowances: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)  # {housing: 5000, transport: 2000, medical: 1000}
    deductions: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)  # {tax: 1500, insurance: 500, loan: 1000}
    gross_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_deductions: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    net_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    
    # Payment details
    payment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False, default="bank_transfer")  # bank_transfer, cash, cheque
    payment_reference: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="generated", index=True)  # generated, sent, paid
    
    # Additional info
    working_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    present_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    leave_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
