"""documents

Revision ID: 0012_documents
Revises: 0011_transport
Create Date: 2026-01-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("uploaded_by_user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("entity_type", sa.String(length=32), nullable=True),
        sa.Column("entity_id", sa.String(length=64), nullable=True),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_documents_school_id", "documents", ["school_id"])
    op.create_index("ix_documents_uploaded_by_user_id", "documents", ["uploaded_by_user_id"])
    op.create_index("ix_documents_entity_type", "documents", ["entity_type"])
    op.create_index("ix_documents_entity_id", "documents", ["entity_id"])


def downgrade() -> None:
    op.drop_index("ix_documents_entity_id", table_name="documents")
    op.drop_index("ix_documents_entity_type", table_name="documents")
    op.drop_index("ix_documents_uploaded_by_user_id", table_name="documents")
    op.drop_index("ix_documents_school_id", table_name="documents")
    op.drop_table("documents")

