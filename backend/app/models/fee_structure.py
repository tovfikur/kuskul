import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class FeeStructure(Base):
    __tablename__ = "fee_structures"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    academic_year_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("academic_years.id"), index=True, nullable=False)
    class_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("classes.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

