import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, LargeBinary, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    uploaded_by_user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    entity_type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    entity_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    content: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

