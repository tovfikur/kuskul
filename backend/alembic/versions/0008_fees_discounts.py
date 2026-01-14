"""fees and discounts

Revision ID: 0008_fees_discounts
Revises: 0007_exams_results_marks
Create Date: 2026-01-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fee_structures",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("academic_year_id", sa.Uuid(as_uuid=True), sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("class_id", sa.Uuid(as_uuid=True), sa.ForeignKey("classes.id"), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_fee_structures_academic_year_id", "fee_structures", ["academic_year_id"])
    op.create_index("ix_fee_structures_class_id", "fee_structures", ["class_id"])

    op.create_table(
        "fee_payments",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("academic_year_id", sa.Uuid(as_uuid=True), sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("payment_method", sa.String(length=32), nullable=True),
        sa.Column("reference", sa.String(length=128), nullable=True),
        sa.Column("is_refund", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_fee_payments_student_id", "fee_payments", ["student_id"])
    op.create_index("ix_fee_payments_academic_year_id", "fee_payments", ["academic_year_id"])

    op.create_table(
        "fee_dues",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("academic_year_id", sa.Uuid(as_uuid=True), sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("total_fee", sa.Integer(), nullable=False),
        sa.Column("discount_amount", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("paid_amount", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("due_amount", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'due'")),
        sa.Column("last_calculated_date", sa.Date(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_fee_dues_student_id", "fee_dues", ["student_id"])
    op.create_index("ix_fee_dues_academic_year_id", "fee_dues", ["academic_year_id"])

    op.create_table(
        "discounts",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("discount_type", sa.String(length=16), nullable=False, server_default=sa.text("'percent'")),
        sa.Column("value", sa.Integer(), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_discounts_school_id", "discounts", ["school_id"])

    op.create_table(
        "student_discounts",
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), primary_key=True),
        sa.Column("discount_id", sa.Uuid(as_uuid=True), sa.ForeignKey("discounts.id"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_student_discounts_student_id", "student_discounts", ["student_id"])
    op.create_index("ix_student_discounts_discount_id", "student_discounts", ["discount_id"])


def downgrade() -> None:
    op.drop_index("ix_student_discounts_discount_id", table_name="student_discounts")
    op.drop_index("ix_student_discounts_student_id", table_name="student_discounts")
    op.drop_table("student_discounts")

    op.drop_index("ix_discounts_school_id", table_name="discounts")
    op.drop_table("discounts")

    op.drop_index("ix_fee_dues_academic_year_id", table_name="fee_dues")
    op.drop_index("ix_fee_dues_student_id", table_name="fee_dues")
    op.drop_table("fee_dues")

    op.drop_index("ix_fee_payments_academic_year_id", table_name="fee_payments")
    op.drop_index("ix_fee_payments_student_id", table_name="fee_payments")
    op.drop_table("fee_payments")

    op.drop_index("ix_fee_structures_class_id", table_name="fee_structures")
    op.drop_index("ix_fee_structures_academic_year_id", table_name="fee_structures")
    op.drop_table("fee_structures")

