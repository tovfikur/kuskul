import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class LibraryBook(Base):
    __tablename__ = "library_books"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    author: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    isbn: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    total_copies: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    available_copies: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    cover_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

