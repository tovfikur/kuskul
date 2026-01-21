import type {
  Asset,
  GoodsReceipt,
  InventoryItem,
  MaintenanceTicket,
  PurchaseOrder,
  PurchaseRequest,
  StockMovement,
  Vendor,
} from "./logisticsTypes";

type Collections = {
  vendors: Vendor[];
  items: InventoryItem[];
  movements: StockMovement[];
  purchase_requests: PurchaseRequest[];
  purchase_orders: PurchaseOrder[];
  goods_receipts: GoodsReceipt[];
  assets: Asset[];
  tickets: MaintenanceTicket[];
};

function keyFor(schoolId: string): string {
  return `kuskul_logistics_${schoolId}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function readAll(schoolId: string): Collections {
  const raw = localStorage.getItem(keyFor(schoolId));
  if (!raw) {
    return {
      vendors: [],
      items: [],
      movements: [],
      purchase_requests: [],
      purchase_orders: [],
      goods_receipts: [],
      assets: [],
      tickets: [],
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Collections>;
    return {
      vendors: parsed.vendors ?? [],
      items: parsed.items ?? [],
      movements: parsed.movements ?? [],
      purchase_requests: parsed.purchase_requests ?? [],
      purchase_orders: parsed.purchase_orders ?? [],
      goods_receipts: parsed.goods_receipts ?? [],
      assets: parsed.assets ?? [],
      tickets: parsed.tickets ?? [],
    };
  } catch {
    return {
      vendors: [],
      items: [],
      movements: [],
      purchase_requests: [],
      purchase_orders: [],
      goods_receipts: [],
      assets: [],
      tickets: [],
    };
  }
}

function writeAll(schoolId: string, data: Collections) {
  localStorage.setItem(keyFor(schoolId), JSON.stringify(data));
}

export function ensureLogisticsSeed(schoolId: string) {
  const data = readAll(schoolId);
  if (data.items.length > 0 || data.vendors.length > 0 || data.assets.length > 0) return;

  const v1: Vendor = {
    id: crypto.randomUUID(),
    name: "Campus Supplies Co.",
    phone: "+8801000000000",
    email: "sales@campus-supplies.example",
    status: "active",
    created_at: nowIso(),
  };
  const v2: Vendor = {
    id: crypto.randomUUID(),
    name: "BrightLab Stationery",
    phone: "+8801000000011",
    email: "support@brightlab.example",
    status: "active",
    created_at: nowIso(),
  };

  const i1: InventoryItem = {
    id: crypto.randomUUID(),
    sku: "PAPER-A4-80G",
    name: "A4 Paper 80gsm",
    uom: "ream",
    reorder_level: 10,
    is_active: true,
    created_at: nowIso(),
  };
  const i2: InventoryItem = {
    id: crypto.randomUUID(),
    sku: "INK-BLACK",
    name: "Printer Ink (Black)",
    uom: "pcs",
    reorder_level: 3,
    is_active: true,
    created_at: nowIso(),
  };
  const i3: InventoryItem = {
    id: crypto.randomUUID(),
    sku: "SANITIZER-500ML",
    name: "Hand Sanitizer 500ml",
    uom: "bottle",
    reorder_level: 15,
    is_active: true,
    created_at: nowIso(),
  };

  const m1: StockMovement = {
    id: crypto.randomUUID(),
    item_id: i1.id,
    type: "receive",
    qty: 25,
    ref_type: "manual",
    ref_id: null,
    note: "Opening stock",
    created_at: nowIso(),
  };
  const m2: StockMovement = {
    id: crypto.randomUUID(),
    item_id: i2.id,
    type: "receive",
    qty: 6,
    ref_type: "manual",
    ref_id: null,
    note: "Opening stock",
    created_at: nowIso(),
  };

  const a1: Asset = {
    id: crypto.randomUUID(),
    tag: "ASSET-PRN-001",
    name: "Office Printer",
    category: "IT",
    location: "Admin Office",
    status: "in_use",
    created_at: nowIso(),
  };
  const a2: Asset = {
    id: crypto.randomUUID(),
    tag: "ASSET-DESK-021",
    name: "Teacher Desk",
    category: "Furniture",
    location: "Staff Room",
    status: "in_use",
    created_at: nowIso(),
  };

  const t1: MaintenanceTicket = {
    id: crypto.randomUUID(),
    asset_id: a1.id,
    title: "Printer paper jam issue",
    priority: "medium",
    status: "open",
    assigned_to: null,
    cost: null,
    notes: "Happens intermittently during heavy printing.",
    created_at: nowIso(),
  };

  data.vendors = [v1, v2];
  data.items = [i1, i2, i3];
  data.movements = [m1, m2];
  data.assets = [a1, a2];
  data.tickets = [t1];

  writeAll(schoolId, data);
}

export function getVendors(schoolId: string): Vendor[] {
  return readAll(schoolId).vendors;
}

export function upsertVendor(schoolId: string, v: Vendor): Vendor {
  const data = readAll(schoolId);
  const idx = data.vendors.findIndex((x) => x.id === v.id);
  if (idx >= 0) data.vendors[idx] = v;
  else data.vendors.unshift(v);
  writeAll(schoolId, data);
  return v;
}

export function deleteVendor(schoolId: string, id: string) {
  const data = readAll(schoolId);
  data.vendors = data.vendors.filter((x) => x.id !== id);
  writeAll(schoolId, data);
}

export function getItems(schoolId: string): InventoryItem[] {
  return readAll(schoolId).items;
}

export function upsertItem(schoolId: string, item: InventoryItem): InventoryItem {
  const data = readAll(schoolId);
  const idx = data.items.findIndex((x) => x.id === item.id);
  if (idx >= 0) data.items[idx] = item;
  else data.items.unshift(item);
  writeAll(schoolId, data);
  return item;
}

export function deleteItem(schoolId: string, id: string) {
  const data = readAll(schoolId);
  data.items = data.items.filter((x) => x.id !== id);
  data.movements = data.movements.filter((m) => m.item_id !== id);
  writeAll(schoolId, data);
}

export function getMovements(schoolId: string): StockMovement[] {
  return readAll(schoolId).movements;
}

export function addMovement(schoolId: string, movement: StockMovement): StockMovement {
  const data = readAll(schoolId);
  data.movements.unshift(movement);
  writeAll(schoolId, data);
  return movement;
}

export function getAssets(schoolId: string): Asset[] {
  return readAll(schoolId).assets;
}

export function upsertAsset(schoolId: string, asset: Asset): Asset {
  const data = readAll(schoolId);
  const idx = data.assets.findIndex((x) => x.id === asset.id);
  if (idx >= 0) data.assets[idx] = asset;
  else data.assets.unshift(asset);
  writeAll(schoolId, data);
  return asset;
}

export function deleteAsset(schoolId: string, id: string) {
  const data = readAll(schoolId);
  data.assets = data.assets.filter((x) => x.id !== id);
  data.tickets = data.tickets.map((t) => (t.asset_id === id ? { ...t, asset_id: null } : t));
  writeAll(schoolId, data);
}

export function getTickets(schoolId: string): MaintenanceTicket[] {
  return readAll(schoolId).tickets;
}

export function upsertTicket(schoolId: string, ticket: MaintenanceTicket): MaintenanceTicket {
  const data = readAll(schoolId);
  const idx = data.tickets.findIndex((x) => x.id === ticket.id);
  if (idx >= 0) data.tickets[idx] = ticket;
  else data.tickets.unshift(ticket);
  writeAll(schoolId, data);
  return ticket;
}

export function deleteTicket(schoolId: string, id: string) {
  const data = readAll(schoolId);
  data.tickets = data.tickets.filter((x) => x.id !== id);
  writeAll(schoolId, data);
}

export function getPurchaseRequests(schoolId: string): PurchaseRequest[] {
  return readAll(schoolId).purchase_requests;
}

export function upsertPurchaseRequest(schoolId: string, pr: PurchaseRequest): PurchaseRequest {
  const data = readAll(schoolId);
  const idx = data.purchase_requests.findIndex((x) => x.id === pr.id);
  if (idx >= 0) data.purchase_requests[idx] = pr;
  else data.purchase_requests.unshift(pr);
  writeAll(schoolId, data);
  return pr;
}

export function deletePurchaseRequest(schoolId: string, id: string) {
  const data = readAll(schoolId);
  data.purchase_requests = data.purchase_requests.filter((x) => x.id !== id);
  writeAll(schoolId, data);
}

export function getPurchaseOrders(schoolId: string): PurchaseOrder[] {
  return readAll(schoolId).purchase_orders;
}

export function upsertPurchaseOrder(schoolId: string, po: PurchaseOrder): PurchaseOrder {
  const data = readAll(schoolId);
  const idx = data.purchase_orders.findIndex((x) => x.id === po.id);
  if (idx >= 0) data.purchase_orders[idx] = po;
  else data.purchase_orders.unshift(po);
  writeAll(schoolId, data);
  return po;
}

export function getGoodsReceipts(schoolId: string): GoodsReceipt[] {
  return readAll(schoolId).goods_receipts;
}

export function addGoodsReceipt(schoolId: string, gr: GoodsReceipt): GoodsReceipt {
  const data = readAll(schoolId);
  data.goods_receipts.unshift(gr);
  writeAll(schoolId, data);
  return gr;
}

export function computeStockByItem(schoolId: string): Record<string, number> {
  const data = readAll(schoolId);
  const totals: Record<string, number> = {};
  for (const m of data.movements) {
    const prev = totals[m.item_id] ?? 0;
    let next = prev;
    if (m.type === "receive") next += m.qty;
    else if (m.type === "issue") next -= m.qty;
    else next += m.qty;
    totals[m.item_id] = next;
  }
  return totals;
}

