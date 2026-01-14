import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class StudentTransportAssignment(Base):
    __tablename__ = "student_transport_assignments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("students.id"), index=True, nullable=False)
    route_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("transport_routes.id"), index=True, nullable=False)
    stop_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("transport_route_stops.id"), index=True, nullable=True)
    vehicle_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("transport_vehicles.id"), index=True, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

