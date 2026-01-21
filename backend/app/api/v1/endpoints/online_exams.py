import json
import random
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission
from app.core.audit import write_audit_log
from app.core.problems import forbidden, not_found, problem
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.enrollment import Enrollment
from app.models.exam import Exam
from app.models.exam_schedule import ExamSchedule
from app.models.mark import Mark
from app.models.online_exam import (
    OnlineExamAnswer,
    OnlineExamAttempt,
    OnlineExamConfig,
    OnlineExamConfigQuestion,
    OnlineExamProctorEvent,
    QuestionBankCategory,
    QuestionBankQuestion,
)
from app.models.school_class import SchoolClass
from app.models.student import Student
from app.models.subject import Subject
from app.models.user import User
from app.schemas.online_exams import (
    OnlineExamAnswerUpsert,
    OnlineExamAttemptOut,
    OnlineExamConfigCreate,
    OnlineExamConfigOut,
    OnlineExamConfigQuestionAdd,
    OnlineExamConfigQuestionBulkAdd,
    OnlineExamConfigQuestionOut,
    OnlineExamConfigUpdate,
    OnlineExamProctorEventCreate,
    OnlineExamStartResponse,
    OnlineExamSubmitResponse,
    QuestionBankCategoryCreate,
    QuestionBankCategoryOut,
    QuestionBankQuestionCreate,
    QuestionBankQuestionOut,
    QuestionBankQuestionUpdate,
)


router = APIRouter()
manage = APIRouter(dependencies=[Depends(require_permission("online_exams:read"))])
take = APIRouter(dependencies=[Depends(require_permission("online_exams:take"))])


def _category_out(c: QuestionBankCategory) -> QuestionBankCategoryOut:
    return QuestionBankCategoryOut(id=c.id, school_id=c.school_id, name=c.name)


def _question_out(q: QuestionBankQuestion) -> QuestionBankQuestionOut:
    return QuestionBankQuestionOut(
        id=q.id,
        school_id=q.school_id,
        category_id=q.category_id,
        subject_id=q.subject_id,
        question_type=q.question_type,
        prompt=q.prompt,
        options=q.options,
        points=q.points,
        difficulty=q.difficulty,
        tags=q.tags,
        is_active=q.is_active,
    )


def _config_out(c: OnlineExamConfig) -> OnlineExamConfigOut:
    return OnlineExamConfigOut(
        id=c.id,
        school_id=c.school_id,
        exam_schedule_id=c.exam_schedule_id,
        duration_minutes=c.duration_minutes,
        shuffle_questions=c.shuffle_questions,
        shuffle_options=c.shuffle_options,
        allow_backtrack=c.allow_backtrack,
        proctoring_enabled=c.proctoring_enabled,
        attempt_limit=c.attempt_limit,
        starts_at=c.starts_at,
        ends_at=c.ends_at,
        instructions=c.instructions,
    )


def _attempt_out(a: OnlineExamAttempt) -> OnlineExamAttemptOut:
    return OnlineExamAttemptOut(
        id=a.id,
        config_id=a.config_id,
        student_id=a.student_id,
        attempt_no=a.attempt_no,
        status=a.status,
        started_at=a.started_at,
        submitted_at=a.submitted_at,
        score=a.score,
        max_score=a.max_score,
        percentage=a.percentage,
    )


def _ensure_exam_schedule_scope(db: Session, school_id: uuid.UUID, schedule_id: uuid.UUID) -> ExamSchedule:
    sched = db.get(ExamSchedule, schedule_id)
    if not sched:
        raise not_found("Exam schedule not found")
    exam = db.get(Exam, sched.exam_id)
    if not exam:
        raise not_found("Exam schedule not found")
    year = db.get(AcademicYear, exam.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Exam schedule not found")
    cls = db.get(SchoolClass, sched.class_id)
    if not cls or cls.school_id != school_id:
        raise not_found("Exam schedule not found")
    return sched


def _ensure_config_scope(db: Session, school_id: uuid.UUID, config_id: uuid.UUID) -> tuple[OnlineExamConfig, ExamSchedule]:
    cfg = db.get(OnlineExamConfig, config_id)
    if not cfg or cfg.school_id != school_id:
        raise not_found("Online exam config not found")
    sched = _ensure_exam_schedule_scope(db, school_id, cfg.exam_schedule_id)
    return cfg, sched


def _ensure_student_binding(db: Session, user_id: uuid.UUID, school_id: uuid.UUID) -> Student:
    s = db.scalar(select(Student).where(Student.user_id == user_id, Student.school_id == school_id))
    if not s:
        raise forbidden("Student account is not linked to this school")
    return s


def _ensure_enrollment(db: Session, student_id: uuid.UUID, school_id: uuid.UUID, class_id: uuid.UUID) -> Enrollment:
    year = db.scalar(select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_current.is_(True)))
    if not year:
        raise forbidden("No current academic year is configured")
    e = db.scalar(
        select(Enrollment).where(
            Enrollment.student_id == student_id,
            Enrollment.academic_year_id == year.id,
            Enrollment.class_id == class_id,
            Enrollment.status == "active",
        )
    )
    if not e:
        raise forbidden("Student is not enrolled for this class")
    return e


def _normalize_json(v: Any) -> str:
    return json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


@manage.get("/question-bank/categories", response_model=list[QuestionBankCategoryOut])
def list_question_bank_categories(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[QuestionBankCategoryOut]:
    rows = db.execute(select(QuestionBankCategory).where(QuestionBankCategory.school_id == school_id).order_by(QuestionBankCategory.name.asc())).scalars().all()
    return [_category_out(r) for r in rows]


@manage.post("/question-bank/categories", response_model=QuestionBankCategoryOut, dependencies=[Depends(require_permission("online_exams:write"))])
def create_question_bank_category(
    payload: QuestionBankCategoryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> QuestionBankCategoryOut:
    now = datetime.now(timezone.utc)
    existing = db.scalar(
        select(QuestionBankCategory).where(
            QuestionBankCategory.school_id == school_id,
            func.lower(QuestionBankCategory.name) == payload.name.strip().lower(),
        )
    )
    if existing:
        raise problem(status_code=409, title="Conflict", detail="Category already exists")
    c = QuestionBankCategory(
        school_id=school_id,
        name=payload.name.strip(),
        created_by_user_id=user.id,
        created_at=now,
    )
    db.add(c)
    write_audit_log(
        db,
        school_id=school_id,
        action="question_bank_category.create",
        user_id=user.id,
        entity_type="question_bank_category",
        entity_id=str(c.id),
    )
    db.commit()
    db.refresh(c)
    return _category_out(c)


@manage.delete("/question-bank/categories/{category_id}", dependencies=[Depends(require_permission("online_exams:write"))])
def delete_question_bank_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    c = db.get(QuestionBankCategory, category_id)
    if not c or c.school_id != school_id:
        raise not_found("Category not found")
    used = db.scalar(select(func.count()).select_from(QuestionBankQuestion).where(QuestionBankQuestion.category_id == c.id)) or 0
    if used:
        raise problem(status_code=409, title="Conflict", detail="Category has questions and cannot be deleted")
    write_audit_log(
        db,
        school_id=school_id,
        action="question_bank_category.delete",
        user_id=user.id,
        entity_type="question_bank_category",
        entity_id=str(c.id),
    )
    db.delete(c)
    db.commit()
    return {"status": "ok"}


@manage.get("/question-bank/questions", response_model=list[QuestionBankQuestionOut])
def list_question_bank_questions(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    category_id: Optional[uuid.UUID] = None,
    subject_id: Optional[uuid.UUID] = None,
    is_active: Optional[bool] = None,
) -> list[QuestionBankQuestionOut]:
    q = select(QuestionBankQuestion).where(QuestionBankQuestion.school_id == school_id)
    if category_id:
        q = q.where(QuestionBankQuestion.category_id == category_id)
    if subject_id:
        q = q.where(QuestionBankQuestion.subject_id == subject_id)
    if is_active is not None:
        q = q.where(QuestionBankQuestion.is_active.is_(is_active))
    rows = db.execute(q.order_by(QuestionBankQuestion.created_at.desc())).scalars().all()
    return [_question_out(r) for r in rows]


@manage.post("/question-bank/questions", response_model=QuestionBankQuestionOut, dependencies=[Depends(require_permission("online_exams:write"))])
def create_question_bank_question(
    payload: QuestionBankQuestionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> QuestionBankQuestionOut:
    if payload.category_id:
        c = db.get(QuestionBankCategory, payload.category_id)
        if not c or c.school_id != school_id:
            raise not_found("Category not found")
    if payload.subject_id:
        subj = db.get(Subject, payload.subject_id)
        if not subj or subj.school_id != school_id:
            raise not_found("Subject not found")
    now = datetime.now(timezone.utc)
    q = QuestionBankQuestion(
        school_id=school_id,
        category_id=payload.category_id,
        subject_id=payload.subject_id,
        question_type=payload.question_type,
        prompt=payload.prompt,
        options=payload.options,
        correct_answer=payload.correct_answer,
        points=payload.points,
        difficulty=payload.difficulty,
        tags=payload.tags,
        is_active=payload.is_active,
        created_by_user_id=user.id,
        created_at=now,
    )
    db.add(q)
    write_audit_log(
        db,
        school_id=school_id,
        action="question_bank_question.create",
        user_id=user.id,
        entity_type="question_bank_question",
        entity_id=str(q.id),
    )
    db.commit()
    db.refresh(q)
    return _question_out(q)


@manage.patch("/question-bank/questions/{question_id}", response_model=QuestionBankQuestionOut, dependencies=[Depends(require_permission("online_exams:write"))])
def update_question_bank_question(
    question_id: uuid.UUID,
    payload: QuestionBankQuestionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> QuestionBankQuestionOut:
    q = db.get(QuestionBankQuestion, question_id)
    if not q or q.school_id != school_id:
        raise not_found("Question not found")
    data = payload.model_dump(exclude_unset=True)
    if "category_id" in data:
        if data["category_id"]:
            c = db.get(QuestionBankCategory, data["category_id"])
            if not c or c.school_id != school_id:
                raise not_found("Category not found")
    if "subject_id" in data:
        if data["subject_id"]:
            subj = db.get(Subject, data["subject_id"])
            if not subj or subj.school_id != school_id:
                raise not_found("Subject not found")
    for k, v in data.items():
        setattr(q, k, v)
    write_audit_log(
        db,
        school_id=school_id,
        action="question_bank_question.update",
        user_id=user.id,
        entity_type="question_bank_question",
        entity_id=str(q.id),
    )
    db.commit()
    return _question_out(q)


@manage.delete("/question-bank/questions/{question_id}", dependencies=[Depends(require_permission("online_exams:write"))])
def delete_question_bank_question(
    question_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    q = db.get(QuestionBankQuestion, question_id)
    if not q or q.school_id != school_id:
        raise not_found("Question not found")
    used = db.scalar(
        select(func.count()).select_from(OnlineExamConfigQuestion).where(OnlineExamConfigQuestion.question_id == q.id)
    ) or 0
    if used:
        raise problem(status_code=409, title="Conflict", detail="Question is used in an exam config and cannot be deleted")
    write_audit_log(
        db,
        school_id=school_id,
        action="question_bank_question.delete",
        user_id=user.id,
        entity_type="question_bank_question",
        entity_id=str(q.id),
    )
    db.delete(q)
    db.commit()
    return {"status": "ok"}


@manage.get("/configs", response_model=list[OnlineExamConfigOut])
def list_online_exam_configs(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    exam_schedule_id: Optional[uuid.UUID] = None,
) -> list[OnlineExamConfigOut]:
    q = select(OnlineExamConfig).where(OnlineExamConfig.school_id == school_id)
    if exam_schedule_id:
        q = q.where(OnlineExamConfig.exam_schedule_id == exam_schedule_id)
    rows = db.execute(q.order_by(OnlineExamConfig.created_at.desc())).scalars().all()
    return [_config_out(r) for r in rows]


@manage.get("/configs/{config_id}", response_model=OnlineExamConfigOut)
def get_online_exam_config(
    config_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> OnlineExamConfigOut:
    cfg, _ = _ensure_config_scope(db, school_id, config_id)
    return _config_out(cfg)


@manage.post("/configs", response_model=OnlineExamConfigOut, dependencies=[Depends(require_permission("online_exams:write"))])
def create_online_exam_config(
    payload: OnlineExamConfigCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> OnlineExamConfigOut:
    _ensure_exam_schedule_scope(db, school_id, payload.exam_schedule_id)
    existing = db.scalar(
        select(OnlineExamConfig).where(
            OnlineExamConfig.school_id == school_id,
            OnlineExamConfig.exam_schedule_id == payload.exam_schedule_id,
        )
    )
    if existing:
        raise problem(status_code=409, title="Conflict", detail="Online exam config already exists for this schedule")
    if payload.starts_at and payload.ends_at and payload.ends_at < payload.starts_at:
        raise problem(status_code=400, title="Bad Request", detail="ends_at must be >= starts_at")
    now = datetime.now(timezone.utc)
    cfg = OnlineExamConfig(
        school_id=school_id,
        exam_schedule_id=payload.exam_schedule_id,
        duration_minutes=payload.duration_minutes,
        shuffle_questions=payload.shuffle_questions,
        shuffle_options=payload.shuffle_options,
        allow_backtrack=payload.allow_backtrack,
        proctoring_enabled=payload.proctoring_enabled,
        attempt_limit=payload.attempt_limit,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        instructions=payload.instructions,
        created_by_user_id=user.id,
        created_at=now,
    )
    db.add(cfg)
    write_audit_log(
        db,
        school_id=school_id,
        action="online_exam_config.create",
        user_id=user.id,
        entity_type="online_exam_config",
        entity_id=str(cfg.id),
    )
    db.commit()
    db.refresh(cfg)
    return _config_out(cfg)


@manage.patch("/configs/{config_id}", response_model=OnlineExamConfigOut, dependencies=[Depends(require_permission("online_exams:write"))])
def update_online_exam_config(
    config_id: uuid.UUID,
    payload: OnlineExamConfigUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> OnlineExamConfigOut:
    cfg, _ = _ensure_config_scope(db, school_id, config_id)
    data = payload.model_dump(exclude_unset=True)
    if "starts_at" in data and "ends_at" in data and data["starts_at"] and data["ends_at"] and data["ends_at"] < data["starts_at"]:
        raise problem(status_code=400, title="Bad Request", detail="ends_at must be >= starts_at")
    next_starts = data.get("starts_at", cfg.starts_at)
    next_ends = data.get("ends_at", cfg.ends_at)
    if next_starts and next_ends and next_ends < next_starts:
        raise problem(status_code=400, title="Bad Request", detail="ends_at must be >= starts_at")
    for k, v in data.items():
        setattr(cfg, k, v)
    write_audit_log(
        db,
        school_id=school_id,
        action="online_exam_config.update",
        user_id=user.id,
        entity_type="online_exam_config",
        entity_id=str(cfg.id),
    )
    db.commit()
    return _config_out(cfg)


@manage.delete("/configs/{config_id}", dependencies=[Depends(require_permission("online_exams:write"))])
def delete_online_exam_config(
    config_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    cfg, _ = _ensure_config_scope(db, school_id, config_id)
    used = db.scalar(select(func.count()).select_from(OnlineExamAttempt).where(OnlineExamAttempt.config_id == cfg.id)) or 0
    if used:
        raise problem(status_code=409, title="Conflict", detail="Online exam config has attempts and cannot be deleted")
    rows = (
        db.execute(
            select(OnlineExamConfigQuestion).where(
                OnlineExamConfigQuestion.config_id == cfg.id, OnlineExamConfigQuestion.school_id == school_id
            )
        )
        .scalars()
        .all()
    )
    for r in rows:
        db.delete(r)
    write_audit_log(
        db,
        school_id=school_id,
        action="online_exam_config.delete",
        user_id=user.id,
        entity_type="online_exam_config",
        entity_id=str(cfg.id),
    )
    db.delete(cfg)
    db.commit()
    return {"status": "ok"}


@manage.get("/configs/{config_id}/questions", response_model=list[OnlineExamConfigQuestionOut])
def list_online_exam_config_questions(
    config_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[OnlineExamConfigQuestionOut]:
    cfg, _ = _ensure_config_scope(db, school_id, config_id)
    rows = (
        db.execute(
            select(OnlineExamConfigQuestion)
            .where(OnlineExamConfigQuestion.config_id == cfg.id, OnlineExamConfigQuestion.school_id == school_id)
            .order_by(OnlineExamConfigQuestion.order_index.asc())
        )
        .scalars()
        .all()
    )
    return [
        OnlineExamConfigQuestionOut(
            id=r.id,
            config_id=r.config_id,
            question_id=r.question_id,
            order_index=r.order_index,
            points=r.points,
        )
        for r in rows
    ]


@manage.post("/configs/{config_id}/questions", dependencies=[Depends(require_permission("online_exams:write"))])
def bulk_add_online_exam_config_questions(
    config_id: uuid.UUID,
    payload: OnlineExamConfigQuestionBulkAdd,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    cfg, _ = _ensure_config_scope(db, school_id, config_id)
    now = datetime.now(timezone.utc)
    last = db.scalar(
        select(func.coalesce(func.max(OnlineExamConfigQuestion.order_index), 0)).where(
            OnlineExamConfigQuestion.config_id == cfg.id, OnlineExamConfigQuestion.school_id == school_id
        )
    )
    next_order = int(last or 0) + 1
    created = 0
    for item in payload.items:
        q = db.get(QuestionBankQuestion, item.question_id)
        if not q or q.school_id != school_id:
            raise not_found("Question not found")
        existing = db.scalar(
            select(OnlineExamConfigQuestion).where(
                OnlineExamConfigQuestion.config_id == cfg.id,
                OnlineExamConfigQuestion.question_id == q.id,
                OnlineExamConfigQuestion.school_id == school_id,
            )
        )
        if existing:
            continue
        order_index = item.order_index if item.order_index is not None else next_order
        if item.order_index is None:
            next_order += 1
        row = OnlineExamConfigQuestion(
            school_id=school_id,
            config_id=cfg.id,
            question_id=q.id,
            order_index=int(order_index),
            points=item.points,
        )
        db.add(row)
        created += 1
    write_audit_log(
        db,
        school_id=school_id,
        action="online_exam_config.questions_add",
        user_id=user.id,
        entity_type="online_exam_config",
        entity_id=str(cfg.id),
        details=f"created={created}",
    )
    db.commit()
    return {"created": created}


@manage.get("/attempts", response_model=list[OnlineExamAttemptOut])
def list_online_exam_attempts(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    config_id: Optional[uuid.UUID] = None,
    student_id: Optional[uuid.UUID] = None,
) -> list[OnlineExamAttemptOut]:
    q = select(OnlineExamAttempt).where(OnlineExamAttempt.school_id == school_id)
    if config_id:
        q = q.where(OnlineExamAttempt.config_id == config_id)
    if student_id:
        q = q.where(OnlineExamAttempt.student_id == student_id)
    rows = db.execute(q.order_by(OnlineExamAttempt.started_at.desc())).scalars().all()
    return [_attempt_out(r) for r in rows]


@take.post("/configs/{config_id}/start", response_model=OnlineExamStartResponse)
def start_online_exam(
    config_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> OnlineExamStartResponse:
    cfg, sched = _ensure_config_scope(db, school_id, config_id)
    exam = db.get(Exam, sched.exam_id)
    if not exam:
        raise not_found("Exam not found")
    if not exam.is_published:
        raise forbidden("Exam is not published")
    now = datetime.now(timezone.utc)
    if cfg.starts_at and now < cfg.starts_at:
        raise forbidden("Exam has not started yet")
    if cfg.ends_at and now > cfg.ends_at:
        raise forbidden("Exam has ended")

    student = _ensure_student_binding(db, user.id, school_id)
    _ensure_enrollment(db, student.id, school_id, sched.class_id)
    attempt_no = (db.scalar(select(func.count()).select_from(OnlineExamAttempt).where(OnlineExamAttempt.config_id == cfg.id, OnlineExamAttempt.student_id == student.id)) or 0) + 1
    if attempt_no > cfg.attempt_limit:
        raise forbidden("Attempt limit reached")
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    a = OnlineExamAttempt(
        school_id=school_id,
        config_id=cfg.id,
        student_id=student.id,
        attempt_no=int(attempt_no),
        status="in_progress",
        started_at=now,
        ip_address=client_host,
        user_agent=user_agent,
    )
    db.add(a)
    write_audit_log(
        db,
        school_id=school_id,
        action="online_exam_attempt.start",
        user_id=user.id,
        entity_type="online_exam_attempt",
        entity_id=str(a.id),
        details=f"config_id={cfg.id}",
    )
    db.commit()
    db.refresh(a)

    rows = db.execute(
        select(QuestionBankQuestion)
        .join(OnlineExamConfigQuestion, OnlineExamConfigQuestion.question_id == QuestionBankQuestion.id)
        .where(
            OnlineExamConfigQuestion.config_id == cfg.id,
            OnlineExamConfigQuestion.school_id == school_id,
            QuestionBankQuestion.school_id == school_id,
            QuestionBankQuestion.is_active.is_(True),
        )
        .order_by(OnlineExamConfigQuestion.order_index.asc())
    ).scalars().all()
    questions = [_question_out(r) for r in rows]
    if cfg.shuffle_questions and len(questions) > 1:
        rng = random.Random(str(a.id))
        rng.shuffle(questions)

    return OnlineExamStartResponse(attempt=_attempt_out(a), questions=questions)


@take.put("/attempts/{attempt_id}/answers")
def upsert_online_exam_answers(
    attempt_id: uuid.UUID,
    payload: list[OnlineExamAnswerUpsert],
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    if len(payload) > 500:
        raise problem(status_code=400, title="Bad Request", detail="Too many answers in one request")
    a = db.get(OnlineExamAttempt, attempt_id)
    if not a or a.school_id != school_id:
        raise not_found("Attempt not found")
    student = _ensure_student_binding(db, user.id, school_id)
    if a.student_id != student.id:
        raise forbidden("Access denied")
    if a.status != "in_progress":
        raise forbidden("Attempt is not in progress")
    now = datetime.now(timezone.utc)
    for item in payload:
        allowed = db.scalar(
            select(OnlineExamConfigQuestion).where(
                OnlineExamConfigQuestion.config_id == a.config_id,
                OnlineExamConfigQuestion.school_id == school_id,
                OnlineExamConfigQuestion.question_id == item.question_id,
            )
        )
        if not allowed:
            raise forbidden("Question is not part of this exam")
        existing = db.scalar(
            select(OnlineExamAnswer).where(
                OnlineExamAnswer.school_id == school_id,
                OnlineExamAnswer.attempt_id == a.id,
                OnlineExamAnswer.question_id == item.question_id,
            )
        )
        if existing:
            existing.answer = item.answer
            existing.answered_at = now
        else:
            db.add(
                OnlineExamAnswer(
                    school_id=school_id,
                    attempt_id=a.id,
                    question_id=item.question_id,
                    answer=item.answer,
                    answered_at=now,
                )
            )
    db.commit()
    return {"status": "ok"}


@take.post("/attempts/{attempt_id}/submit", response_model=OnlineExamSubmitResponse)
def submit_online_exam_attempt(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> OnlineExamSubmitResponse:
    a = db.get(OnlineExamAttempt, attempt_id)
    if not a or a.school_id != school_id:
        raise not_found("Attempt not found")
    student = _ensure_student_binding(db, user.id, school_id)
    if a.student_id != student.id:
        raise forbidden("Access denied")
    if a.status != "in_progress":
        raise forbidden("Attempt is not in progress")

    cfg, sched = _ensure_config_scope(db, school_id, a.config_id)
    now = datetime.now(timezone.utc)
    if cfg.ends_at and now > cfg.ends_at:
        raise forbidden("Exam has ended")

    rows = db.execute(
        select(OnlineExamConfigQuestion, QuestionBankQuestion)
        .join(QuestionBankQuestion, QuestionBankQuestion.id == OnlineExamConfigQuestion.question_id)
        .where(
            OnlineExamConfigQuestion.config_id == cfg.id,
            OnlineExamConfigQuestion.school_id == school_id,
            QuestionBankQuestion.school_id == school_id,
        )
    ).all()

    max_points = 0
    total_awarded = 0
    for cfg_q, q in rows:
        points = int(cfg_q.points if cfg_q.points is not None else q.points)
        max_points += points

        ans = db.scalar(
            select(OnlineExamAnswer).where(
                OnlineExamAnswer.school_id == school_id,
                OnlineExamAnswer.attempt_id == a.id,
                OnlineExamAnswer.question_id == q.id,
            )
        )
        if q.correct_answer is None:
            if ans:
                ans.is_correct = None
                ans.awarded_points = None
            continue

        correct = False
        if ans and ans.answer is not None:
            try:
                correct = _normalize_json(ans.answer) == _normalize_json(q.correct_answer)
            except Exception:
                correct = False
        awarded = points if correct else 0
        if ans:
            ans.is_correct = bool(correct)
            ans.awarded_points = int(awarded)
        else:
            db.add(
                OnlineExamAnswer(
                    school_id=school_id,
                    attempt_id=a.id,
                    question_id=q.id,
                    answer=None,
                    is_correct=bool(correct),
                    awarded_points=int(awarded),
                    answered_at=now,
                )
            )
        total_awarded += awarded

    a.status = "submitted"
    a.submitted_at = now
    a.score = int(total_awarded)
    a.max_score = int(max_points)
    a.percentage = (float(total_awarded) / float(max_points) * 100.0) if max_points else 0.0

    schedule_marks = int(round(float(sched.max_marks) * (float(a.percentage or 0.0) / 100.0))) if sched.max_marks else 0
    existing_mark = db.scalar(
        select(Mark).where(Mark.exam_schedule_id == sched.id, Mark.student_id == student.id)
    )
    if existing_mark:
        existing_mark.marks_obtained = schedule_marks
        existing_mark.is_absent = False
        existing_mark.remarks = "Online exam"
    else:
        db.add(
            Mark(
                exam_schedule_id=sched.id,
                student_id=student.id,
                marks_obtained=schedule_marks,
                is_absent=False,
                remarks="Online exam",
                created_at=now,
            )
        )

    write_audit_log(
        db,
        school_id=school_id,
        action="online_exam_attempt.submit",
        user_id=user.id,
        entity_type="online_exam_attempt",
        entity_id=str(a.id),
        details=f"score={a.score};max_score={a.max_score};pct={a.percentage}",
    )
    db.commit()
    db.refresh(a)
    return OnlineExamSubmitResponse(attempt=_attempt_out(a))


@take.post("/attempts/{attempt_id}/proctor-events")
def create_online_exam_proctor_event(
    attempt_id: uuid.UUID,
    payload: OnlineExamProctorEventCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    a = db.get(OnlineExamAttempt, attempt_id)
    if not a or a.school_id != school_id:
        raise not_found("Attempt not found")
    student = _ensure_student_binding(db, user.id, school_id)
    if a.student_id != student.id:
        raise forbidden("Access denied")
    now = datetime.now(timezone.utc)
    e = OnlineExamProctorEvent(
        school_id=school_id,
        attempt_id=a.id,
        event_type=payload.event_type,
        details=payload.details,
        created_at=now,
    )
    db.add(e)
    write_audit_log(
        db,
        school_id=school_id,
        action="online_exam_proctor_event.create",
        user_id=user.id,
        entity_type="online_exam_attempt",
        entity_id=str(a.id),
        details=payload.event_type,
    )
    db.commit()
    return {"status": "ok"}


router.include_router(manage)
router.include_router(take)
