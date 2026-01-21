import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class QuestionBankCategory(Base):
    __tablename__ = "question_bank_categories"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class QuestionBankQuestion(Base):
    __tablename__ = "question_bank_questions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("question_bank_categories.id"), index=True, nullable=True
    )
    subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("subjects.id"), index=True, nullable=True)
    question_type: Mapped[str] = mapped_column(String(32), nullable=False)
    prompt: Mapped[str] = mapped_column(String(4000), nullable=False)
    options: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    correct_answer: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    difficulty: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class OnlineExamConfig(Base):
    __tablename__ = "online_exam_configs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    exam_schedule_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("exam_schedules.id"), index=True, nullable=False
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    shuffle_options: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    allow_backtrack: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    proctoring_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    attempt_limit: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    starts_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(String(4000), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class OnlineExamConfigQuestion(Base):
    __tablename__ = "online_exam_config_questions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    config_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("online_exam_configs.id"), index=True, nullable=False
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("question_bank_questions.id"), index=True, nullable=False
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    points: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)


class OnlineExamAttempt(Base):
    __tablename__ = "online_exam_attempts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    config_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("online_exam_configs.id"), index=True, nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("students.id"), index=True, nullable=False)
    attempt_no: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="in_progress")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    percentage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(400), nullable=True)


class OnlineExamAnswer(Base):
    __tablename__ = "online_exam_answers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    attempt_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("online_exam_attempts.id"), index=True, nullable=False)
    question_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("question_bank_questions.id"), index=True, nullable=False
    )
    answer: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    is_correct: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    awarded_points: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    answered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class OnlineExamProctorEvent(Base):
    __tablename__ = "online_exam_proctor_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    attempt_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("online_exam_attempts.id"), index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
