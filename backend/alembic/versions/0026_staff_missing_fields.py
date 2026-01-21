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
    op.add_column('staff', sa.Column('marital_status', sa.String(length=20), nullable=True))
    op.add_column('staff', sa.Column('religion', sa.String(length=50), nullable=True))
    op.add_column('staff', sa.Column('permanent_address', sa.String(length=500), nullable=True))
    op.add_column('staff', sa.Column('country', sa.String(length=100), nullable=True))
    op.add_column('staff', sa.Column('employment_type', sa.String(length=50), nullable=True))
    
    # Bank Details
    op.add_column('staff', sa.Column('bank_name', sa.String(length=100), nullable=True))
    op.add_column('staff', sa.Column('bank_account_number', sa.String(length=50), nullable=True))
    op.add_column('staff', sa.Column('bank_ifsc', sa.String(length=50), nullable=True))
    
    # Qualification Summary
    op.add_column('staff', sa.Column('highest_qualification', sa.String(length=100), nullable=True))
    op.add_column('staff', sa.Column('specialization', sa.String(length=100), nullable=True))
    op.add_column('staff', sa.Column('experience_years', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('staff', 'experience_years')
    op.drop_column('staff', 'specialization')
    op.drop_column('staff', 'highest_qualification')
    op.drop_column('staff', 'bank_ifsc')
    op.drop_column('staff', 'bank_account_number')
    op.drop_column('staff', 'bank_name')
    op.drop_column('staff', 'employment_type')
    op.drop_column('staff', 'country')
    op.drop_column('staff', 'permanent_address')
    op.drop_column('staff', 'religion')
    op.drop_column('staff', 'marital_status')
