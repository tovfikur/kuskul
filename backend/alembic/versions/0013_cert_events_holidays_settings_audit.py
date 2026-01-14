"""certificates events holidays settings audit logs

Revision ID: 0013_cert_events_holidays_settings_audit
Revises: 0012_documents
Create Date: 2026-01-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "certificate_templates",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("template_type", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("content", sa.String(length=4000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_certificate_templates_school_id", "certificate_templates", ["school_id"])
    op.create_index("ix_certificate_templates_template_type", "certificate_templates", ["template_type"])

    op.create_table(
        "certificates",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("template_type", sa.String(length=32), nullable=False),
        sa.Column("generated_by_user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notes", sa.String(length=500), nullable=True),
    )
    op.create_index("ix_certificates_school_id", "certificates", ["school_id"])
    op.create_index("ix_certificates_student_id", "certificates", ["student_id"])
    op.create_index("ix_certificates_generated_by_user_id", "certificates", ["generated_by_user_id"])

    op.create_table(
        "events",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("event_type", sa.String(length=32), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("location", sa.String(length=200), nullable=True),
        sa.Column("is_all_day", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_events_school_id", "events", ["school_id"])
    op.create_index("ix_events_start_date", "events", ["start_date"])
    op.create_index("ix_events_end_date", "events", ["end_date"])

    op.create_table(
        "holidays",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("holiday_date", sa.Date(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("holiday_type", sa.String(length=32), nullable=True),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_holidays_school_id", "holidays", ["school_id"])
    op.create_index("ix_holidays_holiday_date", "holidays", ["holiday_date"])

    op.create_table(
        "settings",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("key", sa.String(length=120), nullable=False),
        sa.Column("value", sa.String(length=4000), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_settings_school_id", "settings", ["school_id"])
    op.create_index("ix_settings_key", "settings", ["key"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=True),
        sa.Column("entity_id", sa.String(length=64), nullable=True),
        sa.Column("details", sa.String(length=2000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_logs_school_id", "audit_logs", ["school_id"])
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
    op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_entity_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity_type", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_user_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_school_id", table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index("ix_settings_key", table_name="settings")
    op.drop_index("ix_settings_school_id", table_name="settings")
    op.drop_table("settings")

    op.drop_index("ix_holidays_holiday_date", table_name="holidays")
    op.drop_index("ix_holidays_school_id", table_name="holidays")
    op.drop_table("holidays")

    op.drop_index("ix_events_end_date", table_name="events")
    op.drop_index("ix_events_start_date", table_name="events")
    op.drop_index("ix_events_school_id", table_name="events")
    op.drop_table("events")

    op.drop_index("ix_certificates_generated_by_user_id", table_name="certificates")
    op.drop_index("ix_certificates_student_id", table_name="certificates")
    op.drop_index("ix_certificates_school_id", table_name="certificates")
    op.drop_table("certificates")

    op.drop_index("ix_certificate_templates_template_type", table_name="certificate_templates")
    op.drop_index("ix_certificate_templates_school_id", table_name="certificate_templates")
    op.drop_table("certificate_templates")

