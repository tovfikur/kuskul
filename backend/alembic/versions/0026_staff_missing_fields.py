"""Add missing staff fields

Revision ID: 0026_staff_missing_fields
Revises: 0025_staff_management_enhanced
Create Date: 2026-01-21 23:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0026_staff_missing_fields'
down_revision = '0025_staff_management_enhanced'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    staff_columns = [col['name'] for col in insp.get_columns('staff')]

    with op.batch_alter_table('staff') as batch_op:
        if 'marital_status' not in staff_columns:
            batch_op.add_column(sa.Column('marital_status', sa.String(length=20), nullable=True))
        if 'religion' not in staff_columns:
            batch_op.add_column(sa.Column('religion', sa.String(length=50), nullable=True))
        if 'permanent_address' not in staff_columns:
            batch_op.add_column(sa.Column('permanent_address', sa.String(length=500), nullable=True))
        if 'country' not in staff_columns:
            batch_op.add_column(sa.Column('country', sa.String(length=100), nullable=True))
        if 'employment_type' not in staff_columns:
            batch_op.add_column(sa.Column('employment_type', sa.String(length=50), nullable=True))
        
        # Bank Details
        if 'bank_name' not in staff_columns:
            batch_op.add_column(sa.Column('bank_name', sa.String(length=100), nullable=True))
        if 'bank_account_number' not in staff_columns:
            batch_op.add_column(sa.Column('bank_account_number', sa.String(length=50), nullable=True))
        if 'bank_ifsc' not in staff_columns:
            batch_op.add_column(sa.Column('bank_ifsc', sa.String(length=50), nullable=True))
        
        # Qualification Summary
        if 'highest_qualification' not in staff_columns:
            batch_op.add_column(sa.Column('highest_qualification', sa.String(length=100), nullable=True))
        if 'specialization' not in staff_columns:
            batch_op.add_column(sa.Column('specialization', sa.String(length=100), nullable=True))
        if 'experience_years' not in staff_columns:
            batch_op.add_column(sa.Column('experience_years', sa.Integer(), nullable=True))


def downgrade():
    with op.batch_alter_table('staff') as batch_op:
        batch_op.drop_column('experience_years')
        batch_op.drop_column('specialization')
        batch_op.drop_column('highest_qualification')
        batch_op.drop_column('bank_ifsc')
        batch_op.drop_column('bank_account_number')
        batch_op.drop_column('bank_name')
        batch_op.drop_column('employment_type')
        batch_op.drop_column('country')
        batch_op.drop_column('permanent_address')
        batch_op.drop_column('religion')
        batch_op.drop_column('marital_status')
