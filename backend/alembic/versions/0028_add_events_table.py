"""add events table

Revision ID: 0028_add_events_table
Revises: 0027_fix_photo
Create Date: 2026-01-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0028_add_events_table'
down_revision = '0027_fix_photo'
branch_labels = None
depends_on = None


def upgrade():
    # Drop table if exists to ensure we start fresh with correct schema
    op.execute("DROP TABLE IF EXISTS events")
    
    op.create_table('events',
    sa.Column('id', sa.Uuid(as_uuid=True), nullable=False),
    sa.Column('school_id', sa.Uuid(as_uuid=True), nullable=False),
    sa.Column('event_type', sa.String(length=32), nullable=True),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('description', sa.String(length=2000), nullable=True),
    sa.Column('start_date', sa.Date(), nullable=False),
    sa.Column('end_date', sa.Date(), nullable=False),
    sa.Column('location', sa.String(length=200), nullable=True),
    sa.Column('announced_by', sa.String(length=200), nullable=True),
    sa.Column('is_all_day', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_events_school_id'), 'events', ['school_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_events_school_id'), table_name='events')
    op.drop_table('events')
