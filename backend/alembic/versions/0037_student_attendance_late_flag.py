"""store late arrival separately from attendance status

Revision ID: 0037_student_attendance_late_flag
Revises: 0036_hikvision_student_attendance
"""
from alembic import op
import sqlalchemy as sa


revision = "0037_student_attendance_late_flag"
down_revision = "0036_hikvision_student_attendance"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("student_attendance")}
    if "is_late" not in columns:
        op.add_column("student_attendance", sa.Column("is_late", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.execute("UPDATE student_attendance SET status = 'present', is_late = true WHERE status = 'late'")


def downgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("student_attendance")}
    if "is_late" in columns:
        op.execute("UPDATE student_attendance SET status = 'late' WHERE is_late = true AND status = 'present'")
        op.drop_column("student_attendance", "is_late")
