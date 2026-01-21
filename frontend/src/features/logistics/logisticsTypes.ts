// ============================================================================
// Common Types
// ============================================================================

export type Id = string;
export type ISODateTime = string;

export type Pagination = { limit?: number; offset?: number };
export type PagedResult<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type EntityStatus = "active" | "inactive";

// ============================================================================
// Vendor Types
// ============================================================================

export type Vendor = {
  id: Id;
  school_id: Id;
  name: string;
  phone?: string;
  email?: string;
  status: EntityStatus;
  created_at: ISODateTime;
};

// ============================================================================
// Inventory Types
// ============================================================================

export type InventoryLocation = {
  id: Id;
  school_id: Id;
  code: string; // e.g., "MAIN_STORE"
  name: string; // e.g., "Main Store"
  is_active: boolean;
  created_at: ISODateTime;
};

export type InventoryItem = {
  id: Id;
  school_id: Id;
  sku: string;
  name: string;
  uom: string;
  reorder_level?: number;
  is_active: boolean;
  created_at: ISODateTime;
};

// Returned by "stock on hand" views (derived from movements by location)
export type StockOnHandRow = {
  item_id: Id;
  sku: string;
  item_name: string;
  uom: string;
  location_id: Id;
  location_name: string;
  qty_on_hand: number;
};

export type StockMovementType = "receive" | "issue" | "adjust";

export type StockMovement = {
  id: Id;
  school_id: Id;
  item_id: Id;
  location_id: Id;
  type: StockMovementType;
  qty: number; // positive for receive, negative for issue; adjust can be +/-
  ref_type?: "po" | "manual";
  ref_id?: Id;
  note?: string;
  created_at: ISODateTime;
  created_by_user_id: Id;
};

// ============================================================================
// Procurement Types
// ============================================================================

export type PurchaseRequestStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

export type PurchaseRequest = {
  id: Id;
  school_id: Id;
  status: PurchaseRequestStatus;
  requested_by_user_id: Id;
  approved_by_user_id?: Id;
  rejected_by_user_id?: Id;
  decision_note?: string;
  created_at: ISODateTime;
};

export type PurchaseRequestLine = {
  id: Id;
  purchase_request_id: Id;
  item_id: Id;
  qty: number;
  note?: string;
};

export type PurchaseOrderStatus = "open" | "partial" | "received" | "cancelled";

export type PurchaseOrder = {
  id: Id;
  school_id: Id;
  vendor_id: Id;
  status: PurchaseOrderStatus;
  created_from_purchase_request_id?: Id;
  created_at: ISODateTime;
};

export type PurchaseOrderLine = {
  id: Id;
  purchase_order_id: Id;
  item_id: Id;
  qty_ordered: number;
  unit_price?: number;
};

export type GoodsReceipt = {
  id: Id;
  school_id: Id;
  purchase_order_id: Id;
  received_at: ISODateTime;
  received_by_user_id: Id;
  location_id: Id; // where stock is received into
};

export type GoodsReceiptLine = {
  id: Id;
  goods_receipt_id: Id;
  purchase_order_line_id: Id;
  qty_received: number;
};

// ============================================================================
// Asset & Maintenance Types
// ============================================================================

export type AssetStatus = "in_use" | "in_repair" | "retired";

export type Asset = {
  id: Id;
  school_id: Id;
  tag: string;
  serial_no?: string;
  name: string;
  category: string;
  location: string;
  custodian_user_id?: Id;
  status: AssetStatus;
  created_at: ISODateTime;
};

export type TicketPriority = "low" | "medium" | "high";
export type TicketStatus = "open" | "in_progress" | "done";

export type MaintenanceTicket = {
  id: Id;
  school_id: Id;
  asset_id?: Id;
  title: string;
  description?: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to_user_id?: Id;
  cost?: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

// ============================================================================
// Report Types
// ============================================================================

export type ReportType =
  | "stock_on_hand"
  | "movements"
  | "open_orders"
  | "asset_register"
  | "maintenance_backlog";

export type StockOnHandReport = StockOnHandRow[];

export type MovementReport = {
  item_id: Id;
  item_name: string;
  sku: string;
  location_name: string;
  type: StockMovementType;
  qty: number;
  created_at: ISODateTime;
  note?: string;
}[];

export type OpenOrdersReport = {
  po_id: Id;
  vendor_name: string;
  status: PurchaseOrderStatus;
  created_at: ISODateTime;
  total_items: number;
}[];

export type AssetRegisterReport = Asset[];

export type MaintenanceBacklogReport = {
  ticket_id: Id;
  title: string;
  asset_tag?: string;
  priority: TicketPriority;
  status: TicketStatus;
  cost?: number;
  created_at: ISODateTime;
}[];

