import { api } from "./client";
import type {
  Asset,
  AssetStatus,
  GoodsReceipt,
  GoodsReceiptLine,
  InventoryItem,
  InventoryLocation,
  MaintenanceTicket,
  PagedResult,
  Pagination,
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseRequest,
  PurchaseRequestLine,
  StockMovement,
  StockMovementType,
  StockOnHandRow,
  TicketPriority,
  TicketStatus,
  Vendor,
} from "../features/logistics/logisticsTypes";

// ============================================================================
// Inventory API
// ============================================================================

export async function getInventoryLocations(
  params?: { q?: string; is_active?: boolean } & Pagination,
): Promise<PagedResult<InventoryLocation>> {
  const resp = await api.get("/logistics/inventory/locations", { params });
  return resp.data;
}

export async function createInventoryLocation(payload: {
  code: string;
  name: string;
  is_active?: boolean;
}): Promise<InventoryLocation> {
  const resp = await api.post("/logistics/inventory/locations", payload);
  return resp.data;
}

export async function updateInventoryLocation(
  id: string,
  payload: {
    code?: string;
    name?: string;
    is_active?: boolean;
  },
): Promise<InventoryLocation> {
  const resp = await api.put(
    `/logistics/inventory/locations/${id}`,
    payload,
  );
  return resp.data;
}

export async function getInventoryItems(
  params?: { q?: string; is_active?: boolean } & Pagination,
): Promise<PagedResult<InventoryItem>> {
  const resp = await api.get("/logistics/inventory/items", { params });
  return resp.data;
}

export async function createInventoryItem(payload: {
  sku: string;
  name: string;
  uom: string;
  reorder_level?: number;
  is_active?: boolean;
}): Promise<InventoryItem> {
  const resp = await api.post("/logistics/inventory/items", payload);
  return resp.data;
}

export async function updateInventoryItem(
  id: string,
  payload: {
    sku?: string;
    name?: string;
    uom?: string;
    reorder_level?: number;
    is_active?: boolean;
  },
): Promise<InventoryItem> {
  const resp = await api.put(`/logistics/inventory/items/${id}`, payload);
  return resp.data;
}

export async function getStockOnHand(params?: {
  location_id?: string;
}): Promise<StockOnHandRow[]> {
  const resp = await api.get("/logistics/inventory/stock-on-hand", {
    params,
  });
  return resp.data;
}

export async function getStockMovements(
  params?: {
    item_id?: string;
    location_id?: string;
    from?: string;
    to?: string;
  } & Pagination,
): Promise<PagedResult<StockMovement>> {
  const resp = await api.get("/logistics/inventory/movements", { params });
  return resp.data;
}

export async function createStockMovement(payload: {
  item_id: string;
  location_id: string;
  type: StockMovementType;
  qty: number;
  ref_type?: "po" | "manual";
  ref_id?: string;
  note?: string;
}): Promise<StockMovement> {
  const resp = await api.post("/logistics/inventory/movements", payload);
  return resp.data;
}

// ============================================================================
// Procurement API
// ============================================================================

export async function getPurchaseRequests(
  params?: { status?: string; q?: string } & Pagination,
): Promise<PagedResult<PurchaseRequest>> {
  const resp = await api.get("/logistics/procurement/purchase-requests", {
    params,
  });
  return resp.data;
}

export async function createPurchaseRequest(payload: {
  lines: { item_id: string; qty: number; note?: string }[];
}): Promise<PurchaseRequest> {
  const resp = await api.post(
    "/logistics/procurement/purchase-requests",
    payload,
  );
  return resp.data;
}

export async function updatePurchaseRequest(
  id: string,
  payload: {
    lines?: { item_id: string; qty: number; note?: string }[];
  },
): Promise<PurchaseRequest> {
  const resp = await api.put(
    `/logistics/procurement/purchase-requests/${id}`,
    payload,
  );
  return resp.data;
}

export async function submitPurchaseRequest(
  id: string,
): Promise<PurchaseRequest> {
  const resp = await api.patch(
    `/logistics/procurement/purchase-requests/${id}/submit`,
  );
  return resp.data;
}

export async function approvePurchaseRequest(
  id: string,
  decision_note?: string,
): Promise<PurchaseRequest> {
  const resp = await api.patch(
    `/logistics/procurement/purchase-requests/${id}/approve`,
    { decision_note },
  );
  return resp.data;
}

export async function rejectPurchaseRequest(
  id: string,
  decision_note: string,
): Promise<PurchaseRequest> {
  const resp = await api.patch(
    `/logistics/procurement/purchase-requests/${id}/reject`,
    { decision_note },
  );
  return resp.data;
}

export async function getPurchaseRequestLines(
  purchaseRequestId: string,
): Promise<PurchaseRequestLine[]> {
  const resp = await api.get(
    `/logistics/procurement/purchase-requests/${purchaseRequestId}/lines`,
  );
  return resp.data;
}

export async function getPurchaseOrders(
  params?: { status?: string; vendor_id?: string } & Pagination,
): Promise<PagedResult<PurchaseOrder>> {
  const resp = await api.get("/logistics/procurement/purchase-orders", {
    params,
  });
  return resp.data;
}

export async function createPurchaseOrder(payload: {
  vendor_id: string;
  created_from_purchase_request_id?: string;
  lines: { item_id: string; qty_ordered: number; unit_price?: number }[];
}): Promise<PurchaseOrder> {
  const resp = await api.post(
    "/logistics/procurement/purchase-orders",
    payload,
  );
  return resp.data;
}

export async function updatePurchaseOrder(
  id: string,
  payload: {
    lines?: { item_id: string; qty_ordered: number; unit_price?: number }[];
  },
): Promise<PurchaseOrder> {
  const resp = await api.put(
    `/logistics/procurement/purchase-orders/${id}`,
    payload,
  );
  return resp.data;
}

export async function cancelPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const resp = await api.patch(
    `/logistics/procurement/purchase-orders/${id}/cancel`,
  );
  return resp.data;
}

export async function getPurchaseOrderLines(
  purchaseOrderId: string,
): Promise<PurchaseOrderLine[]> {
  const resp = await api.get(
    `/logistics/procurement/purchase-orders/${purchaseOrderId}/lines`,
  );
  return resp.data;
}

export async function getGoodsReceipts(
  params?: { purchase_order_id?: string } & Pagination,
): Promise<PagedResult<GoodsReceipt>> {
  const resp = await api.get("/logistics/procurement/goods-receipts", {
    params,
  });
  return resp.data;
}

export async function createGoodsReceipt(payload: {
  purchase_order_id: string;
  location_id: string;
  lines: { purchase_order_line_id: string; qty_received: number }[];
}): Promise<GoodsReceipt> {
  const resp = await api.post(
    "/logistics/procurement/goods-receipts",
    payload,
  );
  return resp.data;
}

export async function getGoodsReceiptLines(
  goodsReceiptId: string,
): Promise<GoodsReceiptLine[]> {
  const resp = await api.get(
    `/logistics/procurement/goods-receipts/${goodsReceiptId}/lines`,
  );
  return resp.data;
}

// ============================================================================
// Vendor API
// ============================================================================

export async function getVendors(
  params?: { q?: string; status?: string } & Pagination,
): Promise<PagedResult<Vendor>> {
  const resp = await api.get("/logistics/vendors", { params });
  return resp.data;
}

export async function createVendor(payload: {
  name: string;
  phone?: string;
  email?: string;
  status?: "active" | "inactive";
}): Promise<Vendor> {
  const resp = await api.post("/logistics/vendors", payload);
  return resp.data;
}

export async function updateVendor(
  id: string,
  payload: {
    name?: string;
    phone?: string;
    email?: string;
    status?: "active" | "inactive";
  },
): Promise<Vendor> {
  const resp = await api.put(`/logistics/vendors/${id}`, payload);
  return resp.data;
}

// ============================================================================
// Asset API
// ============================================================================

export async function getAssets(
  params?: { q?: string; status?: AssetStatus } & Pagination,
): Promise<PagedResult<Asset>> {
  const resp = await api.get("/logistics/assets", { params });
  return resp.data;
}

export async function createAsset(payload: {
  tag: string;
  serial_no?: string;
  name: string;
  category: string;
  location: string;
  custodian_user_id?: string;
  status?: AssetStatus;
}): Promise<Asset> {
  const resp = await api.post("/logistics/assets", payload);
  return resp.data;
}

export async function updateAsset(
  id: string,
  payload: {
    tag?: string;
    serial_no?: string;
    name?: string;
    category?: string;
    location?: string;
    custodian_user_id?: string;
    status?: AssetStatus;
  },
): Promise<Asset> {
  const resp = await api.put(`/logistics/assets/${id}`, payload);
  return resp.data;
}

// ============================================================================
// Maintenance API
// ============================================================================

export async function getMaintenanceTickets(
  params?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assigned_to_user_id?: string;
  } & Pagination,
): Promise<PagedResult<MaintenanceTicket>> {
  const resp = await api.get("/logistics/maintenance/tickets", { params });
  return resp.data;
}

export async function createMaintenanceTicket(payload: {
  asset_id?: string;
  title: string;
  description?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  assigned_to_user_id?: string;
  cost?: number;
}): Promise<MaintenanceTicket> {
  const resp = await api.post("/logistics/maintenance/tickets", payload);
  return resp.data;
}

export async function updateMaintenanceTicket(
  id: string,
  payload: {
    asset_id?: string;
    title?: string;
    description?: string;
    priority?: TicketPriority;
    status?: TicketStatus;
    assigned_to_user_id?: string;
    cost?: number;
  },
): Promise<MaintenanceTicket> {
  const resp = await api.patch(
    `/logistics/maintenance/tickets/${id}`,
    payload,
  );
  return resp.data;
}

// ============================================================================
// Reports API
// ============================================================================

export async function getStockOnHandReport(params?: {
  location_id?: string;
}): Promise<StockOnHandRow[]> {
  const resp = await api.get("/logistics/reports/stock-on-hand", {
    params,
  });
  return resp.data;
}

export async function getMovementsReport(params?: {
  from?: string;
  to?: string;
  location_id?: string;
}): Promise<
  {
    item_id: string;
    item_name: string;
    sku: string;
    location_name: string;
    type: StockMovementType;
    qty: number;
    created_at: string;
    note?: string;
  }[]
> {
  const resp = await api.get("/logistics/reports/movements", { params });
  return resp.data;
}

export async function getOpenOrdersReport(): Promise<
  {
    po_id: string;
    vendor_name: string;
    status: string;
    created_at: string;
    total_items: number;
  }[]
> {
  const resp = await api.get("/logistics/reports/open-orders");
  return resp.data;
}

export async function getAssetRegisterReport(): Promise<Asset[]> {
  const resp = await api.get("/logistics/reports/asset-register");
  return resp.data;
}

export async function getMaintenanceBacklogReport(): Promise<
  {
    ticket_id: string;
    title: string;
    asset_tag?: string;
    priority: TicketPriority;
    status: TicketStatus;
    cost?: number;
    created_at: string;
  }[]
> {
  const resp = await api.get("/logistics/reports/maintenance-backlog");
  return resp.data;
}

// Export CSV helper
export async function exportReportCsv(
  reportType:
    | "stock-on-hand"
    | "movements"
    | "open-orders"
    | "asset-register"
    | "maintenance-backlog",
  params?: Record<string, string>,
): Promise<Blob> {
  const resp = await api.get(`/logistics/reports/${reportType}`, {
    params,
    headers: { Accept: "text/csv" },
    responseType: "blob",
  });
  return resp.data as Blob;
}
