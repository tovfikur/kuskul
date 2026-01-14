import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class FeeDue(Base):
    __tablename__ = "fee_dues"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("students.id"), index=True, nullable=False)
    academic_year_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("academic_years.id"), index=True, nullable=False)
    total_fee: Mapped[int] = mapped_column(Integer, nullable=False)
    discount_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    paid_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    due_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="due")
    last_calculated_date: Mapped[date] = mapped_column(Date, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

