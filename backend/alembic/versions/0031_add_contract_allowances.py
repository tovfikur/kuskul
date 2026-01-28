"""add contract allowances

Revision ID: 0031
Revises: 0030_add_result_remarks
Create Date: 2026-01-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0031_add_contract_allowances'
down_revision = '0030_add_result_remarks'
branch_labels = None
depends_on = None


def upgrade():
    # Helper to check if column exists
    bind = op.get_bind()
    insp = sa.inspect(bind)
    columns = [col['name'] for col in insp.get_columns('staff_contracts')]
    
    if 'allowances' not in columns:
        op.add_column('staff_contracts', sa.Column('allowances', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='{}'))
    if 'deductions' not in columns:
        op.add_column('staff_contracts', sa.Column('deductions', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='{}'))


def downgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    columns = [col['name'] for col in insp.get_columns('staff_contracts')]
    
    if 'allowances' in columns:
        op.drop_column('staff_contracts', 'allowances')
    if 'deductions' in columns:
        op.drop_column('staff_contracts', 'deductions')
