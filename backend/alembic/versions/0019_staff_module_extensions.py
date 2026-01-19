from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0019"
down_revision = "0018"
branch_labels = None
depends_on = None


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    bind = op.get_bind()
    existing = {c["name"] for c in inspect(bind).get_columns(table_name)}
    if column.name not in existing:
        op.add_column(table_name, column)


def _create_table_if_missing(table_name: str, *columns: sa.Column) -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if table_name in insp.get_table_names():
        return
    op.create_table(table_name, *columns)


def _create_index_if_missing(index_name: str, table_name: str, columns: list[str]) -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    existing = {i["name"] for i in insp.get_indexes(table_name)}
    if index_name in existing:
        return
    op.create_index(index_name, table_name, columns)


def upgrade() -> None:
    _add_column_if_missing("staff", sa.Column("employee_id", sa.String(length=64), nullable=True))
    _add_column_if_missing("staff", sa.Column("emergency_contact_name", sa.String(length=200), nullable=True))
    _add_column_if_missing("staff", sa.Column("emergency_contact_phone", sa.String(length=32), nullable=True))
    _add_column_if_missing("staff", sa.Column("emergency_contact_relation", sa.String(length=64), nullable=True))
    _create_index_if_missing("ix_staff_employee_id", "staff", ["employee_id"])

    _add_column_if_missing("staff_attendance", sa.Column("check_in_at", sa.DateTime(timezone=True), nullable=True))
    _add_column_if_missing("staff_attendance", sa.Column("check_out_at", sa.DateTime(timezone=True), nullable=True))
    _add_column_if_missing("staff_attendance", sa.Column("method", sa.String(length=32), nullable=True))
    _add_column_if_missing("staff_attendance", sa.Column("device_id", sa.String(length=100), nullable=True))

    _create_table_if_missing(
        "staff_qualifications",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("staff_id", sa.Uuid(as_uuid=True), sa.ForeignKey("staff.id"), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("institution", sa.String(length=200), nullable=True),
        sa.Column("issued_on", sa.Date(), nullable=True),
        sa.Column("expires_on", sa.Date(), nullable=True),
        sa.Column("credential_id", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    _create_index_if_missing("ix_staff_qualifications_school_id", "staff_qualifications", ["school_id"])
    _create_index_if_missing("ix_staff_qualifications_staff_id", "staff_qualifications", ["staff_id"])

    _create_table_if_missing(
        "staff_performance_records",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("staff_id", sa.Uuid(as_uuid=True), sa.ForeignKey("staff.id"), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=True),
        sa.Column("period_end", sa.Date(), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("summary", sa.String(length=2000), nullable=True),
        sa.Column("created_by_user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    _create_index_if_missing("ix_staff_performance_records_school_id", "staff_performance_records", ["school_id"])
    _create_index_if_missing("ix_staff_performance_records_staff_id", "staff_performance_records", ["staff_id"])
    _create_index_if_missing(
        "ix_staff_performance_records_created_by_user_id",
        "staff_performance_records",
        ["created_by_user_id"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    if "staff_performance_records" in insp.get_table_names():
        op.drop_table("staff_performance_records")
    if "staff_qualifications" in insp.get_table_names():
        op.drop_table("staff_qualifications")

    if "staff_attendance" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("staff_attendance")}
        for name in ["device_id", "method", "check_out_at", "check_in_at"]:
            if name in cols:
                op.drop_column("staff_attendance", name)

    if "staff" in insp.get_table_names():
        idx = {i["name"] for i in insp.get_indexes("staff")}
        if "ix_staff_employee_id" in idx:
            op.drop_index("ix_staff_employee_id", table_name="staff")
        cols = {c["name"] for c in insp.get_columns("staff")}
        for name in ["emergency_contact_relation", "emergency_contact_phone", "emergency_contact_name", "employee_id"]:
            if name in cols:
                op.drop_column("staff", name)

