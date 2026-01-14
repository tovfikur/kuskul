import uuid
from datetime import datetime, time
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Time, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class TransportRouteStop(Base):
    __tablename__ = "transport_route_stops"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    route_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("transport_routes.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    pickup_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    drop_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

