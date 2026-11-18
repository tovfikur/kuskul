"""allow anonymous admission document uploads

Revision ID: 0039_public_admission_documents
Revises: ee7235d3affe, 0038_communication_log_sms_fields
Create Date: 2026-11-13
"""
from alembic import op
import sqlalchemy as sa


revision = "0039_public_admission_documents"
down_revision = ("ee7235d3affe", "0038_communication_log_sms_fields")
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"]: column for column in sa.inspect(bind).get_columns("documents")}
    column = columns.get("uploaded_by_user_id")
    if column and not column.get("nullable", False):
        with op.batch_alter_table("documents") as batch:
            batch.alter_column(
                "uploaded_by_user_id",
                existing_type=sa.Uuid(),
                nullable=True,
            )


def downgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"]: column for column in sa.inspect(bind).get_columns("documents")}
    column = columns.get("uploaded_by_user_id")
    if column and column.get("nullable", False):
        with op.batch_alter_table("documents") as batch:
            batch.alter_column(
                "uploaded_by_user_id",
                existing_type=sa.Uuid(),
                nullable=False,
            )
