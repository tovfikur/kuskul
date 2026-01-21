import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    academic_year_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("academic_years.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    exam_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    exam_type_code: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    exam_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="draft", nullable=False)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    weight_percentage: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    included_in_final_result: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    best_of_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    aggregation_method: Mapped[Optional[str]] = mapped_column(String(24), nullable=True)
    counts_for_gpa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    result_entry_deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    result_publish_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    locked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_result_editable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    instructions: Mapped[Optional[str]] = mapped_column(String(4000), nullable=True)
    created_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), index=True, nullable=True)
    updated_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), index=True, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

