import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class HikvisionDevice(Base):
    """A school-owned HikCentral Connect / Hik-Connect attendance source.

    The device performs biometric matching.  KusKul stores only the device
    person code and resulting event metadata, never a fingerprint template.
    """

    __tablename__ = "hikvision_devices"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    external_device_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False, default="hikcentral_connect")
    api_url: Mapped[str] = mapped_column(
        String(255), nullable=False, default="/api/hccgw/acs/v1/event/certificaterecords/search"
    )
    app_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    secret_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    area_domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="Asia/Dhaka")
    late_after: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class HikvisionStudentCredential(Base):
    """Maps the non-biometric person identifier held by a device to a student."""

    __tablename__ = "hikvision_student_credentials"
    __table_args__ = (UniqueConstraint("device_id", "person_code", name="uq_hikvision_device_person_code"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("hikvision_devices.id"), index=True, nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("students.id"), index=True, nullable=False)
    person_code: Mapped[str] = mapped_column(String(64), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class HikvisionAttendanceEvent(Base):
    """Immutable raw punch received from Hikvision before attendance projection."""

    __tablename__ = "hikvision_attendance_events"
    __table_args__ = (
        UniqueConstraint("device_id", "external_event_id", name="uq_hikvision_device_external_event"),
        UniqueConstraint("device_id", "person_code", "event_at", name="uq_hikvision_device_person_time"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("hikvision_devices.id"), index=True, nullable=False)
    student_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("students.id"), index=True, nullable=True)
    attendance_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("student_attendance.id"), index=True, nullable=True)
    external_event_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    person_code: Mapped[str] = mapped_column(String(64), nullable=False)
    event_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    verification_method: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    processing_status: Mapped[str] = mapped_column(String(24), nullable=False, default="unmatched")
    raw_payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
