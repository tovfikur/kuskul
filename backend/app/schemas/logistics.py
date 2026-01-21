"""Logistics module schemas for API input/output validation."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ============================================================================
# Inventory Schemas
# ============================================================================

class InventoryItemCreate(BaseModel):
    sku: str = Field(..., max_length=100)
    name: str = Field(..., max_length=200)
    uom: str = Field(..., max_length=50)
    reorder_level: Optional[int] = None
    is_active: bool = True


class InventoryItemUpdate(BaseModel):
    sku: Optional[str] = Field(None, max_length=100)
    name: Optional[str] = Field(None, max_length=200)
    uom: Optional[str] = Field(None, max_length=50)
    reorder_level: Optional[int] = None
    is_active: Optional[bool] = None


class InventoryItemOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    sku: str
    name: str
    uom: str
    reorder_level: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]


class InventoryLocationCreate(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=200)
    is_active: bool = True


class InventoryLocationUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, max_length=200)
    is_active: Optional[bool] = None


class InventoryLocationOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    code: str
    name: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]


class StockMovementCreate(BaseModel):
    item_id: uuid.UUID
    location_id: uuid.UUID
    type: str = Field(..., pattern="^(receive|issue|adjust)$")
    qty: int
    ref_type: Optional[str] = Field(None, pattern="^(po|manual)$")
    ref_id: Optional[str] = Field(None, max_length=100)
    note: Optional[str] = Field(None, max_length=500)


class StockMovementOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    item_id: uuid.UUID
    location_id: uuid.UUID
    type: str
    qty: int
    ref_type: Optional[str]
    ref_id: Optional[str]
    note: Optional[str]
    created_at: datetime
    created_by_user_id: Optional[uuid.UUID]


class StockOnHandRow(BaseModel):
    item_id: uuid.UUID
    sku: str
    item_name: str
    location_id: uuid.UUID
    location_name: str
    uom: str
    qty_on_hand: int


# ============================================================================
# Vendor Schemas
# ============================================================================

class VendorCreate(BaseModel):
    name: str = Field(..., max_length=200)
    phone: Optional[str] = Field(None, max_length=32)
    email: Optional[str] = Field(None, max_length=255)
    status: str = Field("active", pattern="^(active|inactive)$")


class VendorUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=32)
    email: Optional[str] = Field(None, max_length=255)
    status: Optional[str] = Field(None, pattern="^(active|inactive)$")


class VendorOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    name: str
    phone: Optional[str]
    email: Optional[str]
    status: str
    created_at: datetime
    updated_at: Optional[datetime]


# ============================================================================
# Procurement Schemas
# ============================================================================

class PurchaseRequestLineCreate(BaseModel):
    item_id: uuid.UUID
    qty: int
    note: Optional[str] = Field(None, max_length=500)


class PurchaseRequestCreate(BaseModel):
    lines: list[PurchaseRequestLineCreate]


class PurchaseRequestLineOut(BaseModel):
    id: uuid.UUID
    purchase_request_id: uuid.UUID
    item_id: uuid.UUID
    qty: int
    note: Optional[str]


class PurchaseRequestOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    status: str
    decision_note: Optional[str]
    decided_by_user_id: Optional[uuid.UUID]
    decided_at: Optional[datetime]
    created_at: datetime
    created_by_user_id: uuid.UUID
    updated_at: Optional[datetime]


class PurchaseOrderLineCreate(BaseModel):
    item_id: uuid.UUID
    qty_ordered: int
    unit_price: Optional[float] = None


class PurchaseOrderCreate(BaseModel):
    vendor_id: uuid.UUID
    created_from_purchase_request_id: Optional[uuid.UUID] = None
    lines: list[PurchaseOrderLineCreate]


class PurchaseOrderLineOut(BaseModel):
    id: uuid.UUID
    purchase_order_id: uuid.UUID
    item_id: uuid.UUID
    qty_ordered: int
    qty_received: int
    unit_price: Optional[float]


class PurchaseOrderOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    vendor_id: uuid.UUID
    created_from_purchase_request_id: Optional[uuid.UUID]
    status: str
    created_at: datetime
    created_by_user_id: uuid.UUID
    updated_at: Optional[datetime]


class GoodsReceiptLineCreate(BaseModel):
    purchase_order_line_id: uuid.UUID
    qty_received: int


class GoodsReceiptCreate(BaseModel):
    purchase_order_id: uuid.UUID
    location_id: uuid.UUID
    lines: list[GoodsReceiptLineCreate]


class GoodsReceiptLineOut(BaseModel):
    id: uuid.UUID
    goods_receipt_id: uuid.UUID
    purchase_order_line_id: uuid.UUID
    qty_received: int


class GoodsReceiptOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    purchase_order_id: uuid.UUID
    location_id: uuid.UUID
    received_at: datetime
    received_by_user_id: uuid.UUID


# ============================================================================
# Asset Schemas
# ============================================================================

class AssetCreate(BaseModel):
    tag: str = Field(..., max_length=100)
    serial_no: Optional[str] = Field(None, max_length=100)
    name: str = Field(..., max_length=200)
    category: str = Field(..., max_length=100)
    location: str = Field(..., max_length=200)
    custodian_user_id: Optional[uuid.UUID] = None
    status: str = Field("in_use", pattern="^(in_use|in_repair|retired)$")


class AssetUpdate(BaseModel):
    tag: Optional[str] = Field(None, max_length=100)
    serial_no: Optional[str] = Field(None, max_length=100)
    name: Optional[str] = Field(None, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=200)
    custodian_user_id: Optional[uuid.UUID] = None
    status: Optional[str] = Field(None, pattern="^(in_use|in_repair|retired)$")


class AssetOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    tag: str
    serial_no: Optional[str]
    name: str
    category: str
    location: str
    custodian_user_id: Optional[uuid.UUID]
    status: str
    created_at: datetime
    updated_at: Optional[datetime]


# ============================================================================
# Maintenance Schemas
# ============================================================================

class MaintenanceTicketCreate(BaseModel):
    asset_id: Optional[uuid.UUID] = None
    title: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    priority: str = Field("medium", pattern="^(low|medium|high)$")
    status: str = Field("open", pattern="^(open|in_progress|done)$")
    assigned_to_user_id: Optional[uuid.UUID] = None
    cost: Optional[float] = None


class MaintenanceTicketUpdate(BaseModel):
    asset_id: Optional[uuid.UUID] = None
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    priority: Optional[str] = Field(None, pattern="^(low|medium|high)$")
    status: Optional[str] = Field(None, pattern="^(open|in_progress|done)$")
    assigned_to_user_id: Optional[uuid.UUID] = None
    cost: Optional[float] = None


class MaintenanceTicketOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    asset_id: Optional[uuid.UUID]
    title: str
    description: Optional[str]
    priority: str
    status: str
    assigned_to_user_id: Optional[uuid.UUID]
    cost: Optional[float]
    created_at: datetime
    created_by_user_id: uuid.UUID
    updated_at: Optional[datetime]


# ============================================================================
# Pagination Schemas
# ============================================================================

class PagedResult(BaseModel):
    items: list
    total: int
    limit: int
    offset: int
