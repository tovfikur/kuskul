from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ExamTypeMaster(Base):
    __tablename__ = "exam_type_master"

    code: Mapped[str] = mapped_column(String(32), primary_key=True, nullable=False)
    label: Mapped[str] = mapped_column(String(64), nullable=False)
    frequency_hint: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    weight_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    weight_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

