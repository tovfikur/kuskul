"""change enrollment roll number to string

Revision ID: 0034_roll_number_string
Revises: 0033_seed_default_designations
Create Date: 2026-07-22 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "0034_roll_number_string"
down_revision = "0033_seed_default_designations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "enrollments" not in insp.get_table_names():
        return
    columns = [col["name"] for col in insp.get_columns("enrollments")]
    if "roll_number" not in columns:
        return
    op.alter_column(
        "enrollments",
        "roll_number",
        existing_type=sa.Integer(),
        type_=sa.String(length=32),
        existing_nullable=True,
        postgresql_using="roll_number::text",
    )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "enrollments" not in insp.get_table_names():
        return
    columns = [col["name"] for col in insp.get_columns("enrollments")]
    if "roll_number" not in columns:
        return
    op.alter_column(
        "enrollments",
        "roll_number",
        existing_type=sa.String(length=32),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using="NULLIF(regexp_replace(roll_number, '\\D', '', 'g'), '')::integer",
    )
