import uuid

from sqlalchemy import JSON, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    permissions: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
