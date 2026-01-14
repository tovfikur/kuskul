"""parent portal user binding and guardian relation fields

Revision ID: 0016_parent_portal
Revises: 0015
Create Date: 2026-01-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("guardians", sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=True))
    op.create_index("ix_guardians_user_id", "guardians", ["user_id"])
    op.create_foreign_key(
        "fk_guardians_user_id_users", "guardians", "users", ["user_id"], ["id"], ondelete="SET NULL"
    )

    op.add_column("guardians", sa.Column("emergency_contact_name", sa.String(length=200), nullable=True))
    op.add_column("guardians", sa.Column("emergency_contact_phone", sa.String(length=32), nullable=True))

    op.add_column("student_guardians", sa.Column("relation", sa.String(length=32), nullable=False, server_default="guardian"))
    op.add_column("student_guardians", sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.execute("UPDATE student_guardians SET is_primary = false WHERE is_primary IS NULL")
    op.alter_column("student_guardians", "relation", server_default=None)
    op.alter_column("student_guardians", "is_primary", server_default=None)

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("token_hash", sa.String(length=64), unique=True, index=True, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "user_preferences",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), index=True, nullable=False),
        sa.Column("language", sa.String(length=16), nullable=True),
        sa.Column("notify_sms", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("notify_email", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_push", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.alter_column("user_preferences", "notify_sms", server_default=None)
    op.alter_column("user_preferences", "notify_email", server_default=None)
    op.alter_column("user_preferences", "notify_push", server_default=None)

    op.create_table(
        "attendance_excuses",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), index=True, nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), index=True, nullable=False),
        sa.Column("guardian_id", sa.Uuid(as_uuid=True), sa.ForeignKey("guardians.id"), index=True, nullable=False),
        sa.Column("attendance_date", sa.Date(), index=True, nullable=False),
        sa.Column("reason", sa.String(length=1000), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("decided_by_user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), index=True, nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "discipline_records",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), index=True, nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), index=True, nullable=False),
        sa.Column("category", sa.String(length=64), nullable=True),
        sa.Column("note", sa.String(length=2000), nullable=False),
        sa.Column("is_positive", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("requires_ack", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.alter_column("discipline_records", "is_positive", server_default=None)
    op.alter_column("discipline_records", "requires_ack", server_default=None)

    op.create_table(
        "appointment_requests",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), index=True, nullable=False),
        sa.Column("guardian_id", sa.Uuid(as_uuid=True), sa.ForeignKey("guardians.id"), index=True, nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), index=True, nullable=True),
        sa.Column("staff_id", sa.Uuid(as_uuid=True), sa.ForeignKey("staff.id"), index=True, nullable=True),
        sa.Column("requested_for", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reason", sa.String(length=1000), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("response_note", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("appointment_requests")
    op.drop_table("discipline_records")
    op.drop_table("attendance_excuses")
    op.drop_table("user_preferences")
    op.drop_table("password_reset_tokens")
    op.drop_column("student_guardians", "is_primary")
    op.drop_column("student_guardians", "relation")
    op.drop_constraint("fk_guardians_user_id_users", "guardians", type_="foreignkey")
    op.drop_index("ix_guardians_user_id", table_name="guardians")
    op.drop_column("guardians", "emergency_contact_phone")
    op.drop_column("guardians", "emergency_contact_name")
    op.drop_column("guardians", "user_id")
