import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class QuestionBankCategoryOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    name: str


class QuestionBankCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class QuestionBankQuestionOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    category_id: Optional[uuid.UUID] = None
    subject_id: Optional[uuid.UUID] = None
    question_type: str
    prompt: str
    options: Optional[dict[str, Any]] = None
    points: int
    difficulty: Optional[str] = None
    tags: Optional[str] = None
    is_active: bool


class QuestionBankQuestionCreate(BaseModel):
    category_id: Optional[uuid.UUID] = None
    subject_id: Optional[uuid.UUID] = None
    question_type: str = Field(min_length=1, max_length=32)
    prompt: str = Field(min_length=1, max_length=4000)
    options: Optional[dict[str, Any]] = None
    correct_answer: Optional[dict[str, Any]] = None
    points: int = Field(default=1, ge=1, le=500)
    difficulty: Optional[str] = Field(default=None, max_length=16)
    tags: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = True


class QuestionBankQuestionUpdate(BaseModel):
    category_id: Optional[uuid.UUID] = None
    subject_id: Optional[uuid.UUID] = None
    question_type: Optional[str] = Field(default=None, min_length=1, max_length=32)
    prompt: Optional[str] = Field(default=None, min_length=1, max_length=4000)
    options: Optional[dict[str, Any]] = None
    correct_answer: Optional[dict[str, Any]] = None
    points: Optional[int] = Field(default=None, ge=1, le=500)
    difficulty: Optional[str] = Field(default=None, max_length=16)
    tags: Optional[str] = Field(default=None, max_length=500)
    is_active: Optional[bool] = None


class OnlineExamConfigOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    exam_schedule_id: uuid.UUID
    duration_minutes: int
    shuffle_questions: bool
    shuffle_options: bool
    allow_backtrack: bool
    proctoring_enabled: bool
    attempt_limit: int
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    instructions: Optional[str] = None


class OnlineExamConfigCreate(BaseModel):
    exam_schedule_id: uuid.UUID
    duration_minutes: int = Field(default=60, ge=5, le=360)
    shuffle_questions: bool = False
    shuffle_options: bool = False
    allow_backtrack: bool = True
    proctoring_enabled: bool = False
    attempt_limit: int = Field(default=1, ge=1, le=10)
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    instructions: Optional[str] = Field(default=None, max_length=4000)


class OnlineExamConfigUpdate(BaseModel):
    duration_minutes: Optional[int] = Field(default=None, ge=5, le=360)
    shuffle_questions: Optional[bool] = None
    shuffle_options: Optional[bool] = None
    allow_backtrack: Optional[bool] = None
    proctoring_enabled: Optional[bool] = None
    attempt_limit: Optional[int] = Field(default=None, ge=1, le=10)
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    instructions: Optional[str] = Field(default=None, max_length=4000)


class OnlineExamConfigQuestionOut(BaseModel):
    id: uuid.UUID
    config_id: uuid.UUID
    question_id: uuid.UUID
    order_index: int
    points: Optional[int] = None


class OnlineExamConfigQuestionAdd(BaseModel):
    question_id: uuid.UUID
    order_index: Optional[int] = None
    points: Optional[int] = Field(default=None, ge=1, le=500)


class OnlineExamConfigQuestionBulkAdd(BaseModel):
    items: list[OnlineExamConfigQuestionAdd] = Field(min_length=1, max_length=2000)


class OnlineExamAttemptOut(BaseModel):
    id: uuid.UUID
    config_id: uuid.UUID
    student_id: uuid.UUID
    attempt_no: int
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    score: Optional[int] = None
    max_score: Optional[int] = None
    percentage: Optional[float] = None


class OnlineExamStartResponse(BaseModel):
    attempt: OnlineExamAttemptOut
    questions: list[QuestionBankQuestionOut]


class OnlineExamAnswerUpsert(BaseModel):
    question_id: uuid.UUID
    answer: Optional[dict[str, Any]] = None


class OnlineExamSubmitResponse(BaseModel):
    attempt: OnlineExamAttemptOut


class OnlineExamProctorEventCreate(BaseModel):
    event_type: str = Field(min_length=1, max_length=32)
    details: Optional[dict[str, Any]] = None
