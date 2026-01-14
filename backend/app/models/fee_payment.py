import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class FeePayment(Base):
    __tablename__ = "fee_payments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("students.id"), index=True, nullable=False)
    academic_year_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("academic_years.id"), index=True, nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    payment_method: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    reference: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    is_refund: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

