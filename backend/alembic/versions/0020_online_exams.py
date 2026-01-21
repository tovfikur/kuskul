from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    bind = op.get_bind()
    existing = {c["name"] for c in inspect(bind).get_columns(table_name)}
    if column.name not in existing:
        op.add_column(table_name, column)


def _create_table_if_missing(table_name: str, *columns: sa.Column) -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if table_name in insp.get_table_names():
        return
    op.create_table(table_name, *columns)


def _create_index_if_missing(index_name: str, table_name: str, columns: list[str]) -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    existing = {i["name"] for i in insp.get_indexes(table_name)}
    if index_name in existing:
        return
    op.create_index(index_name, table_name, columns)


def upgrade() -> None:
    _add_column_if_missing("students", sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=True))
    _create_index_if_missing("ix_students_user_id", "students", ["user_id"])

    _create_table_if_missing(
        "question_bank_categories",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    _create_index_if_missing("ix_question_bank_categories_school_id", "question_bank_categories", ["school_id"])
    _create_index_if_missing("ix_question_bank_categories_created_by_user_id", "question_bank_categories", ["created_by_user_id"])

    _create_table_if_missing(
        "question_bank_questions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("category_id", sa.Uuid(as_uuid=True), sa.ForeignKey("question_bank_categories.id"), nullable=True),
        sa.Column("subject_id", sa.Uuid(as_uuid=True), sa.ForeignKey("subjects.id"), nullable=True),
        sa.Column("question_type", sa.String(length=32), nullable=False),
        sa.Column("prompt", sa.String(length=4000), nullable=False),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("correct_answer", sa.JSON(), nullable=True),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("difficulty", sa.String(length=16), nullable=True),
        sa.Column("tags", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    _create_index_if_missing("ix_question_bank_questions_school_id", "question_bank_questions", ["school_id"])
    _create_index_if_missing("ix_question_bank_questions_category_id", "question_bank_questions", ["category_id"])
    _create_index_if_missing("ix_question_bank_questions_subject_id", "question_bank_questions", ["subject_id"])
    _create_index_if_missing("ix_question_bank_questions_created_by_user_id", "question_bank_questions", ["created_by_user_id"])

    _create_table_if_missing(
        "online_exam_configs",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("exam_schedule_id", sa.Uuid(as_uuid=True), sa.ForeignKey("exam_schedules.id"), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("shuffle_questions", sa.Boolean(), nullable=False),
        sa.Column("shuffle_options", sa.Boolean(), nullable=False),
        sa.Column("allow_backtrack", sa.Boolean(), nullable=False),
        sa.Column("proctoring_enabled", sa.Boolean(), nullable=False),
        sa.Column("attempt_limit", sa.Integer(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("instructions", sa.String(length=4000), nullable=True),
        sa.Column("created_by_user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    _create_index_if_missing("ix_online_exam_configs_school_id", "online_exam_configs", ["school_id"])
    _create_index_if_missing("ix_online_exam_configs_exam_schedule_id", "online_exam_configs", ["exam_schedule_id"])
    _create_index_if_missing("ix_online_exam_configs_created_by_user_id", "online_exam_configs", ["created_by_user_id"])

    _create_table_if_missing(
        "online_exam_config_questions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("config_id", sa.Uuid(as_uuid=True), sa.ForeignKey("online_exam_configs.id"), nullable=False),
        sa.Column("question_id", sa.Uuid(as_uuid=True), sa.ForeignKey("question_bank_questions.id"), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("points", sa.Integer(), nullable=True),
    )
    _create_index_if_missing("ix_online_exam_config_questions_school_id", "online_exam_config_questions", ["school_id"])
    _create_index_if_missing("ix_online_exam_config_questions_config_id", "online_exam_config_questions", ["config_id"])
    _create_index_if_missing("ix_online_exam_config_questions_question_id", "online_exam_config_questions", ["question_id"])

    _create_table_if_missing(
        "online_exam_attempts",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("config_id", sa.Uuid(as_uuid=True), sa.ForeignKey("online_exam_configs.id"), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("attempt_no", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("max_score", sa.Integer(), nullable=True),
        sa.Column("percentage", sa.Float(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=400), nullable=True),
    )
    _create_index_if_missing("ix_online_exam_attempts_school_id", "online_exam_attempts", ["school_id"])
    _create_index_if_missing("ix_online_exam_attempts_config_id", "online_exam_attempts", ["config_id"])
    _create_index_if_missing("ix_online_exam_attempts_student_id", "online_exam_attempts", ["student_id"])

    _create_table_if_missing(
        "online_exam_answers",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("attempt_id", sa.Uuid(as_uuid=True), sa.ForeignKey("online_exam_attempts.id"), nullable=False),
        sa.Column("question_id", sa.Uuid(as_uuid=True), sa.ForeignKey("question_bank_questions.id"), nullable=False),
        sa.Column("answer", sa.JSON(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("awarded_points", sa.Integer(), nullable=True),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=False),
    )
    _create_index_if_missing("ix_online_exam_answers_school_id", "online_exam_answers", ["school_id"])
    _create_index_if_missing("ix_online_exam_answers_attempt_id", "online_exam_answers", ["attempt_id"])
    _create_index_if_missing("ix_online_exam_answers_question_id", "online_exam_answers", ["question_id"])

    _create_table_if_missing(
        "online_exam_proctor_events",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("attempt_id", sa.Uuid(as_uuid=True), sa.ForeignKey("online_exam_attempts.id"), nullable=False),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    _create_index_if_missing("ix_online_exam_proctor_events_school_id", "online_exam_proctor_events", ["school_id"])
    _create_index_if_missing("ix_online_exam_proctor_events_attempt_id", "online_exam_proctor_events", ["attempt_id"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    for t in [
        "online_exam_proctor_events",
        "online_exam_answers",
        "online_exam_attempts",
        "online_exam_config_questions",
        "online_exam_configs",
        "question_bank_questions",
        "question_bank_categories",
    ]:
        if t in insp.get_table_names():
            op.drop_table(t)

    if "students" in insp.get_table_names():
        idx = {i["name"] for i in insp.get_indexes("students")}
        if "ix_students_user_id" in idx:
            op.drop_index("ix_students_user_id", table_name="students")
        cols = {c["name"] for c in insp.get_columns("students")}
        if "user_id" in cols:
            op.drop_column("students", "user_id")

