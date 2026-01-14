"""academic structure

Revision ID: 0002_academic_structure
Revises: 0001_init
Create Date: 2026-01-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "academic_years",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_academic_years_school_id", "academic_years", ["school_id"])

    op.create_table(
        "classes",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("numeric_value", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_classes_school_id", "classes", ["school_id"])

    op.create_table(
        "sections",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("class_id", sa.Uuid(as_uuid=True), sa.ForeignKey("classes.id"), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False, server_default=sa.text("40")),
        sa.Column("room_number", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_sections_class_id", "sections", ["class_id"])

    op.create_table(
        "subjects",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_subjects_school_id", "subjects", ["school_id"])

    op.create_table(
        "class_subjects",
        sa.Column("class_id", sa.Uuid(as_uuid=True), sa.ForeignKey("classes.id"), primary_key=True),
        sa.Column("subject_id", sa.Uuid(as_uuid=True), sa.ForeignKey("subjects.id"), primary_key=True),
    )


def downgrade() -> None:
    op.drop_table("class_subjects")
    op.drop_index("ix_subjects_school_id", table_name="subjects")
    op.drop_table("subjects")
    op.drop_index("ix_sections_class_id", table_name="sections")
    op.drop_table("sections")
    op.drop_index("ix_classes_school_id", table_name="classes")
    op.drop_table("classes")
    op.drop_index("ix_academic_years_school_id", table_name="academic_years")
    op.drop_table("academic_years")
