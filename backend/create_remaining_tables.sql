-- Create remaining logistics tables
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    location_id UUID NOT NULL REFERENCES inventory_locations(id),
    type VARCHAR(20) NOT NULL,
    qty INTEGER NOT NULL,
    ref_type VARCHAR(20),
    ref_id VARCHAR(100),
    note VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by_user_id UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS ix_stock_movements_school_id ON stock_movements(school_id);
CREATE INDEX IF NOT EXISTS ix_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS ix_stock_movements_location_id ON stock_movements(location_id);

CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id),
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    decision_note VARCHAR(1000),
    decided_by_user_id UUID REFERENCES users(id),
    decided_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS ix_purchase_requests_school_id ON purchase_requests(school_id);

CREATE TABLE IF NOT EXISTS purchase_request_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    qty INTEGER NOT NULL,
    note VARCHAR(500)
);
CREATE INDEX IF NOT EXISTS ix_purchase_request_lines_purchase_request_id ON purchase_request_lines(purchase_request_id);
CREATE INDEX IF NOT EXISTS ix_purchase_request_lines_item_id ON purchase_request_lines(item_id);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    created_from_purchase_request_id UUID REFERENCES purchase_requests(id),
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS ix_purchase_orders_school_id ON purchase_orders(school_id);
CREATE INDEX IF NOT EXISTS ix_purchase_orders_vendor_id ON purchase_orders(vendor_id);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    qty_ordered INTEGER NOT NULL,
    qty_received INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC(10, 2)
);
CREATE INDEX IF NOT EXISTS ix_purchase_order_lines_purchase_order_id ON purchase_order_lines(purchase_order_id);
CREATE INDEX IF NOT EXISTS ix_purchase_order_lines_item_id ON purchase_order_lines(item_id);

CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
    location_id UUID NOT NULL REFERENCES inventory_locations(id),
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    received_by_user_id UUID NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS ix_goods_receipts_school_id ON goods_receipts(school_id);
CREATE INDEX IF NOT EXISTS ix_goods_receipts_purchase_order_id ON goods_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS ix_goods_receipts_location_id ON goods_receipts(location_id);

CREATE TABLE IF NOT EXISTS goods_receipt_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id),
    purchase_order_line_id UUID NOT NULL REFERENCES purchase_order_lines(id),
    qty_received INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_goods_receipt_lines_goods_receipt_id ON goods_receipt_lines(goods_receipt_id);
CREATE INDEX IF NOT EXISTS ix_goods_receipt_lines_purchase_order_line_id ON goods_receipt_lines(purchase_order_line_id);

CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id),
    tag VARCHAR(100) NOT NULL,
    serial_no VARCHAR(100),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    location VARCHAR(200) NOT NULL,
    custodian_user_id UUID REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'in_use',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS ix_assets_school_id ON assets(school_id);
CREATE INDEX IF NOT EXISTS ix_assets_tag ON assets(tag);

CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id),
    asset_id UUID REFERENCES assets(id),
    title VARCHAR(200) NOT NULL,
    description VARCHAR(2000),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    assigned_to_user_id UUID REFERENCES users(id),
    cost NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS ix_maintenance_tickets_school_id ON maintenance_tickets(school_id);
CREATE INDEX IF NOT EXISTS ix_maintenance_tickets_asset_id ON maintenance_tickets(asset_id);

SELECT COUNT(*) as total_logistics_tables FROM pg_tables WHERE schemaname = 'public' AND (tablename LIKE 'inventory%' OR tablename LIKE 'vendor%' OR tablename LIKE 'purchase%' OR tablename LIKE 'asset%' OR tablename LIKE 'maintenance%' OR tablename LIKE 'goods%' OR tablename LIKE 'stock%');
