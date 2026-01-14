import uuid

from sqlalchemy import Boolean, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class StudentGuardian(Base):
    __tablename__ = "student_guardians"

    student_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("students.id"), primary_key=True)
    guardian_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("guardians.id"), primary_key=True)
    relation: Mapped[str] = mapped_column(String(32), nullable=False, default="guardian")
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
