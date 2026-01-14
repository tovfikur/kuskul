"""backup entries

Revision ID: 0014_backup_entries
Revises: 0013_cert_events_holidays_settings_audit
Create Date: 2026-01-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "backup_entries",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'created'")),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_backup_entries_school_id", "backup_entries", ["school_id"])
    op.create_index("ix_backup_entries_created_by_user_id", "backup_entries", ["created_by_user_id"])


def downgrade() -> None:
    op.drop_index("ix_backup_entries_created_by_user_id", table_name="backup_entries")
    op.drop_index("ix_backup_entries_school_id", table_name="backup_entries")
    op.drop_table("backup_entries")
