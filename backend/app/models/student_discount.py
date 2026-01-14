import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class StudentDiscount(Base):
    __tablename__ = "student_discounts"

    student_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("students.id"), primary_key=True)
    discount_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("discounts.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

