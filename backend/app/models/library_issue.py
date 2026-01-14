import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class LibraryIssue(Base):
    __tablename__ = "library_issues"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    book_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("library_books.id"), index=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)

    status: Mapped[str] = mapped_column(String(16), nullable=False, default="issued")
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    returned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    renewed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fine_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

