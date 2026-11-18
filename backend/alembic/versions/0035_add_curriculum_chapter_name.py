"""add curriculum chapter name

Revision ID: 0035_add_curriculum_chapter_name
Revises: 0034_roll_number_string
Create Date: 2026-07-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "0035_add_curriculum_chapter_name"
down_revision = "0034_roll_number_string"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "curriculum_units" not in insp.get_table_names():
        return
    columns = [col["name"] for col in insp.get_columns("curriculum_units")]
    if "chapter_name" not in columns:
        op.add_column("curriculum_units", sa.Column("chapter_name", sa.String(length=50), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "curriculum_units" not in insp.get_table_names():
        return
    columns = [col["name"] for col in insp.get_columns("curriculum_units")]
    if "chapter_name" in columns:
        op.drop_column("curriculum_units", "chapter_name")
