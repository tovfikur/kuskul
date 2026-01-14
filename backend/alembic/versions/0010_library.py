"""library books and issues

Revision ID: 0010_library
Revises: 0009_comms
Create Date: 2026-01-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "library_books",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("author", sa.String(length=150), nullable=True),
        sa.Column("category", sa.String(length=80), nullable=True),
        sa.Column("isbn", sa.String(length=32), nullable=True),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("total_copies", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("available_copies", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("cover_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_library_books_school_id", "library_books", ["school_id"])
    op.create_index("ix_library_books_isbn", "library_books", ["isbn"])
    op.create_index("ix_library_books_category", "library_books", ["category"])

    op.create_table(
        "library_issues",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("book_id", sa.Uuid(as_uuid=True), sa.ForeignKey("library_books.id"), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default=sa.text("'issued'")),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("returned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("renewed_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("fine_amount", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.create_index("ix_library_issues_school_id", "library_issues", ["school_id"])
    op.create_index("ix_library_issues_book_id", "library_issues", ["book_id"])
    op.create_index("ix_library_issues_user_id", "library_issues", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_library_issues_user_id", table_name="library_issues")
    op.drop_index("ix_library_issues_book_id", table_name="library_issues")
    op.drop_index("ix_library_issues_school_id", table_name="library_issues")
    op.drop_table("library_issues")

    op.drop_index("ix_library_books_category", table_name="library_books")
    op.drop_index("ix_library_books_isbn", table_name="library_books")
    op.drop_index("ix_library_books_school_id", table_name="library_books")
    op.drop_table("library_books")

