"""exams schedules marks results grades

Revision ID: 0007_exams_results_marks
Revises: 0006_leaves_timetable
Create Date: 2026-01-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "exams",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("academic_year_id", sa.Uuid(as_uuid=True), sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("exam_type", sa.String(length=64), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_exams_academic_year_id", "exams", ["academic_year_id"])

    op.create_table(
        "exam_schedules",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("exam_id", sa.Uuid(as_uuid=True), sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("class_id", sa.Uuid(as_uuid=True), sa.ForeignKey("classes.id"), nullable=False),
        sa.Column("subject_id", sa.Uuid(as_uuid=True), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("exam_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.Column("room", sa.String(length=50), nullable=True),
        sa.Column("max_marks", sa.Integer(), nullable=False, server_default=sa.text("100")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_exam_schedules_exam_id", "exam_schedules", ["exam_id"])
    op.create_index("ix_exam_schedules_class_id", "exam_schedules", ["class_id"])
    op.create_index("ix_exam_schedules_subject_id", "exam_schedules", ["subject_id"])

    op.create_table(
        "marks",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("exam_schedule_id", sa.Uuid(as_uuid=True), sa.ForeignKey("exam_schedules.id"), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("marks_obtained", sa.Integer(), nullable=True),
        sa.Column("is_absent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("remarks", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_marks_exam_schedule_id", "marks", ["exam_schedule_id"])
    op.create_index("ix_marks_student_id", "marks", ["student_id"])

    op.create_table(
        "grades",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("name", sa.String(length=32), nullable=False),
        sa.Column("min_percentage", sa.Float(), nullable=False),
        sa.Column("max_percentage", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_grades_school_id", "grades", ["school_id"])

    op.create_table(
        "results",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("exam_id", sa.Uuid(as_uuid=True), sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("total_marks", sa.Integer(), nullable=False),
        sa.Column("obtained_marks", sa.Integer(), nullable=False),
        sa.Column("percentage", sa.Float(), nullable=False),
        sa.Column("grade_id", sa.Uuid(as_uuid=True), sa.ForeignKey("grades.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_results_exam_id", "results", ["exam_id"])
    op.create_index("ix_results_student_id", "results", ["student_id"])
    op.create_index("ix_results_grade_id", "results", ["grade_id"])


def downgrade() -> None:
    op.drop_index("ix_results_grade_id", table_name="results")
    op.drop_index("ix_results_student_id", table_name="results")
    op.drop_index("ix_results_exam_id", table_name="results")
    op.drop_table("results")

    op.drop_index("ix_grades_school_id", table_name="grades")
    op.drop_table("grades")

    op.drop_index("ix_marks_student_id", table_name="marks")
    op.drop_index("ix_marks_exam_schedule_id", table_name="marks")
    op.drop_table("marks")

    op.drop_index("ix_exam_schedules_subject_id", table_name="exam_schedules")
    op.drop_index("ix_exam_schedules_class_id", table_name="exam_schedules")
    op.drop_index("ix_exam_schedules_exam_id", table_name="exam_schedules")
    op.drop_table("exam_schedules")

    op.drop_index("ix_exams_academic_year_id", table_name="exams")
    op.drop_table("exams")

