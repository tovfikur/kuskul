"""add Hikvision student attendance integration tables

Revision ID: 0036_hikvision_attendance
Revises: 0035_add_curriculum_chapter_name
Create Date: 2026-08-12 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "0036_hikvision_attendance"
down_revision = "0035_add_curriculum_chapter_name"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "hikvision_devices" not in sa.inspect(bind).get_table_names():
        op.create_table(
            "hikvision_devices",
            sa.Column("id", sa.Uuid(), primary_key=True),
            sa.Column("school_id", sa.Uuid(), sa.ForeignKey("schools.id"), nullable=False),
            sa.Column("name", sa.String(120), nullable=False),
            sa.Column("external_device_id", sa.String(128), nullable=True),
            sa.Column("provider", sa.String(32), nullable=False, server_default="hikcentral_connect"),
            sa.Column("api_url", sa.String(255), nullable=False),
            sa.Column("app_key", sa.String(255), nullable=True),
            sa.Column("secret_key", sa.String(255), nullable=True),
            sa.Column("area_domain", sa.String(255), nullable=True),
            sa.Column("timezone", sa.String(64), nullable=False, server_default="Asia/Dhaka"),
            sa.Column("late_after", sa.String(5), nullable=True),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_hikvision_devices_school_id", "hikvision_devices", ["school_id"])
        op.create_index("ix_hikvision_devices_external_device_id", "hikvision_devices", ["external_device_id"])
    if "hikvision_student_credentials" not in sa.inspect(bind).get_table_names():
        op.create_table(
            "hikvision_student_credentials",
            sa.Column("id", sa.Uuid(), primary_key=True),
            sa.Column("device_id", sa.Uuid(), sa.ForeignKey("hikvision_devices.id"), nullable=False),
            sa.Column("student_id", sa.Uuid(), sa.ForeignKey("students.id"), nullable=False),
            sa.Column("person_code", sa.String(64), nullable=False),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("device_id", "person_code", name="uq_hikvision_device_person_code"),
        )
        op.create_index("ix_hikvision_student_credentials_device_id", "hikvision_student_credentials", ["device_id"])
        op.create_index("ix_hikvision_student_credentials_student_id", "hikvision_student_credentials", ["student_id"])
    if "hikvision_attendance_events" not in sa.inspect(bind).get_table_names():
        op.create_table(
            "hikvision_attendance_events",
            sa.Column("id", sa.Uuid(), primary_key=True),
            sa.Column("device_id", sa.Uuid(), sa.ForeignKey("hikvision_devices.id"), nullable=False),
            sa.Column("student_id", sa.Uuid(), sa.ForeignKey("students.id"), nullable=True),
            sa.Column("attendance_id", sa.Uuid(), sa.ForeignKey("student_attendance.id"), nullable=True),
            sa.Column("external_event_id", sa.String(128), nullable=True),
            sa.Column("person_code", sa.String(64), nullable=False),
            sa.Column("event_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("verification_method", sa.String(32), nullable=True),
            sa.Column("processing_status", sa.String(24), nullable=False),
            sa.Column("raw_payload", sa.JSON(), nullable=False),
            sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("device_id", "external_event_id", name="uq_hikvision_device_external_event"),
            sa.UniqueConstraint("device_id", "person_code", "event_at", name="uq_hikvision_device_person_time"),
        )
        op.create_index("ix_hikvision_attendance_events_device_id", "hikvision_attendance_events", ["device_id"])
        op.create_index("ix_hikvision_attendance_events_student_id", "hikvision_attendance_events", ["student_id"])
        op.create_index("ix_hikvision_attendance_events_attendance_id", "hikvision_attendance_events", ["attendance_id"])
        op.create_index("ix_hikvision_attendance_events_event_at", "hikvision_attendance_events", ["event_at"])


def downgrade() -> None:
    bind = op.get_bind()
    for table in ("hikvision_attendance_events", "hikvision_student_credentials", "hikvision_devices"):
        if table in sa.inspect(bind).get_table_names():
            op.drop_table(table)
