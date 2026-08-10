"""SQLAlchemy ORM models — mirror the architecture doc section 5 tables exactly,
with cross-compatible types (SQLite default, PostgreSQL via DATABASE_URL).

Conventions:
- ``sa.Uuid`` PKs with Python-side ``default=uuid.uuid4`` (native UUID on PG,
  CHAR(32) on SQLite) — never ``server_default=gen_random_uuid()``.
- ``JSON`` not ``JSONB``; ``String`` not PG ``ENUM``; naive-UTC ``DateTime``.
- ``Numeric`` for money; coerce to ``float`` at serialization (never == on Numeric).
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from ..config import settings


def utcnow() -> datetime:
    """Naive UTC now (timezone-naive everywhere for SQLite/PG compatibility)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------- engine/session

def _make_engine(url: str):
    kwargs: dict = {}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    return sa.create_engine(url, **kwargs)


engine = _make_engine(settings.DATABASE_URL)
SessionLocal = sa.orm.sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


# ----------------------------------------------------------------------- users

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    email: Mapped[str] = mapped_column(sa.String(255), unique=True, nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(sa.String(20), unique=True, nullable=True)
    role: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="BILL")  # OWNER/MANAGER/BILLER/WORKER/BILL
    hashed_password: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)  # nullable for Google auth users
    google_id: Mapped[Optional[str]] = mapped_column(sa.String(255), unique=True, nullable=True)
    picture_url: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    store_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class Store(Base):
    __tablename__ = "stores"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("users.id"), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    store_type: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    contact_phone: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    gst_number: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    on_time_delivery_score: Mapped[Optional[float]] = mapped_column(sa.Numeric(5, 2), nullable=True)
    expiry_quality_score: Mapped[Optional[float]] = mapped_column(sa.Numeric(5, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (sa.Index("idx_products_store_barcode", "store_id", "barcode"),)

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    sku: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    barcode: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    purchase_price: Mapped[Optional[float]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    selling_price: Mapped[Optional[float]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    gst_rate: Mapped[Optional[float]] = mapped_column(sa.Numeric(5, 2), nullable=True)
    supplier_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("suppliers.id"), nullable=True)
    lead_time_days: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=2)  # additive: reorder calc
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class InventoryBatch(Base):
    __tablename__ = "inventory_batches"
    __table_args__ = (
        sa.Index("idx_batches_expiry", "store_id", "expiry_date"),
        sa.Index("idx_batches_product", "product_id", "store_id"),  # additive: velocity path
    )

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    batch_number: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    expiry_date: Mapped[date] = mapped_column(sa.Date, nullable=False)
    purchase_price: Mapped[Optional[float]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    received_date: Mapped[date] = mapped_column(sa.Date, nullable=False, default=date.today)
    fefo_priority: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    last_sale_date: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)  # additive: detect_risks
    days_in_store: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)  # additive: detect_risks


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    invoice_number: Mapped[str] = mapped_column(sa.String(100), unique=True, nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    cashier_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("users.id"), nullable=False)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, nullable=True)
    subtotal: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    total_mrp: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    total_discount: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    total_gst: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    grand_total: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    amount_paid: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    change_amount: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    invoice_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("invoices.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    product_name_snapshot: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    sku_snapshot: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    barcode_snapshot: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    unit: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="Piece")
    mrp: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    selling_price: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    discount_type: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    discount_value: Mapped[Optional[float]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    discount_amount: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False, default=0.0)
    taxable_amount: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    gst_rate: Mapped[float] = mapped_column(sa.Numeric(5, 2), nullable=False)
    gst_amount: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    total_amount: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)


class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        sa.Index("idx_sales_date", "store_id", "sale_date"),
        sa.Index("idx_sales_product", "product_id", "sale_date"),  # additive: velocity path
    )

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    invoice_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("invoices.id"), nullable=True)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("inventory_batches.id"), nullable=True)
    quantity_sold: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    sale_price: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    gst_amount: Mapped[Optional[float]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, nullable=True)
    sale_date: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)
    pos_session_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, nullable=True)


class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"
    __table_args__ = (sa.Index("idx_recommendations_status", "store_id", "status"),)

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    batch_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("inventory_batches.id"), nullable=False)
    risk_type: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    severity: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    value_at_risk: Mapped[Optional[float]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    recommendation_json: Mapped[list] = mapped_column(sa.JSON, nullable=False)  # JSON not JSONB (cross-compat)
    status: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="PENDING")  # PENDING/EXECUTED/DISMISSED
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)
    executed_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime, nullable=True)


class WasteEvent(Base):
    __tablename__ = "waste_events"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    potential_value: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    intervention_type: Mapped[str] = mapped_column(sa.String(50), nullable=False)  # DISCOUNT/TRANSFER/RETURN/REORDER
    value_prevented: Mapped[Optional[float]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    actual_waste: Mapped[Optional[float]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class GreenScoreHistory(Base):
    __tablename__ = "green_score_history"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    score: Mapped[float] = mapped_column(sa.Numeric(5, 2), nullable=False)
    expiry_score: Mapped[Optional[float]] = mapped_column(sa.Numeric(5, 2), nullable=True)
    inventory_score: Mapped[Optional[float]] = mapped_column(sa.Numeric(5, 2), nullable=True)
    dead_stock_score: Mapped[Optional[float]] = mapped_column(sa.Numeric(5, 2), nullable=True)
    waste_score: Mapped[Optional[float]] = mapped_column(sa.Numeric(5, 2), nullable=True)
    period_date: Mapped[date] = mapped_column(sa.Date, nullable=False)


class MonthlyReport(Base):
    __tablename__ = "monthly_reports"
    __table_args__ = (sa.Index("idx_monthly_reports_store_month", "store_id", "month_year"),)

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    month_year: Mapped[str] = mapped_column(sa.String(7), nullable=False)  # YYYY-MM
    total_sales: Mapped[float] = mapped_column(sa.Numeric(12, 2), nullable=False, default=0.0)
    total_transactions: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    waste_prevented_value: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False, default=0.0)
    actual_waste_value: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False, default=0.0)
    avg_green_score: Mapped[float] = mapped_column(sa.Numeric(5, 2), nullable=False, default=0.0)
    top_category: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    top_selling_product: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    summary_json: Mapped[dict] = mapped_column(sa.JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class BarcodeCatalog(Base):
    __tablename__ = "barcode_catalog"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    barcode: Mapped[str] = mapped_column(sa.String(100), unique=True, nullable=False, index=True)
    product_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    brand: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    suggested_price: Mapped[Optional[float]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    loyalty_points: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    supplier_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("suppliers.id"), nullable=False)
    status: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="DRAFT")  # DRAFT/SENT/RECEIVED/CANCELLED
    total_amount: Mapped[Optional[float]] = mapped_column(sa.Numeric(12, 2), nullable=True)
    expected_delivery_date: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow, onupdate=utcnow)


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    po_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("purchase_orders.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=1)
    unit_price: Mapped[Optional[float]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    received_quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)


class StockTransfer(Base):
    __tablename__ = "stock_transfers"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    source_store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    destination_store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    status: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="PENDING")  # PENDING/SHIPPED/RECEIVED/CANCELLED
    transfer_date: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class StockTransferItem(Base):
    __tablename__ = "stock_transfer_items"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    transfer_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stock_transfers.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("inventory_batches.id"), nullable=True)
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=1)


class Return(Base):
    __tablename__ = "returns"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("customers.id"), nullable=True)
    sale_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("sales.id"), nullable=True)
    total_refund: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False, default=0.0)
    reason: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    return_date: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class ReturnItem(Base):
    __tablename__ = "return_items"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    return_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("returns.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("inventory_batches.id"), nullable=True)
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=1)
    refund_amount: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False, default=0.0)
    condition: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="SELLABLE")  # SELLABLE/DAMAGED/EXPIRED


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, nullable=False)
    details: Mapped[dict] = mapped_column(sa.JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


# ------------------------------------------------------------------------- util

def create_all() -> None:
    """Create tables if they don't exist (used in main lifespan)."""
    Base.metadata.create_all(engine)


def drop_all() -> None:
    """Drop all tables (used by seed --force and tests)."""
    Base.metadata.drop_all(engine)
