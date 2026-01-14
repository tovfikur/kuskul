"""notices notifications messages communication logs

Revision ID: 0009_comms
Revises: 0008_fees_discounts
Create Date: 2026-01-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notices",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("notice_type", sa.String(length=32), nullable=True),
        sa.Column("target_audience", sa.String(length=32), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("content", sa.String(length=4000), nullable=False),
        sa.Column("attachment_url", sa.String(length=500), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_notices_school_id", "notices", ["school_id"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("notification_type", sa.String(length=32), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("message", sa.String(length=2000), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_notifications_school_id", "notifications", ["school_id"])
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])

    op.create_table(
        "messages",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("sender_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recipient_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("content", sa.String(length=4000), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_by_sender", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_by_recipient", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_messages_school_id", "messages", ["school_id"])
    op.create_index("ix_messages_sender_id", "messages", ["sender_id"])
    op.create_index("ix_messages_recipient_id", "messages", ["recipient_id"])

    op.create_table(
        "communication_logs",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("sent_by_user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("communication_type", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default=sa.text("'sent'")),
        sa.Column("recipient", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=200), nullable=True),
        sa.Column("body", sa.String(length=2000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_communication_logs_school_id", "communication_logs", ["school_id"])
    op.create_index("ix_communication_logs_sent_by_user_id", "communication_logs", ["sent_by_user_id"])


def downgrade() -> None:
    op.drop_index("ix_communication_logs_sent_by_user_id", table_name="communication_logs")
    op.drop_index("ix_communication_logs_school_id", table_name="communication_logs")
    op.drop_table("communication_logs")

    op.drop_index("ix_messages_recipient_id", table_name="messages")
    op.drop_index("ix_messages_sender_id", table_name="messages")
    op.drop_index("ix_messages_school_id", table_name="messages")
    op.drop_table("messages")

    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_index("ix_notifications_school_id", table_name="notifications")
    op.drop_table("notifications")

    op.drop_index("ix_notices_school_id", table_name="notices")
    op.drop_table("notices")

