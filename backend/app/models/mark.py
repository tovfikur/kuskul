import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Mark(Base):
    __tablename__ = "marks"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_schedule_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("exam_schedules.id"), index=True, nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("students.id"), index=True, nullable=False)
    marks_obtained: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_absent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

