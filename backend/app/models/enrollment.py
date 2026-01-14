import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Enrollment(Base):
    __tablename__ = "enrollments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("students.id"), index=True, nullable=False)
    academic_year_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("academic_years.id"), index=True, nullable=False)
    class_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("classes.id"), index=True, nullable=False)
    section_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("sections.id"), index=True, nullable=True)
    roll_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

