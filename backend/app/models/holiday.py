import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Holiday(Base):
    __tablename__ = "holidays"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    holiday_date: Mapped[date] = mapped_column(Date, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    holiday_type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

