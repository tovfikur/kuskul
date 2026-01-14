import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AppointmentRequest(Base):
    __tablename__ = "appointment_requests"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    guardian_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("guardians.id"), index=True, nullable=False)
    student_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("students.id"), index=True, nullable=True)
    staff_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("staff.id"), index=True, nullable=True)

    requested_for: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reason: Mapped[str] = mapped_column(String(1000), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    response_note: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

