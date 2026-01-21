from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def _create_table_if_missing(table_name: str, *columns: sa.Column) -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if table_name in insp.get_table_names():
        return
    op.create_table(table_name, *columns)


def upgrade() -> None:
    _create_table_if_missing(
        "exam_type_master",
        sa.Column("code", sa.String(length=32), primary_key=True, nullable=False),
        sa.Column("label", sa.String(length=64), nullable=False),
        sa.Column("frequency_hint", sa.String(length=64), nullable=True),
        sa.Column("weight_min", sa.Integer(), nullable=True),
        sa.Column("weight_max", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if "exam_type_master" in insp.get_table_names():
        op.drop_table("exam_type_master")
