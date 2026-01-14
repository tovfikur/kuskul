import uuid
from sqlalchemy import ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ClassSubject(Base):
    __tablename__ = "class_subjects"

    class_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("classes.id"), primary_key=True)
    subject_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("subjects.id"), primary_key=True)

