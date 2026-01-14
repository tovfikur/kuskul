import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Float, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Grade(Base):
    __tablename__ = "grades"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(32), nullable=False)
    min_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    max_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

