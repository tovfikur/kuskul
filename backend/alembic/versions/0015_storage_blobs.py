"""storage blobs

Revision ID: 0015_storage_blobs
Revises: 0014_backup_entries
Create Date: 2026-01-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("content_type", sa.String(length=120), nullable=True))
    op.add_column("documents", sa.Column("content", sa.LargeBinary(), nullable=True))

    op.add_column("certificates", sa.Column("content_type", sa.String(length=120), nullable=True))
    op.add_column("certificates", sa.Column("content", sa.LargeBinary(), nullable=True))

    op.add_column("backup_entries", sa.Column("content_type", sa.String(length=120), nullable=True))
    op.add_column("backup_entries", sa.Column("content", sa.LargeBinary(), nullable=True))


def downgrade() -> None:
    op.drop_column("backup_entries", "content")
    op.drop_column("backup_entries", "content_type")

    op.drop_column("certificates", "content")
    op.drop_column("certificates", "content_type")

    op.drop_column("documents", "content")
    op.drop_column("documents", "content_type")

