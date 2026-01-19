import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class TeacherAssignment(Base):
    __tablename__ = "teacher_assignments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    academic_year_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("academic_years.id"), index=True, nullable=False)
    staff_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("staff.id"), index=True, nullable=False)
    section_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("sections.id"), index=True, nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("subjects.id"), index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class StudentAttendance(Base):
    __tablename__ = "student_attendance"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attendance_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("students.id"), index=True, nullable=False)
    section_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("sections.id"), index=True, nullable=True)
    class_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("classes.id"), index=True, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="present")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class StaffAttendance(Base):
    __tablename__ = "staff_attendance"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attendance_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    staff_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("staff.id"), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="present")
    check_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    method: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    device_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
