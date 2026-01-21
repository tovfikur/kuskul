from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    bind = op.get_bind()
    existing = {c["name"] for c in inspect(bind).get_columns(table_name)}
    if column.name not in existing:
        op.add_column(table_name, column)


def _create_index_if_missing(index_name: str, table_name: str, columns: list[str]) -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    existing = {i["name"] for i in insp.get_indexes(table_name)}
    if index_name in existing:
        return
    op.create_index(index_name, table_name, columns)


def upgrade() -> None:
    _add_column_if_missing("exams", sa.Column("exam_type_code", sa.String(length=32), nullable=True))
    _create_index_if_missing("ix_exams_exam_type_code", "exams", ["exam_type_code"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if "exams" not in insp.get_table_names():
        return
    idx = {i["name"] for i in insp.get_indexes("exams")}
    if "ix_exams_exam_type_code" in idx:
        op.drop_index("ix_exams_exam_type_code", table_name="exams")
    cols = {c["name"] for c in insp.get_columns("exams")}
    if "exam_type_code" in cols:
        op.drop_column("exams", "exam_type_code")

