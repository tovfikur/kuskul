"""add student id and category to communication logs

Revision ID: 0038_communication_log_sms_fields
Revises: 0037_student_attendance_late_flag
Create Date: 2026-09-12
"""
from alembic import op
import sqlalchemy as sa


revision = "0038_communication_log_sms_fields"
down_revision = "0037_student_attendance_late_flag"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("communication_logs")}
    with op.batch_alter_table("communication_logs") as batch:
        if "student_id" not in columns:
            batch.add_column(sa.Column("student_id", sa.Uuid(), sa.ForeignKey(
                "students.id", name="fk_communication_logs_student_id", ondelete="SET NULL"
            ), nullable=True))
        if "category" not in columns:
            batch.add_column(sa.Column("category", sa.String(32), nullable=True))
        if "provider_result" not in columns:
            batch.add_column(sa.Column("provider_result", sa.String(1000), nullable=True))
    indexes = {index["name"] for index in sa.inspect(bind).get_indexes("communication_logs")}
    if "ix_communication_logs_student_id" not in indexes:
        op.create_index("ix_communication_logs_student_id", "communication_logs", ["student_id"])


def downgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("communication_logs")}
    indexes = {index["name"] for index in sa.inspect(bind).get_indexes("communication_logs")}
    if "ix_communication_logs_student_id" in indexes:
        op.drop_index("ix_communication_logs_student_id", table_name="communication_logs")
    with op.batch_alter_table("communication_logs") as batch:
        for name in ("provider_result", "category", "student_id"):
            if name in columns:
                batch.drop_column(name)
