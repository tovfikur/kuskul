"""guardians and staff

Revision ID: 0004_guardians_staff
Revises: 0003_students_enrollments
Create Date: 2026-01-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "guardians",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("photo_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_guardians_school_id", "guardians", ["school_id"])

    op.create_table(
        "student_guardians",
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), primary_key=True),
        sa.Column("guardian_id", sa.Uuid(as_uuid=True), sa.ForeignKey("guardians.id"), primary_key=True),
    )
    op.create_index("ix_student_guardians_student_id", "student_guardians", ["student_id"])
    op.create_index("ix_student_guardians_guardian_id", "student_guardians", ["guardian_id"])

    op.create_table(
        "staff",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column("designation", sa.String(length=100), nullable=True),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("date_of_joining", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'active'")),
        sa.Column("photo_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_staff_school_id", "staff", ["school_id"])


def downgrade() -> None:
    op.drop_index("ix_staff_school_id", table_name="staff")
    op.drop_table("staff")

    op.drop_index("ix_student_guardians_guardian_id", table_name="student_guardians")
    op.drop_index("ix_student_guardians_student_id", table_name="student_guardians")
    op.drop_table("student_guardians")

    op.drop_index("ix_guardians_school_id", table_name="guardians")
    op.drop_table("guardians")
