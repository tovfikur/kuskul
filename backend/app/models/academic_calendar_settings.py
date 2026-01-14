import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AcademicCalendarSettings(Base):
    __tablename__ = "academic_calendar_settings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("academic_years.id"), index=True, nullable=False, unique=True
    )
    working_days_mask: Mapped[int] = mapped_column(Integer, default=31, nullable=False)
    shift: Mapped[str] = mapped_column(String(32), default="morning", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

