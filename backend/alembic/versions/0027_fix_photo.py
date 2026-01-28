"""Fix photo_url size

Revision ID: 0027_fix_photo
Revises: 0026_staff_missing_fields
Create Date: 2026-01-22 00:08:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0027_fix_photo'
down_revision = '0026_staff_missing_fields'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('staff') as batch_op:
        batch_op.alter_column('photo_url',
                   existing_type=sa.VARCHAR(length=500),
                   type_=sa.Text(),
                   existing_nullable=True)


def downgrade():
    with op.batch_alter_table('staff') as batch_op:
        batch_op.alter_column('photo_url',
                   existing_type=sa.Text(),
                   type_=sa.VARCHAR(length=500),
                   existing_nullable=True)
