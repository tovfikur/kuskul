import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class TimetableEntry(Base):
    __tablename__ = "timetable_entries"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    academic_year_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("academic_years.id"), index=True, nullable=False)
    section_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("sections.id"), index=True, nullable=False)
    staff_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("staff.id"), index=True, nullable=True)
    subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("subjects.id"), index=True, nullable=True)
    time_slot_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("time_slots.id"), index=True, nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    room: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

