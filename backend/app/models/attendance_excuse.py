import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AttendanceExcuse(Base):
    __tablename__ = "attendance_excuses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("students.id"), index=True, nullable=False)
    guardian_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("guardians.id"), index=True, nullable=False)

    attendance_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    reason: Mapped[str] = mapped_column(String(1000), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")

    decided_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), index=True, nullable=True)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

