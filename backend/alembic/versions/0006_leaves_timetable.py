"""leaves timetable time slots

Revision ID: 0006_leaves_timetable
Revises: 0005_teacher_assignments_attendance
Create Date: 2026-01-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "leaves",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("requester_user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("user_type", sa.String(length=32), nullable=False, server_default=sa.text("'staff'")),
        sa.Column("staff_id", sa.Uuid(as_uuid=True), sa.ForeignKey("staff.id"), nullable=True),
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("reason", sa.String(length=1000), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("reviewed_by_user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_leaves_school_id", "leaves", ["school_id"])
    op.create_index("ix_leaves_requester_user_id", "leaves", ["requester_user_id"])
    op.create_index("ix_leaves_staff_id", "leaves", ["staff_id"])
    op.create_index("ix_leaves_student_id", "leaves", ["student_id"])

    op.create_table(
        "time_slots",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_time_slots_school_id", "time_slots", ["school_id"])

    op.create_table(
        "timetable_entries",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("academic_year_id", sa.Uuid(as_uuid=True), sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("section_id", sa.Uuid(as_uuid=True), sa.ForeignKey("sections.id"), nullable=False),
        sa.Column("staff_id", sa.Uuid(as_uuid=True), sa.ForeignKey("staff.id"), nullable=True),
        sa.Column("subject_id", sa.Uuid(as_uuid=True), sa.ForeignKey("subjects.id"), nullable=True),
        sa.Column("time_slot_id", sa.Uuid(as_uuid=True), sa.ForeignKey("time_slots.id"), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("room", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_timetable_entries_academic_year_id", "timetable_entries", ["academic_year_id"])
    op.create_index("ix_timetable_entries_section_id", "timetable_entries", ["section_id"])
    op.create_index("ix_timetable_entries_staff_id", "timetable_entries", ["staff_id"])
    op.create_index("ix_timetable_entries_subject_id", "timetable_entries", ["subject_id"])
    op.create_index("ix_timetable_entries_time_slot_id", "timetable_entries", ["time_slot_id"])


def downgrade() -> None:
    op.drop_index("ix_timetable_entries_time_slot_id", table_name="timetable_entries")
    op.drop_index("ix_timetable_entries_subject_id", table_name="timetable_entries")
    op.drop_index("ix_timetable_entries_staff_id", table_name="timetable_entries")
    op.drop_index("ix_timetable_entries_section_id", table_name="timetable_entries")
    op.drop_index("ix_timetable_entries_academic_year_id", table_name="timetable_entries")
    op.drop_table("timetable_entries")

    op.drop_index("ix_time_slots_school_id", table_name="time_slots")
    op.drop_table("time_slots")

    op.drop_index("ix_leaves_student_id", table_name="leaves")
    op.drop_index("ix_leaves_staff_id", table_name="leaves")
    op.drop_index("ix_leaves_requester_user_id", table_name="leaves")
    op.drop_index("ix_leaves_school_id", table_name="leaves")
    op.drop_table("leaves")

