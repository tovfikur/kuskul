"""add_tenancy_support

Revision ID: b60b1bae775e
Revises: 0031_add_contract_allowances
Create Date: 2026-01-29 01:02:58.132351

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'b60b1bae775e'
down_revision = '0031_add_contract_allowances'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Get connection and inspector to check existing schema
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Create tenants table if it doesn't exist
    if 'tenants' not in existing_tables:
        op.create_table('tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('subdomain', sa.String(length=63), nullable=False),
        sa.Column('custom_domain', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('subdomain')
       )
        op.create_index(op.f('ix_tenants_custom_domain'), 'tenants', ['custom_domain'], unique=False)
        op.create_index(op.f('ix_tenants_subdomain'), 'tenants', ['subdomain'], unique=True)

    # Helper function to add tenant_id column to tables
    def add_tenant_column(table_name):
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        if 'tenant_id' not in columns:
            op.add_column(table_name, sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True))
            op.create_foreign_key(f'fk_{table_name}_tenant_id', table_name, 'tenants', ['tenant_id'], ['id'], ondelete='CASCADE')
            op.create_index(op.f(f'ix_{table_name}_tenant_id'), table_name, ['tenant_id'], unique=False)

    # Add tenant_id to all relevant tables
    tables_to_update = ['classes', 'schools', 'staff', 'staff_performance_records', 'staff_qualifications', 'students', 'users']
    for table in tables_to_update:
        if table in existing_tables:
            add_tenant_column(table)


def downgrade() -> None:
    # Helper function to remove tenant_id column
    def remove_tenant_column(table_name):
        with op.batch_alter_table(table_name, schema=None) as batch_op:
            batch_op.drop_constraint(f'fk_{table_name}_tenant_id', type_='foreignkey')
            batch_op.drop_index(batch_op.f(f'ix_{table_name}_tenant_id'))
            batch_op.drop_column('tenant_id')

    # Remove tenant_id from all tables
    tables_to_update = ['users', 'students', 'staff_qualifications', 'staff_performance_records', 'staff', 'schools', 'classes']
    for table in tables_to_update:
        try:
            remove_tenant_column(table)
        except:
            pass  # Skip if column doesn't exist

    # Drop tenants table
    try:
        with op.batch_alter_table('tenants', schema=None) as batch_op:
            batch_op.drop_index(batch_op.f('ix_tenants_subdomain'))
            batch_op.drop_index(batch_op.f('ix_tenants_custom_domain'))
        op.drop_table('tenants')
    except:
        pass  # Skip if table doesn't exist
