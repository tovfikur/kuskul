"""Add professional staff management tables

Revision ID: 0025_staff_management_enhanced
Revises: 0024
Create Date: 2026-01-21 17:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0025_staff_management_enhanced'
down_revision = '0024_logistics_tables'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = insp.get_table_names()

    # Create departments table
    if 'departments' not in tables:
        op.create_table('departments',
            sa.Column('id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('school_id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('name', sa.String(length=200), nullable=False),
            sa.Column('code', sa.String(length=50), nullable=False),
            sa.Column('head_staff_id', sa.Uuid(as_uuid=True), nullable=True),
            sa.Column('budget_allocated', sa.Numeric(precision=12, scale=2), nullable=True),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.sql.true()),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
            sa.ForeignKeyConstraint(['head_staff_id'], ['staff.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_departments_school_id'), 'departments', ['school_id'], unique=False)
        op.create_index(op.f('ix_departments_code'), 'departments', ['code'], unique=False)

    # Create designations table
    if 'designations' not in tables:
        op.create_table('designations',
            sa.Column('id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('school_id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('title', sa.String(length=200), nullable=False),
            sa.Column('code', sa.String(length=50), nullable=False),
            sa.Column('level', sa.Integer(), nullable=False, server_default='5'),
            sa.Column('department_id', sa.Uuid(as_uuid=True), nullable=True),
            sa.Column('min_salary', sa.Numeric(precision=12, scale=2), nullable=True),
            sa.Column('max_salary', sa.Numeric(precision=12, scale=2), nullable=True),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.sql.true()),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
            sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_designations_school_id'), 'designations', ['school_id'], unique=False)
        op.create_index(op.f('ix_designations_code'), 'designations', ['code'], unique=False)

    # Create staff_contracts table
    if 'staff_contracts' not in tables:
        op.create_table('staff_contracts',
            sa.Column('id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('staff_id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('contract_type', sa.String(length=50), nullable=False),
            sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
            sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
            sa.Column('salary', sa.Numeric(precision=12, scale=2), nullable=False),
            sa.Column('salary_currency', sa.String(length=10), nullable=False, server_default='BDT'),
            sa.Column('working_hours_per_week', sa.Integer(), nullable=False, server_default='40'),
            sa.Column('contract_document_url', sa.String(length=500), nullable=True),
            sa.Column('terms_and_conditions', sa.Text(), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
            sa.Column('termination_reason', sa.Text(), nullable=True),
            sa.Column('terminated_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['staff_id'], ['staff.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_staff_contracts_staff_id'), 'staff_contracts', ['staff_id'], unique=False)

    # Create leave_types table
    if 'leave_types' not in tables:
        op.create_table('leave_types',
            sa.Column('id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('school_id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('code', sa.String(length=20), nullable=False),
            sa.Column('days_per_year', sa.Integer(), nullable=False),
            sa.Column('requires_approval', sa.Boolean(), nullable=False, server_default=sa.sql.true()),
            sa.Column('max_consecutive_days', sa.Integer(), nullable=True),
            sa.Column('is_paid', sa.Boolean(), nullable=False, server_default=sa.sql.true()),
            sa.Column('color', sa.String(length=20), nullable=False, server_default='#1976d2'),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.sql.true()),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_leave_types_school_id'), 'leave_types', ['school_id'], unique=False)
        op.create_index(op.f('ix_leave_types_code'), 'leave_types', ['code'], unique=False)

    # Create leave_balances table
    if 'leave_balances' not in tables:
        op.create_table('leave_balances',
            sa.Column('id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('staff_id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('leave_type_id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('year', sa.Integer(), nullable=False),
            sa.Column('total_days', sa.Integer(), nullable=False),
            sa.Column('used_days', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('pending_days', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('carried_forward', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['staff_id'], ['staff.id'], ),
            sa.ForeignKeyConstraint(['leave_type_id'], ['leave_types.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_leave_balances_staff_id'), 'leave_balances', ['staff_id'], unique=False)
        op.create_index(op.f('ix_leave_balances_leave_type_id'), 'leave_balances', ['leave_type_id'], unique=False)
        op.create_index(op.f('ix_leave_balances_year'), 'leave_balances', ['year'], unique=False)

    # Create staff_leave_requests table
    if 'staff_leave_requests' not in tables:
        op.create_table('staff_leave_requests',
            sa.Column('id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('staff_id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('leave_type_id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('start_date', sa.Date(), nullable=False),
            sa.Column('end_date', sa.Date(), nullable=False),
            sa.Column('total_days', sa.Integer(), nullable=False),
            sa.Column('reason', sa.Text(), nullable=False),
            sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
            sa.Column('approved_by_user_id', sa.Uuid(as_uuid=True), nullable=True),
            sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('rejection_reason', sa.Text(), nullable=True),
            sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['staff_id'], ['staff.id'], ),
            sa.ForeignKeyConstraint(['leave_type_id'], ['leave_types.id'], ),
            sa.ForeignKeyConstraint(['approved_by_user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_staff_leave_requests_staff_id'), 'staff_leave_requests', ['staff_id'], unique=False)
        op.create_index(op.f('ix_staff_leave_requests_leave_type_id'), 'staff_leave_requests', ['leave_type_id'], unique=False)
        op.create_index(op.f('ix_staff_leave_requests_start_date'), 'staff_leave_requests', ['start_date'], unique=False)
        op.create_index(op.f('ix_staff_leave_requests_end_date'), 'staff_leave_requests', ['end_date'], unique=False)
        op.create_index(op.f('ix_staff_leave_requests_status'), 'staff_leave_requests', ['status'], unique=False)

    # Create payroll_cycles table
    if 'payroll_cycles' not in tables:
        op.create_table('payroll_cycles',
            sa.Column('id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('school_id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('month', sa.Integer(), nullable=False),
            sa.Column('year', sa.Integer(), nullable=False),
            sa.Column('status', sa.String(length=50), nullable=False, server_default='draft'),
            sa.Column('total_amount', sa.Numeric(precision=14, scale=2), nullable=False, server_default='0'),
            sa.Column('processed_by_user_id', sa.Uuid(as_uuid=True), nullable=True),
            sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
            sa.ForeignKeyConstraint(['processed_by_user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_payroll_cycles_school_id'), 'payroll_cycles', ['school_id'], unique=False)
        op.create_index(op.f('ix_payroll_cycles_month'), 'payroll_cycles', ['month'], unique=False)
        op.create_index(op.f('ix_payroll_cycles_year'), 'payroll_cycles', ['year'], unique=False)
        op.create_index(op.f('ix_payroll_cycles_status'), 'payroll_cycles', ['status'], unique=False)

    # Create payslips table
    if 'payslips' not in tables:
        op.create_table('payslips',
            sa.Column('id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('payroll_cycle_id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('staff_id', sa.Uuid(as_uuid=True), nullable=False),
            sa.Column('basic_salary', sa.Numeric(precision=12, scale=2), nullable=False),
            sa.Column('allowances', sa.JSON(), nullable=False, server_default='{}'),
            sa.Column('deductions', sa.JSON(), nullable=False, server_default='{}'),
            sa.Column('gross_salary', sa.Numeric(precision=12, scale=2), nullable=False),
            sa.Column('total_deductions', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'),
            sa.Column('net_salary', sa.Numeric(precision=12, scale=2), nullable=False),
            sa.Column('payment_date', sa.Date(), nullable=True),
            sa.Column('payment_method', sa.String(length=50), nullable=False, server_default='bank_transfer'),
            sa.Column('payment_reference', sa.String(length=200), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=False, server_default='generated'),
            sa.Column('working_days', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('present_days', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('leave_days', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['payroll_cycle_id'], ['payroll_cycles.id'], ),
            sa.ForeignKeyConstraint(['staff_id'], ['staff.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_payslips_payroll_cycle_id'), 'payslips', ['payroll_cycle_id'], unique=False)
        op.create_index(op.f('ix_payslips_staff_id'), 'payslips', ['staff_id'], unique=False)
        op.create_index(op.f('ix_payslips_status'), 'payslips', ['status'], unique=False)

    # Add new columns to staff table
    staff_columns = [col['name'] for col in insp.get_columns('staff')]
    
    with op.batch_alter_table('staff', schema=None) as batch_op:
        if 'department_id' not in staff_columns:
            batch_op.add_column(sa.Column('department_id', sa.Uuid(as_uuid=True), nullable=True))
            batch_op.create_foreign_key('fk_staff_department', 'departments', ['department_id'], ['id'])
            batch_op.create_index(op.f('ix_staff_department_id'), ['department_id'], unique=False)

        if 'designation_id' not in staff_columns:
            batch_op.add_column(sa.Column('designation_id', sa.Uuid(as_uuid=True), nullable=True))
            batch_op.create_foreign_key('fk_staff_designation', 'designations', ['designation_id'], ['id'])
            batch_op.create_index(op.f('ix_staff_designation_id'), ['designation_id'], unique=False)

        if 'reporting_to_staff_id' not in staff_columns:
            batch_op.add_column(sa.Column('reporting_to_staff_id', sa.Uuid(as_uuid=True), nullable=True))
            batch_op.create_foreign_key('fk_staff_reporting_to', 'staff', ['reporting_to_staff_id'], ['id'])

        if 'date_of_birth' not in staff_columns:
            batch_op.add_column(sa.Column('date_of_birth', sa.Date(), nullable=True))
            
        if 'gender' not in staff_columns:
            batch_op.add_column(sa.Column('gender', sa.String(length=20), nullable=True))
            
        if 'blood_group' not in staff_columns:
            batch_op.add_column(sa.Column('blood_group', sa.String(length=10), nullable=True))
            
        if 'nationality' not in staff_columns:
            batch_op.add_column(sa.Column('nationality', sa.String(length=100), nullable=True))
            
        if 'address' not in staff_columns:
            batch_op.add_column(sa.Column('address', sa.String(length=500), nullable=True))
            
        if 'city' not in staff_columns:
            batch_op.add_column(sa.Column('city', sa.String(length=100), nullable=True))
            
        if 'state' not in staff_columns:
            batch_op.add_column(sa.Column('state', sa.String(length=100), nullable=True))
            
        if 'postal_code' not in staff_columns:
            batch_op.add_column(sa.Column('postal_code', sa.String(length=20), nullable=True))
            
        if 'is_teaching_staff' not in staff_columns:
            batch_op.add_column(sa.Column('is_teaching_staff', sa.String(length=10), nullable=False, server_default='true'))


def downgrade():
    # Use batch mode for SQLite compatibility when altering tables
    with op.batch_alter_table('staff') as batch_op:
        # Drop indexes
        batch_op.drop_index(op.f('ix_staff_designation_id'))
        batch_op.drop_index(op.f('ix_staff_department_id'))
        
        # Drop foreign keys
        batch_op.drop_constraint('fk_staff_reporting_to', type_='foreignkey')
        batch_op.drop_constraint('fk_staff_designation', type_='foreignkey')
        batch_op.drop_constraint('fk_staff_department', type_='foreignkey')
        
        # Drop columns
        batch_op.drop_column('is_teaching_staff')
        batch_op.drop_column('postal_code')
        batch_op.drop_column('state')
        batch_op.drop_column('city')
        batch_op.drop_column('address')
        batch_op.drop_column('nationality')
        batch_op.drop_column('blood_group')
        batch_op.drop_column('gender')
        batch_op.drop_column('date_of_birth')
        batch_op.drop_column('reporting_to_staff_id')
        batch_op.drop_column('designation_id')
        batch_op.drop_column('department_id')
    
    # Drop tables with resilience
    op.execute("DROP TABLE IF EXISTS payslips")
    op.execute("DROP TABLE IF EXISTS payroll_cycles")
    op.execute("DROP TABLE IF EXISTS staff_leave_requests")
    op.execute("DROP TABLE IF EXISTS leave_balances")
    op.execute("DROP TABLE IF EXISTS leave_types")
    op.execute("DROP TABLE IF EXISTS staff_contracts")
    op.execute("DROP TABLE IF EXISTS designations")
    op.execute("DROP TABLE IF EXISTS departments")
