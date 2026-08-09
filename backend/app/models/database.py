"""SQLAlchemy ORM models — mirror the architecture doc section 5 tables exactly,
with cross-compatible types (SQLite default, PostgreSQL via DATABASE_URL).

Conventions:
- ``sa.Uuid`` PKs with Python-side ``default=uuid.uuid4`` (native UUID on PG,
  CHAR(32) on SQLite) — never ``server_default=gen_random_uuid()``.
- ``JSON`` not ``JSONB``; ``String`` not PG ``ENUM``; naive-UTC ``DateTime``.
- ``Numeric`` for money; store as integer minor units (paise) in app layer, coerce at boundary only.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from ..config import settings
from ..engines.money import to_paise, from_paise


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

class Organization(Base):
    """Multi-tenant organization — the top-level isolation boundary."""
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    slug: Mapped[str] = mapped_column(sa.String(100), unique=True, nullable=False, index=True)
    plan: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="free")  # free, pro, enterprise
    is_active: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    email: Mapped[str] = mapped_column(sa.String(255), unique=True, nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(sa.String(20), unique=True, nullable=True)
    role: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="BILL")  # OWNER/MANAGER/BILLER/WORKER
    hashed_password: Mapped[str] = mapped_column(sa.String(255), nullable=False)  # additive: self-contained JWT
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("organizations.id"), nullable=True, index=True)
    store_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, default=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(sa.DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("organizations.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    resource: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    resource_id: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(sa.String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class OAuthAccount(Base):
    """Linked OAuth accounts (Google, etc.) for a user."""
    __tablename__ = "oauth_accounts"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("users.id"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(sa.String(50), nullable=False)  # "google"
    provider_user_id: Mapped[str] = mapped_column(sa.String(255), nullable=False, index=True)
    provider_email: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    access_token: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    refresh_token: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime, nullable=True)
    scope: Mapped[Optional[str]] = mapped_column(sa.String(500), nullable=True)
    token_type: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    __table_args__ = (
        sa.UniqueConstraint("provider", "provider_user_id", name="uq_oauth_provider_user"),
    )


class Invitation(Base):
    __tablename__ = "invitations"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(sa.String(255), nullable=False, index=True)
    role: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    token_hash: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False)
    invited_by: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("users.id"), nullable=False)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class EmailVerification(Base):
    """Email verification tokens for new registrations."""
    __tablename__ = "email_verifications"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("users.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class PasswordReset(Base):
    """Password reset tokens."""
    __tablename__ = "password_resets"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("users.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class Store(Base):
    __tablename__ = "stores"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("organizations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("users.id"), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    gst_number: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    store_type: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("organizations.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    contact_person: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    gst_number: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(sa.String(500), nullable=True)
    payment_terms: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    lead_time_days: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=2)
    notes: Mapped[Optional[str]] = mapped_column(sa.String(1000), nullable=True)
    on_time_delivery_score: Mapped[Optional[float]] = mapped_column(sa.Numeric(5, 2), nullable=True, default=95.0)
    expiry_quality_score: Mapped[Optional[float]] = mapped_column(sa.Numeric(5, 2), nullable=True, default=98.0)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        sa.Index("idx_products_store_barcode", "store_id", "barcode"),
        sa.Index("idx_products_organization", "organization_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("organizations.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    sku: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    barcode: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    unit: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="pkt")
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
        sa.Index("idx_batches_organization", "organization_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("organizations.id"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    batch_number: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    expiry_date: Mapped[date] = mapped_column(sa.Date, nullable=False)
    purchase_price: Mapped[Optional[int]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    received_date: Mapped[date] = mapped_column(sa.Date, nullable=False, default=date.today)
    fefo_priority: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    last_sale_date: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)  # additive: detect_risks
    days_in_store: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)  # additive: detect_risks


class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        sa.Index("idx_sales_date", "store_id", "sale_date"),
        sa.Index("idx_sales_product", "product_id", "sale_date"),
        sa.Index("idx_sales_organization", "organization_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("organizations.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("inventory_batches.id"), nullable=True)
    quantity_sold: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    sale_price: Mapped[int] = mapped_column(sa.Numeric(10, 2), nullable=False)
    gst_amount: Mapped[Optional[int]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, nullable=True)
    sale_date: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)
    pos_session_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, nullable=True)


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        sa.Index("idx_invoices_date", "store_id", "created_at"),
        sa.Index("idx_invoices_organization", "organization_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("organizations.id"), nullable=False, index=True)
    invoice_number: Mapped[str] = mapped_column(sa.String(100), unique=True, nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    cashier_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("users.id"), nullable=True)
    pos_session_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, nullable=True)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, nullable=True)

    subtotal: Mapped[int] = mapped_column(sa.Numeric(10, 2), nullable=False, default=0)
    total_discount: Mapped[int] = mapped_column(sa.Numeric(10, 2), nullable=False, default=0)
    total_gst: Mapped[int] = mapped_column(sa.Numeric(10, 2), nullable=False, default=0)
    grand_total: Mapped[int] = mapped_column(sa.Numeric(10, 2), nullable=False, default=0)

    payment_method: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="CASH")
    amount_paid: Mapped[int] = mapped_column(sa.Numeric(10, 2), nullable=False, default=0)
    change_due: Mapped[int] = mapped_column(sa.Numeric(10, 2), nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)

    # Relationship to items
    items: Mapped[list["InvoiceItem"]] = sa.orm.relationship("InvoiceItem", back_populates="invoice")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("organizations.id"), nullable=False, index=True)
    invoice_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("invoices.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("inventory_batches.id"), nullable=True)

    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    unit_price: Mapped[int] = mapped_column(sa.Numeric(10, 2), nullable=False)

    discount_amount: Mapped[int] = mapped_column(sa.Numeric(10, 2), nullable=False, default=0)
    taxable_amount: Mapped[int] = mapped_column(sa.Numeric(10, 2), nullable=False)
    gst_rate: Mapped[float] = mapped_column(sa.Numeric(5, 2), nullable=False)
    gst_amount: Mapped[int] = mapped_column(sa.Numeric(10, 2), nullable=False)
    line_total: Mapped[int] = mapped_column(sa.Numeric(10, 2), nullable=False)

    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)

    invoice: Mapped["Invoice"] = sa.orm.relationship("Invoice", back_populates="items")


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("organizations.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("inventory_batches.id"), nullable=True)

    # Optional links to triggers
    invoice_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("invoices.id"), nullable=True)

    tx_type: Mapped[str] = mapped_column(sa.String(50), nullable=False) # SALE, RECEIVE, RETURN, SPOILAGE, TRANSFER
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False) # positive (receive) or negative (sale/spoilage)

    note: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    performed_by: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"
    __table_args__ = (
        sa.Index("idx_recommendations_status", "store_id", "status"),
        sa.Index("idx_recommendations_organization", "organization_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("organizations.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    batch_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("inventory_batches.id"), nullable=False)
    risk_type: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    severity: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    value_at_risk: Mapped[Optional[int]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    recommendation_json: Mapped[list] = mapped_column(sa.JSON, nullable=False)  # JSON not JSONB (cross-compat)
    status: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="PENDING")  # PENDING/EXECUTED/DISMISSED
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)
    executed_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime, nullable=True)


class WasteEvent(Base):
    __tablename__ = "waste_events"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("organizations.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    potential_value: Mapped[int] = mapped_column(sa.Numeric(10, 2), nullable=False)
    intervention_type: Mapped[str] = mapped_column(sa.String(50), nullable=False)  # DISCOUNT/TRANSFER/RETURN/REORDER
    value_prevented: Mapped[Optional[int]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    actual_waste: Mapped[Optional[int]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class GreenScoreHistory(Base):
    __tablename__ = "green_score_history"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("organizations.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    score: Mapped[float] = mapped_column(sa.Numeric(5, 2), nullable=False)
    expiry_score: Mapped[Optional[float]] = mapped_column(sa.Numeric(5, 2), nullable=True)
    inventory_score: Mapped[Optional[float]] = mapped_column(sa.Numeric(5, 2), nullable=True)
    dead_stock_score: Mapped[Optional[float]] = mapped_column(sa.Numeric(5, 2), nullable=True)
    waste_score: Mapped[Optional[float]] = mapped_column(sa.Numeric(5, 2), nullable=True)
    period_date: Mapped[date] = mapped_column(sa.Date, nullable=False)


class MonthlyReport(Base):
    __tablename__ = "monthly_reports"
    __table_args__ = (
        sa.Index("idx_monthly_reports_store_month", "store_id", "month_year"),
        sa.Index("idx_monthly_reports_organization", "organization_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("organizations.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    month_year: Mapped[str] = mapped_column(sa.String(7), nullable=False)  # YYYY-MM
    total_sales: Mapped[int] = mapped_column(sa.Numeric(12, 2), nullable=False, default=0)
    total_transactions: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    waste_prevented_value: Mapped[int] = mapped_column(sa.Numeric(10, 2), nullable=False, default=0)
    actual_waste_value: Mapped[int] = mapped_column(sa.Numeric(10, 2), nullable=False, default=0)
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
    suggested_price: Mapped[Optional[int]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class AIDecision(Base):
    """Structured memory of what an owner did with an AI recommendation.

    This is the feedback loop (AI spec §9–§10): the AI proposes an action, the
    owner accepts/rejects/executes it, and later we measure the outcome. The
    LLM itself never stores "facts" here — only structured events do.
    """

    __tablename__ = "ai_decisions"
    __table_args__ = (sa.Index("idx_ai_decisions_store", "store_id", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=True)
    recommendation_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, sa.ForeignKey("ai_recommendations.id"), nullable=True)
    product_name: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    action_type: Mapped[str] = mapped_column(sa.String(50), nullable=False)  # REORDER/DISCOUNT/SELL_FIRST/STOP_BUYING/PROMOTE
    decision: Mapped[str] = mapped_column(sa.String(20), nullable=False)  # ACCEPTED/REJECTED/EXECUTED/DISMISSED
    notes: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    outcome: Mapped[Optional[dict]] = mapped_column(sa.JSON, nullable=True)  # measured result, filled later
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class AILog(Base):
    """Audit log for AI requests: what was asked, which model answered, OK?"

    Keeps request/response *summaries* (never raw PII or full free text) so an
    admin can see what the AI surfaced and when. Optional but encouraged — the
    AI spec §26 requires this trail.
    """

    __tablename__ = "ai_logs"
    __table_args__ = (sa.Index("idx_ai_logs_store", "store_id", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    feature: Mapped[str] = mapped_column(sa.String(50), nullable=False)  # copilot/insight/briefing/behavior
    model: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    prompt_version: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="v1")
    request_summary: Mapped[str] = mapped_column(sa.String(500), nullable=False, default="")
    response_summary: Mapped[str] = mapped_column(sa.String(500), nullable=False, default="")
    ok: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    supplier_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("suppliers.id"), nullable=False)
    status: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="Pending")
    expected_delivery: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)
    
    items: Mapped[list["PurchaseOrderItem"]] = sa.orm.relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    purchase_order_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("purchase_orders.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    unit_price: Mapped[Optional[int]] = mapped_column(sa.Numeric(10, 2), nullable=True)
    
    purchase_order: Mapped["PurchaseOrder"] = sa.orm.relationship("PurchaseOrder", back_populates="items")


class StockTransfer(Base):
    __tablename__ = "stock_transfers"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    from_store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    to_store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    status: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="PENDING")
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class Return(Base):
    __tablename__ = "returns"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    pos_session_id: Mapped[Optional[uuid.UUID]] = mapped_column(sa.Uuid, nullable=True)
    product_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    status: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="PENDING")
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)


class WhatsappMessage(Base):
    __tablename__ = "whatsapp_messages"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, sa.ForeignKey("stores.id"), nullable=False)
    customer_phone: Mapped[str] = mapped_column(sa.String(20), nullable=False)
    message_text: Mapped[str] = mapped_column(sa.Text, nullable=False)
    is_from_customer: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, default=True)
    timestamp: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False, default=utcnow)



# ------------------------------------------------------------------------- util

def create_all() -> None:
    """Create tables if they don't exist (used in main lifespan)."""
    Base.metadata.create_all(engine)


def drop_all() -> None:
    """Drop all tables (used by seed --force and tests)."""
    Base.metadata.drop_all(engine)
