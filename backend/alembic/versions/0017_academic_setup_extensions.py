"""academic setup extensions

Revision ID: 0017_academic_setup_extensions
Revises: 0016
Create Date: 2026-01-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "streams",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_streams_school_id", "streams", ["school_id"])

    op.create_table(
        "subject_groups",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("class_id", sa.Uuid(as_uuid=True), sa.ForeignKey("classes.id"), nullable=True),
        sa.Column(
            "stream_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("streams.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("is_optional", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_subject_groups_school_id", "subject_groups", ["school_id"])

    op.create_table(
        "terms",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("academic_year_id", sa.Uuid(as_uuid=True), sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("weightage", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_terms_academic_year_id", "terms", ["academic_year_id"])

    op.create_table(
        "curriculum_units",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("academic_year_id", sa.Uuid(as_uuid=True), sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("subject_id", sa.Uuid(as_uuid=True), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_curriculum_units_academic_year_id", "curriculum_units", ["academic_year_id"])
    op.create_index("ix_curriculum_units_subject_id", "curriculum_units", ["subject_id"])

    op.create_table(
        "academic_calendar_settings",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "academic_year_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("academic_years.id"),
            nullable=False,
            unique=True,
        ),
        sa.Column("working_days_mask", sa.Integer(), nullable=False, server_default=sa.text("31")),
        sa.Column("shift", sa.String(length=32), nullable=False, server_default="morning"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_academic_calendar_settings_academic_year_id", "academic_calendar_settings", ["academic_year_id"])

    op.add_column("classes", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("sections", sa.Column("stream_id", sa.Uuid(as_uuid=True), nullable=True))
    op.add_column("sections", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.create_index("ix_sections_stream_id", "sections", ["stream_id"])
    op.create_foreign_key(
        "fk_sections_stream_id_streams", "sections", "streams", ["stream_id"], ["id"], ondelete="SET NULL"
    )

    op.add_column("subjects", sa.Column("subject_type", sa.String(length=32), nullable=False, server_default="theory"))
    op.add_column("subjects", sa.Column("credits", sa.Integer(), nullable=True))
    op.add_column("subjects", sa.Column("max_marks", sa.Integer(), nullable=True))
    op.add_column("subjects", sa.Column("group_id", sa.Uuid(as_uuid=True), nullable=True))
    op.add_column("subjects", sa.Column("stream_id", sa.Uuid(as_uuid=True), nullable=True))
    op.add_column("subjects", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.create_index("ix_subjects_group_id", "subjects", ["group_id"])
    op.create_index("ix_subjects_stream_id", "subjects", ["stream_id"])
    op.create_foreign_key(
        "fk_subjects_group_id_subject_groups", "subjects", "subject_groups", ["group_id"], ["id"], ondelete="SET NULL"
    )
    op.create_foreign_key(
        "fk_subjects_stream_id_streams", "subjects", "streams", ["stream_id"], ["id"], ondelete="SET NULL"
    )

    op.add_column("time_slots", sa.Column("slot_type", sa.String(length=32), nullable=False, server_default="class"))
    op.add_column("time_slots", sa.Column("shift", sa.String(length=32), nullable=False, server_default="morning"))


def downgrade() -> None:
    op.drop_column("time_slots", "shift")
    op.drop_column("time_slots", "slot_type")

    op.drop_constraint("fk_subjects_stream_id_streams", "subjects", type_="foreignkey")
    op.drop_constraint("fk_subjects_group_id_subject_groups", "subjects", type_="foreignkey")
    op.drop_index("ix_subjects_stream_id", table_name="subjects")
    op.drop_index("ix_subjects_group_id", table_name="subjects")
    op.drop_column("subjects", "is_active")
    op.drop_column("subjects", "stream_id")
    op.drop_column("subjects", "group_id")
    op.drop_column("subjects", "max_marks")
    op.drop_column("subjects", "credits")
    op.drop_column("subjects", "subject_type")

    op.drop_constraint("fk_sections_stream_id_streams", "sections", type_="foreignkey")
    op.drop_index("ix_sections_stream_id", table_name="sections")
    op.drop_column("sections", "is_active")
    op.drop_column("sections", "stream_id")

    op.drop_column("classes", "is_active")

    op.drop_index("ix_academic_calendar_settings_academic_year_id", table_name="academic_calendar_settings")
    op.drop_table("academic_calendar_settings")

    op.drop_index("ix_curriculum_units_subject_id", table_name="curriculum_units")
    op.drop_index("ix_curriculum_units_academic_year_id", table_name="curriculum_units")
    op.drop_table("curriculum_units")

    op.drop_index("ix_terms_academic_year_id", table_name="terms")
    op.drop_table("terms")

    op.drop_index("ix_subject_groups_school_id", table_name="subject_groups")
    op.drop_table("subject_groups")

    op.drop_index("ix_streams_school_id", table_name="streams")
    op.drop_table("streams")

