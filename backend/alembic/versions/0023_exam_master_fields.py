from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0023"
down_revision = "0022"
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
    _add_column_if_missing("exams", sa.Column("exam_code", sa.String(length=64), nullable=True))
    _create_index_if_missing("ix_exams_exam_code", "exams", ["exam_code"])

    _add_column_if_missing("exams", sa.Column("status", sa.String(length=24), nullable=False, server_default=sa.text("'draft'")))

    _add_column_if_missing("exams", sa.Column("weight_percentage", sa.Integer(), nullable=True))
    _add_column_if_missing("exams", sa.Column("included_in_final_result", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    _add_column_if_missing("exams", sa.Column("best_of_count", sa.Integer(), nullable=True))
    _add_column_if_missing("exams", sa.Column("aggregation_method", sa.String(length=24), nullable=True))
    _add_column_if_missing("exams", sa.Column("counts_for_gpa", sa.Boolean(), nullable=False, server_default=sa.text("true")))

    _add_column_if_missing("exams", sa.Column("result_entry_deadline", sa.Date(), nullable=True))
    _add_column_if_missing("exams", sa.Column("result_publish_date", sa.Date(), nullable=True))
    _add_column_if_missing("exams", sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True))
    _add_column_if_missing("exams", sa.Column("is_result_editable", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    _add_column_if_missing("exams", sa.Column("instructions", sa.String(length=4000), nullable=True))

    _add_column_if_missing(
        "exams", sa.Column("created_by_user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=True)
    )
    _create_index_if_missing("ix_exams_created_by_user_id", "exams", ["created_by_user_id"])
    _add_column_if_missing(
        "exams", sa.Column("updated_by_user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=True)
    )
    _create_index_if_missing("ix_exams_updated_by_user_id", "exams", ["updated_by_user_id"])

    _add_column_if_missing("exams", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if "exams" not in insp.get_table_names():
        return

    idx = {i["name"] for i in insp.get_indexes("exams")}
    for name in [
        "ix_exams_exam_code",
        "ix_exams_created_by_user_id",
        "ix_exams_updated_by_user_id",
    ]:
        if name in idx:
            op.drop_index(name, table_name="exams")

    cols = {c["name"] for c in insp.get_columns("exams")}
    for col in [
        "exam_code",
        "status",
        "weight_percentage",
        "included_in_final_result",
        "best_of_count",
        "aggregation_method",
        "counts_for_gpa",
        "result_entry_deadline",
        "result_publish_date",
        "locked_at",
        "is_result_editable",
        "instructions",
        "created_by_user_id",
        "updated_by_user_id",
        "updated_at",
    ]:
        if col in cols:
            op.drop_column("exams", col)
