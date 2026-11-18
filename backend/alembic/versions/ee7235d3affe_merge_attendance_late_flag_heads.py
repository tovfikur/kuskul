"""merge attendance late flag heads

Revision ID: ee7235d3affe
Revises: 0037_student_attendance_late_flag, 0037_student_late_flag
Create Date: 2026-08-17 05:38:40.602725

"""

from alembic import op
import sqlalchemy as sa



revision = 'ee7235d3affe'
down_revision = ('0037_student_attendance_late_flag', '0037_student_late_flag')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
