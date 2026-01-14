import uuid
from datetime import date, datetime, time
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Time, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ExamSchedule(Base):
    __tablename__ = "exam_schedules"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("exams.id"), index=True, nullable=False)
    class_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("classes.id"), index=True, nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("subjects.id"), index=True, nullable=False)

    exam_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    end_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    room: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    max_marks: Mapped[int] = mapped_column(Integer, default=100, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

