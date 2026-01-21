import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class PurchaseRequest(Base):
    __tablename__ = "purchase_requests"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")  # draft, submitted, approved, rejected
    decision_note: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    decided_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class PurchaseRequestLine(Base):
    __tablename__ = "purchase_request_lines"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_request_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("purchase_requests.id"), index=True, nullable=False)
    item_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("inventory_items.id"), index=True, nullable=False)

    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    vendor_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("vendors.id"), index=True, nullable=False)

    created_from_purchase_request_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), ForeignKey("purchase_requests.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")  # open, partial, closed, cancelled

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class PurchaseOrderLine(Base):
    __tablename__ = "purchase_order_lines"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_order_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("purchase_orders.id"), index=True, nullable=False)
    item_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("inventory_items.id"), index=True, nullable=False)

    qty_ordered: Mapped[int] = mapped_column(Integer, nullable=False)
    qty_received: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unit_price: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)


class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id"), index=True, nullable=False)
    purchase_order_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("purchase_orders.id"), index=True, nullable=False)
    location_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("inventory_locations.id"), index=True, nullable=False)

    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    received_by_user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)


class GoodsReceiptLine(Base):
    __tablename__ = "goods_receipt_lines"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goods_receipt_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("goods_receipts.id"), index=True, nullable=False)
    purchase_order_line_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("purchase_order_lines.id"), index=True, nullable=False)

    qty_received: Mapped[int] = mapped_column(Integer, nullable=False)
