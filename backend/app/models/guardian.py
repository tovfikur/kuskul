import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Guardian(Base):
    __tablename__ = "guardians"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), index=True, nullable=True)

    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
