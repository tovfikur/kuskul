import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)

    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    admission_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    gender: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    full_name_bc: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    place_of_birth: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    nationality: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    religion: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)

    admission_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    admission_status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    medium: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    shift: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    previous_school_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    previous_class: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    transfer_certificate_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    present_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    permanent_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    thana: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    known_allergies: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    chronic_illness: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    physical_disabilities: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    special_needs: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    doctor_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    doctor_phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    vaccination_status: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    birth_certificate_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    national_id_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    passport_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    fee_category: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    scholarship_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    portal_username: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    portal_access_student: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    portal_access_parent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    rfid_nfc_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    hostel_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    library_card_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
