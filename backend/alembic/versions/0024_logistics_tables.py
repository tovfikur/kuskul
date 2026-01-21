"""Add logistics tables

Revision ID: 0024_logistics_tables
Revises: 0023
Create Date: 2026-01-21 02:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0024_logistics_tables'
down_revision = '0023'
branch_labels = None
depends_on = None


def upgrade():
    # Create inventory_items table
    op.create_table('inventory_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sku', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('uom', sa.String(length=50), nullable=False),
        sa.Column('reorder_level', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inventory_items_school_id'), 'inventory_items', ['school_id'], unique=False)
    op.create_index(op.f('ix_inventory_items_sku'), 'inventory_items', ['sku'], unique=False)

    # Create inventory_locations table
    op.create_table('inventory_locations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inventory_locations_school_id'), 'inventory_locations', ['school_id'], unique=False)
    op.create_index(op.f('ix_inventory_locations_code'), 'inventory_locations', ['code'], unique=False)

    # Create vendors table
    op.create_table('vendors',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('phone', sa.String(length=32), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vendors_school_id'), 'vendors', ['school_id'], unique=False)

    # Create stock_movements table
    op.create_table('stock_movements',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('location_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('qty', sa.Integer(), nullable=False),
        sa.Column('ref_type', sa.String(length=20), nullable=True),
        sa.Column('ref_id', sa.String(length=100), nullable=True),
        sa.Column('note', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['item_id'], ['inventory_items.id'], ),
        sa.ForeignKeyConstraint(['location_id'], ['inventory_locations.id'], ),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_stock_movements_school_id'), 'stock_movements', ['school_id'], unique=False)
    op.create_index(op.f('ix_stock_movements_item_id'), 'stock_movements', ['item_id'], unique=False)
    op.create_index(op.f('ix_stock_movements_location_id'), 'stock_movements', ['location_id'], unique=False)

    # Create purchase_requests table
    op.create_table('purchase_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('decision_note', sa.String(length=1000), nullable=True),
        sa.Column('decided_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.ForeignKeyConstraint(['decided_by_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_purchase_requests_school_id'), 'purchase_requests', ['school_id'], unique=False)

    # Create purchase_request_lines table
    op.create_table('purchase_request_lines',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('purchase_request_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('qty', sa.Integer(), nullable=False),
        sa.Column('note', sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(['purchase_request_id'], ['purchase_requests.id'], ),
        sa.ForeignKeyConstraint(['item_id'], ['inventory_items.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_purchase_request_lines_purchase_request_id'), 'purchase_request_lines', ['purchase_request_id'], unique=False)
    op.create_index(op.f('ix_purchase_request_lines_item_id'), 'purchase_request_lines', ['item_id'], unique=False)

    # Create purchase_orders table
    op.create_table('purchase_orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('vendor_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_from_purchase_request_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ),
        sa.ForeignKeyConstraint(['created_from_purchase_request_id'], ['purchase_requests.id'], ),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_purchase_orders_school_id'), 'purchase_orders', ['school_id'], unique=False)
    op.create_index(op.f('ix_purchase_orders_vendor_id'), 'purchase_orders', ['vendor_id'], unique=False)

    # Create purchase_order_lines table
    op.create_table('purchase_order_lines',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('purchase_order_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('qty_ordered', sa.Integer(), nullable=False),
        sa.Column('qty_received', sa.Integer(), nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.ForeignKeyConstraint(['purchase_order_id'], ['purchase_orders.id'], ),
        sa.ForeignKeyConstraint(['item_id'], ['inventory_items.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_purchase_order_lines_purchase_order_id'), 'purchase_order_lines', ['purchase_order_id'], unique=False)
    op.create_index(op.f('ix_purchase_order_lines_item_id'), 'purchase_order_lines', ['item_id'], unique=False)

    # Create goods_receipts table
    op.create_table('goods_receipts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('purchase_order_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('location_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('received_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.ForeignKeyConstraint(['purchase_order_id'], ['purchase_orders.id'], ),
        sa.ForeignKeyConstraint(['location_id'], ['inventory_locations.id'], ),
        sa.ForeignKeyConstraint(['received_by_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_goods_receipts_school_id'), 'goods_receipts', ['school_id'], unique=False)
    op.create_index(op.f('ix_goods_receipts_purchase_order_id'), 'goods_receipts', ['purchase_order_id'], unique=False)
    op.create_index(op.f('ix_goods_receipts_location_id'), 'goods_receipts', ['location_id'], unique=False)

    # Create goods_receipt_lines table
    op.create_table('goods_receipt_lines',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('goods_receipt_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('purchase_order_line_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('qty_received', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['goods_receipt_id'], ['goods_receipts.id'], ),
        sa.ForeignKeyConstraint(['purchase_order_line_id'], ['purchase_order_lines.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_goods_receipt_lines_goods_receipt_id'), 'goods_receipt_lines', ['goods_receipt_id'], unique=False)
    op.create_index(op.f('ix_goods_receipt_lines_purchase_order_line_id'), 'goods_receipt_lines', ['purchase_order_line_id'], unique=False)

    # Create assets table
    op.create_table('assets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tag', sa.String(length=100), nullable=False),
        sa.Column('serial_no', sa.String(length=100), nullable=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('location', sa.String(length=200), nullable=False),
        sa.Column('custodian_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.ForeignKeyConstraint(['custodian_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assets_school_id'), 'assets', ['school_id'], unique=False)
    op.create_index(op.f('ix_assets_tag'), 'assets', ['tag'], unique=False)

    # Create maintenance_tickets table
    op.create_table('maintenance_tickets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('asset_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.String(length=2000), nullable=True),
        sa.Column('priority', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('assigned_to_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('cost', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ),
        sa.ForeignKeyConstraint(['assigned_to_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_maintenance_tickets_school_id'), 'maintenance_tickets', ['school_id'], unique=False)
    op.create_index(op.f('ix_maintenance_tickets_asset_id'), 'maintenance_tickets', ['asset_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_maintenance_tickets_asset_id'), table_name='maintenance_tickets')
    op.drop_index(op.f('ix_maintenance_tickets_school_id'), table_name='maintenance_tickets')
    op.drop_table('maintenance_tickets')
    
    op.drop_index(op.f('ix_assets_tag'), table_name='assets')
    op.drop_index(op.f('ix_assets_school_id'), table_name='assets')
    op.drop_table('assets')
    
    op.drop_index(op.f('ix_goods_receipt_lines_purchase_order_line_id'), table_name='goods_receipt_lines')
    op.drop_index(op.f('ix_goods_receipt_lines_goods_receipt_id'), table_name='goods_receipt_lines')
    op.drop_table('goods_receipt_lines')
    
    op.drop_index(op.f('ix_goods_receipts_location_id'), table_name='goods_receipts')
    op.drop_index(op.f('ix_goods_receipts_purchase_order_id'), table_name='goods_receipts')
    op.drop_index(op.f('ix_goods_receipts_school_id'), table_name='goods_receipts')
    op.drop_table('goods_receipts')
    
    op.drop_index(op.f('ix_purchase_order_lines_item_id'), table_name='purchase_order_lines')
    op.drop_index(op.f('ix_purchase_order_lines_purchase_order_id'), table_name='purchase_order_lines')
    op.drop_table('purchase_order_lines')
    
    op.drop_index(op.f('ix_purchase_orders_vendor_id'), table_name='purchase_orders')
    op.drop_index(op.f('ix_purchase_orders_school_id'), table_name='purchase_orders')
    op.drop_table('purchase_orders')
    
    op.drop_index(op.f('ix_purchase_request_lines_item_id'), table_name='purchase_request_lines')
    op.drop_index(op.f('ix_purchase_request_lines_purchase_request_id'), table_name='purchase_request_lines')
    op.drop_table('purchase_request_lines')
    
    op.drop_index(op.f('ix_purchase_requests_school_id'), table_name='purchase_requests')
    op.drop_table('purchase_requests')
    
    op.drop_index(op.f('ix_stock_movements_location_id'), table_name='stock_movements')
    op.drop_index(op.f('ix_stock_movements_item_id'), table_name='stock_movements')
    op.drop_index(op.f('ix_stock_movements_school_id'), table_name='stock_movements')
    op.drop_table('stock_movements')
    
    op.drop_index(op.f('ix_vendors_school_id'), table_name='vendors')
    op.drop_table('vendors')
    
    op.drop_index(op.f('ix_inventory_locations_code'), table_name='inventory_locations')
    op.drop_index(op.f('ix_inventory_locations_school_id'), table_name='inventory_locations')
    op.drop_table('inventory_locations')
    
    op.drop_index(op.f('ix_inventory_items_sku'), table_name='inventory_items')
    op.drop_index(op.f('ix_inventory_items_school_id'), table_name='inventory_items')
    op.drop_table('inventory_items')
