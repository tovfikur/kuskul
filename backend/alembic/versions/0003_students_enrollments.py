"""students and enrollments

Revision ID: 0003_students_enrollments
Revises: 0002_academic_structure
Create Date: 2026-01-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "students",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=True),
        sa.Column("admission_no", sa.String(length=64), nullable=True),
        sa.Column("gender", sa.String(length=16), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'active'")),
        sa.Column("photo_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_students_school_id", "students", ["school_id"])
    op.create_index("ix_students_admission_no", "students", ["admission_no"])

    op.create_table(
        "enrollments",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("academic_year_id", sa.Uuid(as_uuid=True), sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("class_id", sa.Uuid(as_uuid=True), sa.ForeignKey("classes.id"), nullable=False),
        sa.Column("section_id", sa.Uuid(as_uuid=True), sa.ForeignKey("sections.id"), nullable=True),
        sa.Column("roll_number", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'active'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_enrollments_student_id", "enrollments", ["student_id"])
    op.create_index("ix_enrollments_academic_year_id", "enrollments", ["academic_year_id"])
    op.create_index("ix_enrollments_class_id", "enrollments", ["class_id"])
    op.create_index("ix_enrollments_section_id", "enrollments", ["section_id"])


def downgrade() -> None:
    op.drop_index("ix_enrollments_section_id", table_name="enrollments")
    op.drop_index("ix_enrollments_class_id", table_name="enrollments")
    op.drop_index("ix_enrollments_academic_year_id", table_name="enrollments")
    op.drop_index("ix_enrollments_student_id", table_name="enrollments")
    op.drop_table("enrollments")

    op.drop_index("ix_students_admission_no", table_name="students")
    op.drop_index("ix_students_school_id", table_name="students")
    op.drop_table("students")
