"""teacher assignments and attendance

Revision ID: 0005_teacher_assignments_attendance
Revises: 0004_guardians_staff
Create Date: 2026-01-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "teacher_assignments",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("academic_year_id", sa.Uuid(as_uuid=True), sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("staff_id", sa.Uuid(as_uuid=True), sa.ForeignKey("staff.id"), nullable=False),
        sa.Column("section_id", sa.Uuid(as_uuid=True), sa.ForeignKey("sections.id"), nullable=False),
        sa.Column("subject_id", sa.Uuid(as_uuid=True), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_teacher_assignments_academic_year_id", "teacher_assignments", ["academic_year_id"])
    op.create_index("ix_teacher_assignments_staff_id", "teacher_assignments", ["staff_id"])
    op.create_index("ix_teacher_assignments_section_id", "teacher_assignments", ["section_id"])
    op.create_index("ix_teacher_assignments_subject_id", "teacher_assignments", ["subject_id"])

    op.create_table(
        "student_attendance",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("attendance_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("section_id", sa.Uuid(as_uuid=True), sa.ForeignKey("sections.id"), nullable=True),
        sa.Column("class_id", sa.Uuid(as_uuid=True), sa.ForeignKey("classes.id"), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'present'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_student_attendance_attendance_date", "student_attendance", ["attendance_date"])
    op.create_index("ix_student_attendance_student_id", "student_attendance", ["student_id"])
    op.create_index("ix_student_attendance_section_id", "student_attendance", ["section_id"])
    op.create_index("ix_student_attendance_class_id", "student_attendance", ["class_id"])

    op.create_table(
        "staff_attendance",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("attendance_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("staff_id", sa.Uuid(as_uuid=True), sa.ForeignKey("staff.id"), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'present'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_staff_attendance_attendance_date", "staff_attendance", ["attendance_date"])
    op.create_index("ix_staff_attendance_staff_id", "staff_attendance", ["staff_id"])


def downgrade() -> None:
    op.drop_index("ix_staff_attendance_staff_id", table_name="staff_attendance")
    op.drop_index("ix_staff_attendance_attendance_date", table_name="staff_attendance")
    op.drop_table("staff_attendance")

    op.drop_index("ix_student_attendance_class_id", table_name="student_attendance")
    op.drop_index("ix_student_attendance_section_id", table_name="student_attendance")
    op.drop_index("ix_student_attendance_student_id", table_name="student_attendance")
    op.drop_index("ix_student_attendance_attendance_date", table_name="student_attendance")
    op.drop_table("student_attendance")

    op.drop_index("ix_teacher_assignments_subject_id", table_name="teacher_assignments")
    op.drop_index("ix_teacher_assignments_section_id", table_name="teacher_assignments")
    op.drop_index("ix_teacher_assignments_staff_id", table_name="teacher_assignments")
    op.drop_index("ix_teacher_assignments_academic_year_id", table_name="teacher_assignments")
    op.drop_table("teacher_assignments")
