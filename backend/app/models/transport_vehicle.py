import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class TransportVehicle(Base):
    __tablename__ = "transport_vehicles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    registration_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    driver_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

