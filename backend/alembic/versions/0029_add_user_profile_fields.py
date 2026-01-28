"""add user profile fields

Revision ID: 0029_add_user_profile_fields
Revises: 0028_add_events_table
Create Date: 2026-01-25 23:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0029_add_user_profile_fields'
down_revision = '0028_add_events_table'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    user_columns = [col['name'] for col in insp.get_columns('users')]

    if 'full_name' not in user_columns:
        op.add_column('users', sa.Column('full_name', sa.String(length=200), nullable=True))
    if 'phone' not in user_columns:
        op.add_column('users', sa.Column('phone', sa.String(length=32), nullable=True))
    if 'photo_url' not in user_columns:
        op.add_column('users', sa.Column('photo_url', sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column('users', 'photo_url')
    op.drop_column('users', 'phone')
    op.drop_column('users', 'full_name')
