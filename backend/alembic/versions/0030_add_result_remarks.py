"""add result remarks

Revision ID: 0030
Revises: 0029
Create Date: 2026-01-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0030_add_result_remarks'
down_revision = '0029_add_user_profile_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Helper to check if column exists
    bind = op.get_bind()
    insp = sa.inspect(bind)
    columns = [col['name'] for col in insp.get_columns('results')]
    
    if 'remarks' not in columns:
        op.add_column('results', sa.Column('remarks', sa.String(length=500), nullable=True))


def downgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    columns = [col['name'] for col in insp.get_columns('results')]
    
    if 'remarks' in columns:
        op.drop_column('results', 'remarks')
