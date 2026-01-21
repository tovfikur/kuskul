"""Logistics & Operations API endpoints."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.asset import Asset, MaintenanceTicket
from app.models.inventory import InventoryItem, InventoryLocation, StockMovement
from app.models.procurement import (
    GoodsReceipt,
    GoodsReceiptLine,
    PurchaseOrder,
    PurchaseOrderLine,
    PurchaseRequest,
    PurchaseRequestLine,
)
from app.models.user import User
from app.models.vendor import Vendor
from app.schemas.logistics import (
    AssetCreate,
    AssetOut,
    AssetUpdate,
    GoodsReceiptCreate,
    GoodsReceiptOut,
    InventoryItemCreate,
    InventoryItemOut,
    InventoryItemUpdate,
    InventoryLocationCreate,
    InventoryLocationOut,
    InventoryLocationUpdate,
    MaintenanceTicketCreate,
    MaintenanceTicketOut,
    MaintenanceTicketUpdate,
    PurchaseOrderCreate,
    PurchaseOrderOut,
    PurchaseRequestCreate,
    PurchaseRequestOut,
    StockMovementCreate,
    StockMovementOut,
    StockOnHandRow,
    VendorCreate,
    VendorOut,
    VendorUpdate,
)

router = APIRouter(dependencies=[Depends(require_permission("logistics:read"))])


# ============================================================================
# Inventory Endpoints
# ============================================================================

@router.get("/inventory/items", response_model=dict)
def list_inventory_items(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    limit: int = 20,
    offset: int = 0,
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> dict:
    base = select(InventoryItem).where(InventoryItem.school_id == school_id)
    if q:
        base = base.where(
            InventoryItem.sku.ilike(f"%{q}%") | InventoryItem.name.ilike(f"%{q}%")
        )
    if is_active is not None:
        base = base.where(InventoryItem.is_active == is_active)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(InventoryItem.name.asc()).offset(offset).limit(limit)).scalars().all()
    return {
        "items": [InventoryItemOut.model_validate(r, from_attributes=True).model_dump() for r in rows],
        "total": int(total),
        "limit": limit,
        "offset": offset,
    }


@router.post("/inventory/items", response_model=InventoryItemOut, dependencies=[Depends(require_permission("logistics:write"))])
def create_inventory_item(
    payload: InventoryItemCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> InventoryItemOut:
    now = datetime.now(timezone.utc)
    item = InventoryItem(
        school_id=school_id,
        sku=payload.sku,
        name=payload.name,
        uom=payload.uom,
        reorder_level=payload.reorder_level,
        is_active=payload.is_active,
        created_at=now,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return InventoryItemOut.model_validate(item, from_attributes=True)


@router.put("/inventory/items/{item_id}", response_model=InventoryItemOut, dependencies=[Depends(require_permission("logistics:write"))])
def update_inventory_item(
    item_id: uuid.UUID,
    payload: InventoryItemUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> InventoryItemOut:
    item = db.get(InventoryItem, item_id)
    if not item or item.school_id != school_id:
        raise not_found("Inventory item not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(item, k, v)
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return InventoryItemOut.model_validate(item, from_attributes=True)


@router.get("/inventory/locations", response_model=dict)
def list_inventory_locations(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    limit: int = 100,
    offset: int = 0,
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> dict:
    base = select(InventoryLocation).where(InventoryLocation.school_id == school_id)
    if q:
        base = base.where(
            InventoryLocation.code.ilike(f"%{q}%") | InventoryLocation.name.ilike(f"%{q}%")
        )
    if is_active is not None:
        base = base.where(InventoryLocation.is_active == is_active)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(InventoryLocation.name.asc()).offset(offset).limit(limit)).scalars().all()
    return {
        "items": [InventoryLocationOut.model_validate(r, from_attributes=True).model_dump() for r in rows],
        "total": int(total),
        "limit": limit,
        "offset": offset,
    }


@router.post("/inventory/locations", response_model=InventoryLocationOut, dependencies=[Depends(require_permission("logistics:write"))])
def create_inventory_location(
    payload: InventoryLocationCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> InventoryLocationOut:
    now = datetime.now(timezone.utc)
    location = InventoryLocation(
        school_id=school_id,
        code=payload.code,
        name=payload.name,
        is_active=payload.is_active,
        created_at=now,
    )
    db.add(location)
    db.commit()
    db.refresh(location)
    return InventoryLocationOut.model_validate(location, from_attributes=True)


@router.put("/inventory/locations/{location_id}", response_model=InventoryLocationOut, dependencies=[Depends(require_permission("logistics:write"))])
def update_inventory_location(
    location_id: uuid.UUID,
    payload: InventoryLocationUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> InventoryLocationOut:
    location = db.get(InventoryLocation, location_id)
    if not location or location.school_id != school_id:
        raise not_found("Location not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(location, k, v)
    location.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(location)
    return InventoryLocationOut.model_validate(location, from_attributes=True)


@router.get("/inventory/stock-on-hand", response_model=list[StockOnHandRow])
def get_stock_on_hand(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    location_id: Optional[uuid.UUID] = None,
) -> list[StockOnHandRow]:
    # Aggregate stock movements to calculate qty on hand
    query = (
        select(
            StockMovement.item_id,
            InventoryItem.sku,
            InventoryItem.name.label("item_name"),
            StockMovement.location_id,
            InventoryLocation.name.label("location_name"),
            InventoryItem.uom,
            func.sum(
                case(
                    (StockMovement.type == "receive", StockMovement.qty),
                    (StockMovement.type == "issue", -StockMovement.qty),
                    (StockMovement.type == "adjust", StockMovement.qty),
                    else_=0,
                )
            ).label("qty_on_hand"),
        )
        .join(InventoryItem, StockMovement.item_id == InventoryItem.id)
        .join(InventoryLocation, StockMovement.location_id == InventoryLocation.id)
        .where(StockMovement.school_id == school_id)
    )
    if location_id:
        query = query.where(StockMovement.location_id == location_id)
    query = query.group_by(
        StockMovement.item_id,
        InventoryItem.sku,
        InventoryItem.name,
        StockMovement.location_id,
        InventoryLocation.name,
        InventoryItem.uom,
    )
    rows = db.execute(query).all()
    return [
        StockOnHandRow(
            item_id=r.item_id,
            sku=r.sku,
            item_name=r.item_name,
            location_id=r.location_id,
            location_name=r.location_name,
            uom=r.uom,
            qty_on_hand=int(r.qty_on_hand or 0),
        )
        for r in rows
    ]


@router.get("/inventory/movements", response_model=dict)
def list_stock_movements(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    limit: int = 20,
    offset: int = 0,
    item_id: Optional[uuid.UUID] = None,
    location_id: Optional[uuid.UUID] = None,
) -> dict:
    base = select(StockMovement).where(StockMovement.school_id == school_id)
    if item_id:
        base = base.where(StockMovement.item_id == item_id)
    if location_id:
        base = base.where(StockMovement.location_id == location_id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(StockMovement.created_at.desc()).offset(offset).limit(limit)).scalars().all()
    return {
        "items": [StockMovementOut.model_validate(r, from_attributes=True).model_dump() for r in rows],
        "total": int(total),
        "limit": limit,
        "offset": offset,
    }


@router.post("/inventory/movements", response_model=StockMovementOut, dependencies=[Depends(require_permission("logistics:write"))])
def create_stock_movement(
    payload: StockMovementCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> StockMovementOut:
    # Verify item and location exist
    item = db.get(InventoryItem, payload.item_id)
    if not item or item.school_id != school_id:
        raise not_found("Inventory item not found")
    location = db.get(InventoryLocation, payload.location_id)
    if not location or location.school_id != school_id:
        raise not_found("Location not found")
    
    now = datetime.now(timezone.utc)
    movement = StockMovement(
        school_id=school_id,
        item_id=payload.item_id,
        location_id=payload.location_id,
        type=payload.type,
        qty=payload.qty,
        ref_type=payload.ref_type,
        ref_id=payload.ref_id,
        note=payload.note,
        created_at=now,
        created_by_user_id=user.id,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return StockMovementOut.model_validate(movement, from_attributes=True)


# ============================================================================
# Vendor Endpoints
# ============================================================================

@router.get("/vendors", response_model=dict)
def list_vendors(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    limit: int = 20,
    offset: int = 0,
    q: Optional[str] = None,
    status: Optional[str] = None,
) -> dict:
    base = select(Vendor).where(Vendor.school_id == school_id)
    if q:
        base = base.where(
            Vendor.name.ilike(f"%{q}%")
            | Vendor.phone.ilike(f"%{q}%")
            | Vendor.email.ilike(f"%{q}%")
        )
    if status:
        base = base.where(Vendor.status == status)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(Vendor.name.asc()).offset(offset).limit(limit)).scalars().all()
    return {
        "items": [VendorOut.model_validate(r, from_attributes=True).model_dump() for r in rows],
        "total": int(total),
        "limit": limit,
        "offset": offset,
    }


@router.post("/vendors", response_model=VendorOut, dependencies=[Depends(require_permission("logistics:write"))])
def create_vendor(
    payload: VendorCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> VendorOut:
    now = datetime.now(timezone.utc)
    vendor = Vendor(
        school_id=school_id,
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        status=payload.status,
        created_at=now,
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return VendorOut.model_validate(vendor, from_attributes=True)


@router.put("/vendors/{vendor_id}", response_model=VendorOut, dependencies=[Depends(require_permission("logistics:write"))])
def update_vendor(
    vendor_id: uuid.UUID,
    payload: VendorUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> VendorOut:
    vendor = db.get(Vendor, vendor_id)
    if not vendor or vendor.school_id != school_id:
        raise not_found("Vendor not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(vendor, k, v)
    vendor.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(vendor)
    return VendorOut.model_validate(vendor, from_attributes=True)


# ============================================================================
# Procurement Endpoints
# ============================================================================

@router.get("/procurement/purchase-requests", response_model=dict)
def list_purchase_requests(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    limit: int = 20,
    offset: int = 0,
    status: Optional[str] = None,
    q: Optional[str] = None,
) -> dict:
    base = select(PurchaseRequest).where(PurchaseRequest.school_id == school_id)
    if status:
        base = base.where(PurchaseRequest.status == status)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(PurchaseRequest.created_at.desc()).offset(offset).limit(limit)).scalars().all()
    return {
        "items": [PurchaseRequestOut.model_validate(r, from_attributes=True).model_dump() for r in rows],
        "total": int(total),
        "limit": limit,
        "offset": offset,
    }


@router.post("/procurement/purchase-requests", response_model=PurchaseRequestOut, dependencies=[Depends(require_permission("logistics:write"))])
def create_purchase_request(
    payload: PurchaseRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> PurchaseRequestOut:
    now = datetime.now(timezone.utc)
    pr = PurchaseRequest(
        school_id=school_id,
        status="draft",
        created_at=now,
        created_by_user_id=user.id,
    )
    db.add(pr)
    db.flush()
    
    for line in payload.lines:
        pr_line = PurchaseRequestLine(
            purchase_request_id=pr.id,
            item_id=line.item_id,
            qty=line.qty,
            note=line.note,
        )
        db.add(pr_line)
    
    db.commit()
    db.refresh(pr)
    return PurchaseRequestOut.model_validate(pr, from_attributes=True)


@router.patch("/procurement/purchase-requests/{pr_id}/submit", response_model=PurchaseRequestOut, dependencies=[Depends(require_permission("logistics:write"))])
def submit_purchase_request(
    pr_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> PurchaseRequestOut:
    pr = db.get(PurchaseRequest, pr_id)
    if not pr or pr.school_id != school_id:
        raise not_found("Purchase request not found")
    if pr.status != "draft":
        raise problem(status_code=400, title="Bad Request", detail="Can only submit draft purchase requests")
    pr.status = "submitted"
    pr.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pr)
    return PurchaseRequestOut.model_validate(pr, from_attributes=True)


@router.patch("/procurement/purchase-requests/{pr_id}/approve", response_model=PurchaseRequestOut, dependencies=[Depends(require_permission("logistics:write"))])
def approve_purchase_request(
    pr_id: uuid.UUID,
    decision_note: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> PurchaseRequestOut:
    pr = db.get(PurchaseRequest, pr_id)
    if not pr or pr.school_id != school_id:
        raise not_found("Purchase request not found")
    if pr.status != "submitted":
        raise problem(status_code=400, title="Bad Request", detail="Can only approve submitted purchase requests")
    now = datetime.now(timezone.utc)
    pr.status = "approved"
    pr.decision_note = decision_note
    pr.decided_by_user_id = user.id
    pr.decided_at = now
    pr.updated_at = now
    db.commit()
    db.refresh(pr)
    return PurchaseRequestOut.model_validate(pr, from_attributes=True)


@router.patch("/procurement/purchase-requests/{pr_id}/reject", response_model=PurchaseRequestOut, dependencies=[Depends(require_permission("logistics:write"))])
def reject_purchase_request(
    pr_id: uuid.UUID,
    decision_note: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> PurchaseRequestOut:
    pr = db.get(PurchaseRequest, pr_id)
    if not pr or pr.school_id != school_id:
        raise not_found("Purchase request not found")
    if pr.status != "submitted":
        raise problem(status_code=400, title="Bad Request", detail="Can only reject submitted purchase requests")
    now = datetime.now(timezone.utc)
    pr.status = "rejected"
    pr.decision_note = decision_note
    pr.decided_by_user_id = user.id
    pr.decided_at = now
    pr.updated_at = now
    db.commit()
    db.refresh(pr)
    return PurchaseRequestOut.model_validate(pr, from_attributes=True)


@router.get("/procurement/purchase-orders", response_model=dict)
def list_purchase_orders(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    limit: int = 20,
    offset: int = 0,
    status: Optional[str] = None,
    vendor_id: Optional[uuid.UUID] = None,
) -> dict:
    base = select(PurchaseOrder).where(PurchaseOrder.school_id == school_id)
    if status:
        base = base.where(PurchaseOrder.status == status)
    if vendor_id:
        base = base.where(PurchaseOrder.vendor_id == vendor_id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(PurchaseOrder.created_at.desc()).offset(offset).limit(limit)).scalars().all()
    return {
        "items": [PurchaseOrderOut.model_validate(r, from_attributes=True).model_dump() for r in rows],
        "total": int(total),
        "limit": limit,
        "offset": offset,
    }


@router.post("/procurement/purchase-orders", response_model=PurchaseOrderOut, dependencies=[Depends(require_permission("logistics:write"))])
def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> PurchaseOrderOut:
    # Verify vendor exists
    vendor = db.get(Vendor, payload.vendor_id)
    if not vendor or vendor.school_id != school_id:
        raise not_found("Vendor not found")
    
    now = datetime.now(timezone.utc)
    po = PurchaseOrder(
        school_id=school_id,
        vendor_id=payload.vendor_id,
        created_from_purchase_request_id=payload.created_from_purchase_request_id,
        status="open",
        created_at=now,
        created_by_user_id=user.id,
    )
    db.add(po)
    db.flush()
    
    for line in payload.lines:
        po_line = PurchaseOrderLine(
            purchase_order_id=po.id,
            item_id=line.item_id,
            qty_ordered=line.qty_ordered,
            qty_received=0,
            unit_price=line.unit_price,
        )
        db.add(po_line)
    
    db.commit()
    db.refresh(po)
    return PurchaseOrderOut.model_validate(po, from_attributes=True)


@router.patch("/procurement/purchase-orders/{po_id}/cancel", response_model=PurchaseOrderOut, dependencies=[Depends(require_permission("logistics:write"))])
def cancel_purchase_order(
    po_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> PurchaseOrderOut:
    po = db.get(PurchaseOrder, po_id)
    if not po or po.school_id != school_id:
        raise not_found("Purchase order not found")
    po.status = "cancelled"
    po.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(po)
    return PurchaseOrderOut.model_validate(po, from_attributes=True)


@router.get("/procurement/goods-receipts", response_model=dict)
def list_goods_receipts(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    limit: int = 20,
    offset: int = 0,
    purchase_order_id: Optional[uuid.UUID] = None,
) -> dict:
    base = select(GoodsReceipt).where(GoodsReceipt.school_id == school_id)
    if purchase_order_id:
        base = base.where(GoodsReceipt.purchase_order_id == purchase_order_id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(GoodsReceipt.received_at.desc()).offset(offset).limit(limit)).scalars().all()
    return {
        "items": [GoodsReceiptOut.model_validate(r, from_attributes=True).model_dump() for r in rows],
        "total": int(total),
        "limit": limit,
        "offset": offset,
    }


@router.post("/procurement/goods-receipts", response_model=GoodsReceiptOut, dependencies=[Depends(require_permission("logistics:write"))])
def create_goods_receipt(
    payload: GoodsReceiptCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> GoodsReceiptOut:
    # Verify PO and location exist
    po = db.get(PurchaseOrder, payload.purchase_order_id)
    if not po or po.school_id != school_id:
        raise not_found("Purchase order not found")
    location = db.get(InventoryLocation, payload.location_id)
    if not location or location.school_id != school_id:
        raise not_found("Location not found")
    
    now = datetime.now(timezone.utc)
    gr = GoodsReceipt(
        school_id=school_id,
        purchase_order_id=payload.purchase_order_id,
        location_id=payload.location_id,
        received_at=now,
        received_by_user_id=user.id,
    )
    db.add(gr)
    db.flush()
    
    # Create GR lines and update PO line quantities
    for line in payload.lines:
        po_line = db.get(PurchaseOrderLine, line.purchase_order_line_id)
        if not po_line or po_line.purchase_order_id != payload.purchase_order_id:
            raise not_found(f"Purchase order line {line.purchase_order_line_id} not found")
        
        gr_line = GoodsReceiptLine(
            goods_receipt_id=gr.id,
            purchase_order_line_id=line.purchase_order_line_id,
            qty_received=line.qty_received,
        )
        db.add(gr_line)
        
        # Update PO line qty_received
        po_line.qty_received += line.qty_received
        
        # Create stock movement
        movement = StockMovement(
            school_id=school_id,
            item_id=po_line.item_id,
            location_id=payload.location_id,
            type="receive",
            qty=line.qty_received,
            ref_type="po",
            ref_id=str(payload.purchase_order_id),
            note=f"GR from PO {str(payload.purchase_order_id)[:8]}",
            created_at=now,
            created_by_user_id=user.id,
        )
        db.add(movement)
    
    # Update PO status
    po_lines = db.execute(select(PurchaseOrderLine).where(PurchaseOrderLine.purchase_order_id == payload.purchase_order_id)).scalars().all()
    all_received = all(line.qty_received >= line.qty_ordered for line in po_lines)
    any_received = any(line.qty_received > 0 for line in po_lines)
    if all_received:
        po.status = "closed"
    elif any_received:
        po.status = "partial"
    po.updated_at = now
    
    db.commit()
    db.refresh(gr)
    return GoodsReceiptOut.model_validate(gr, from_attributes=True)


# ============================================================================
# Asset Endpoints
# ============================================================================

@router.get("/assets", response_model=dict)
def list_assets(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    limit: int = 20,
    offset: int = 0,
    q: Optional[str] = None,
    status: Optional[str] = None,
) -> dict:
    base = select(Asset).where(Asset.school_id == school_id)
    if q:
        base = base.where(
            Asset.tag.ilike(f"%{q}%")
            | Asset.name.ilike(f"%{q}%")
            | Asset.category.ilike(f"%{q}%")
        )
    if status:
        base = base.where(Asset.status == status)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(Asset.name.asc()).offset(offset).limit(limit)).scalars().all()
    return {
        "items": [AssetOut.model_validate(r, from_attributes=True).model_dump() for r in rows],
        "total": int(total),
        "limit": limit,
        "offset": offset,
    }


@router.post("/assets", response_model=AssetOut, dependencies=[Depends(require_permission("logistics:write"))])
def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> AssetOut:
    now = datetime.now(timezone.utc)
    asset = Asset(
        school_id=school_id,
        tag=payload.tag,
        serial_no=payload.serial_no,
        name=payload.name,
        category=payload.category,
        location=payload.location,
        custodian_user_id=payload.custodian_user_id,
        status=payload.status,
        created_at=now,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return AssetOut.model_validate(asset, from_attributes=True)


@router.put("/assets/{asset_id}", response_model=AssetOut, dependencies=[Depends(require_permission("logistics:write"))])
def update_asset(
    asset_id: uuid.UUID,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> AssetOut:
    asset = db.get(Asset, asset_id)
    if not asset or asset.school_id != school_id:
        raise not_found("Asset not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(asset, k, v)
    asset.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(asset)
    return AssetOut.model_validate(asset, from_attributes=True)


# ============================================================================
# Maintenance Endpoints
# ============================================================================

@router.get("/maintenance/tickets", response_model=dict)
def list_maintenance_tickets(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    limit: int = 20,
    offset: int = 0,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to_user_id: Optional[uuid.UUID] = None,
) -> dict:
    base = select(MaintenanceTicket).where(MaintenanceTicket.school_id == school_id)
    if status:
        base = base.where(MaintenanceTicket.status == status)
    if priority:
        base = base.where(MaintenanceTicket.priority == priority)
    if assigned_to_user_id:
        base = base.where(MaintenanceTicket.assigned_to_user_id == assigned_to_user_id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(MaintenanceTicket.created_at.desc()).offset(offset).limit(limit)).scalars().all()
    return {
        "items": [MaintenanceTicketOut.model_validate(r, from_attributes=True).model_dump() for r in rows],
        "total": int(total),
        "limit": limit,
        "offset": offset,
    }


@router.post("/maintenance/tickets", response_model=MaintenanceTicketOut, dependencies=[Depends(require_permission("logistics:write"))])
def create_maintenance_ticket(
    payload: MaintenanceTicketCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> MaintenanceTicketOut:
    now = datetime.now(timezone.utc)
    ticket = MaintenanceTicket(
        school_id=school_id,
        asset_id=payload.asset_id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        status=payload.status,
        assigned_to_user_id=payload.assigned_to_user_id,
        cost=payload.cost,
        created_at=now,
        created_by_user_id=user.id,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return MaintenanceTicketOut.model_validate(ticket, from_attributes=True)


@router.patch("/maintenance/tickets/{ticket_id}", response_model=MaintenanceTicketOut, dependencies=[Depends(require_permission("logistics:write"))])
def update_maintenance_ticket(
    ticket_id: uuid.UUID,
    payload: MaintenanceTicketUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> MaintenanceTicketOut:
    ticket = db.get(MaintenanceTicket, ticket_id)
    if not ticket or ticket.school_id != school_id:
        raise not_found("Maintenance ticket not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(ticket, k, v)
    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)
    return MaintenanceTicketOut.model_validate(ticket, from_attributes=True)


# ============================================================================
# Reports Endpoints
# ============================================================================

@router.get("/reports/stock-on-hand", response_model=list[StockOnHandRow])
def get_stock_on_hand_report(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    location_id: Optional[uuid.UUID] = None,
) -> list[StockOnHandRow]:
    return get_stock_on_hand(db=db, school_id=school_id, location_id=location_id)


@router.get("/reports/movements", response_model=list[dict])
def get_movements_report(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    location_id: Optional[uuid.UUID] = None,
) -> list[dict]:
    query = (
        select(
            StockMovement.id,
            InventoryItem.id.label("item_id"),
            InventoryItem.name.label("item_name"),
            InventoryItem.sku,
            InventoryLocation.name.label("location_name"),
            StockMovement.type,
            StockMovement.qty,
            StockMovement.note,
            StockMovement.created_at,
        )
        .join(InventoryItem, StockMovement.item_id == InventoryItem.id)
        .join(InventoryLocation, StockMovement.location_id == InventoryLocation.id)
        .where(StockMovement.school_id == school_id)
    )
    if location_id:
        query = query.where(StockMovement.location_id == location_id)
    query = query.order_by(StockMovement.created_at.desc())
    rows = db.execute(query).all()
    return [
        {
            "item_id": str(r.item_id),
            "item_name": r.item_name,
            "sku": r.sku,
            "location_name": r.location_name,
            "type": r.type,
            "qty": r.qty,
            "note": r.note,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@router.get("/reports/open-orders", response_model=list[dict])
def get_open_orders_report(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[dict]:
    query = (
        select(
            PurchaseOrder.id.label("po_id"),
            Vendor.name.label("vendor_name"),
            PurchaseOrder.status,
            PurchaseOrder.created_at,
            func.count(PurchaseOrderLine.id).label("total_items"),
        )
        .join(Vendor, PurchaseOrder.vendor_id == Vendor.id)
        .join(PurchaseOrderLine, PurchaseOrder.id == PurchaseOrderLine.purchase_order_id)
        .where(PurchaseOrder.school_id == school_id)
        .where(PurchaseOrder.status.in_(["open", "partial"]))
        .group_by(PurchaseOrder.id, Vendor.name, PurchaseOrder.status, PurchaseOrder.created_at)
        .order_by(PurchaseOrder.created_at.desc())
    )
    rows = db.execute(query).all()
    return [
        {
            "po_id": str(r.po_id),
            "vendor_name": r.vendor_name,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
            "total_items": r.total_items,
        }
        for r in rows
    ]


@router.get("/reports/asset-register", response_model=list[AssetOut])
def get_asset_register_report(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[AssetOut]:
    rows = db.execute(select(Asset).where(Asset.school_id == school_id).order_by(Asset.name.asc())).scalars().all()
    return [AssetOut.model_validate(r, from_attributes=True) for r in rows]


@router.get("/reports/maintenance-backlog", response_model=list[dict])
def get_maintenance_backlog_report(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[dict]:
    query = (
        select(
            MaintenanceTicket.id.label("ticket_id"),
            MaintenanceTicket.title,
            Asset.tag.label("asset_tag"),
            MaintenanceTicket.priority,
            MaintenanceTicket.status,
            MaintenanceTicket.cost,
            MaintenanceTicket.created_at,
        )
        .outerjoin(Asset, MaintenanceTicket.asset_id == Asset.id)
        .where(MaintenanceTicket.school_id == school_id)
        .where(MaintenanceTicket.status.in_(["open", "in_progress"]))
        .order_by(MaintenanceTicket.created_at.desc())
    )
    rows = db.execute(query).all()
    return [
        {
            "ticket_id": str(r.ticket_id),
            "title": r.title,
            "asset_tag": r.asset_tag,
            "priority": r.priority,
            "status": r.status,
            "cost": float(r.cost) if r.cost else None,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]
