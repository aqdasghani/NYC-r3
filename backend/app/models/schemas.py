"""Pydantic request/response schemas. Money fields are ``float`` so the
JS frontend gets numbers (DB stores ``Numeric`` / Decimal)."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# --------------------------------------------------------------------- auth

class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: str
    phone: Optional[str] = None
    password: str = Field(min_length=6, max_length=128)
    role: Literal["OWNER", "MANAGER", "BILLER", "WORKER", "BILL"] = "WORKER"
    store_name: Optional[str] = None
    store_type: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleLoginRequest(BaseModel):
    token: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    role: str
    picture_url: Optional[str] = None
    store_id: Optional[uuid.UUID] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ------------------------------------------------------------------ inventory

class ProductCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    gst_rate: Optional[float] = None
    supplier_id: Optional[uuid.UUID] = None
    lead_time_days: int = 2


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    gst_rate: Optional[float] = None
    supplier_id: Optional[uuid.UUID] = None
    lead_time_days: Optional[int] = None


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    store_id: uuid.UUID
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    gst_rate: Optional[float] = None
    supplier_id: Optional[uuid.UUID] = None
    lead_time_days: int = 2
    created_at: datetime


class ProductDetailOut(ProductOut):
    total_stock: int = 0
    batches: list["BatchOut"] = []


class Page(BaseModel):
    items: list
    total: int
    page: int
    page_size: int


class BatchCreate(BaseModel):
    product_id: uuid.UUID
    batch_number: Optional[str] = None
    quantity: int = 0
    expiry_date: date
    purchase_price: Optional[float] = None
    received_date: Optional[date] = None


class BatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    store_id: uuid.UUID
    batch_number: Optional[str] = None
    quantity: int
    expiry_date: date
    purchase_price: Optional[float] = None
    received_date: date
    days_remaining: int = 0
    severity: str = "SAFE"


class AtRiskItem(BaseModel):
    batch_id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    batch_number: Optional[str] = None
    quantity: int
    expiry_date: date
    days_remaining: int
    severity: str
    value_at_risk: Optional[float] = None
    expected_leftover: float = 0.0
    velocity: float = 0.0


class ExpiryTimelineBucket(BaseModel):
    label: str
    min_days: int
    max_days: int
    items: int
    value: float


class DeadStockItem(BaseModel):
    batch_id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    batch_number: Optional[str] = None
    quantity: int
    days_idle: int
    value_locked: Optional[float] = None


class ReorderSuggestion(BaseModel):
    product_id: uuid.UUID
    name: str
    current_qty: int
    velocity: float
    lead_time_days: int
    suggested_qty: int
    stockout_eta: Optional[float] = None  # None when no demand data (velocity == 0)


class StockHealthSegment(BaseModel):
    name: str
    value: int
    color: str


# --------------------------------------------------------------------- sales

class PosSaleItem(BaseModel):
    product_id: Optional[uuid.UUID] = None
    barcode: Optional[str] = None
    quantity: int = Field(gt=0)
    discount_type: Optional[Literal["PERCENTAGE", "FLAT"]] = None
    discount_value: Optional[float] = None


class PosSaleRequest(BaseModel):
    items: list[PosSaleItem]
    customer_id: Optional[uuid.UUID] = None
    pos_session_id: Optional[uuid.UUID] = None
    payment_method: str = "Cash"
    amount_paid: Optional[float] = None
    cart_discount_type: Optional[Literal["PERCENTAGE", "FLAT"]] = None
    cart_discount_value: Optional[float] = None


class InvoiceLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    product_name_snapshot: str
    sku_snapshot: Optional[str] = None
    barcode_snapshot: Optional[str] = None
    quantity: int
    unit: str
    mrp: float
    selling_price: float
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    discount_amount: float
    taxable_amount: float
    gst_rate: float
    gst_amount: float
    total_amount: float


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_number: str
    store_id: uuid.UUID
    cashier_id: uuid.UUID
    customer_id: Optional[uuid.UUID] = None
    subtotal: float
    total_mrp: float
    total_discount: float
    total_gst: float
    grand_total: float
    amount_paid: float
    change_amount: float
    payment_method: str
    created_at: datetime
    items: list[InvoiceLineOut] = []


class PosSaleResponse(BaseModel):
    invoice: InvoiceOut


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    batch_id: Optional[uuid.UUID] = None
    quantity_sold: int
    sale_price: float
    gst_amount: Optional[float] = None
    sale_date: datetime


class SalesTrendPoint(BaseModel):
    date: date
    revenue: float
    units: int


# ----------------------------------------------------------------- receiving

class ExtractedItem(BaseModel):
    line_text: str
    product_name: str
    matched_product_id: Optional[uuid.UUID] = None
    confidence: float = 0.0
    quantity: int = 0
    price: Optional[float] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None


class ScanInvoiceResponse(BaseModel):
    source: str
    raw_text: str
    extracted_items: list[ExtractedItem]


class ConfirmedItem(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0)
    purchase_price: Optional[float] = None
    expiry_date: date
    batch_number: Optional[str] = None


class ConfirmReceiptRequest(BaseModel):
    items: list[ConfirmedItem]


class DetectionRunSummary(BaseModel):
    risks_detected: int
    recommendations_created: int


class ConfirmReceiptResponse(BaseModel):
    created_batch_ids: list[uuid.UUID]
    detection_summary: DetectionRunSummary
    alerts_triggered: int


# ----------------------------------------------------------------- suppliers

class SupplierCreate(BaseModel):
    name: str
    contact_phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    on_time_delivery_score: Optional[float] = None
    expiry_quality_score: Optional[float] = None


class SupplierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    store_id: uuid.UUID
    name: str
    contact_phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    on_time_delivery_score: Optional[float] = None
    expiry_quality_score: Optional[float] = None


class SupplierScorecardOut(BaseModel):
    supplier_id: uuid.UUID
    name: str
    on_time_delivery_score: Optional[float] = None
    expiry_quality_score: Optional[float] = None
    avg_shelf_life_days: Optional[float] = None
    total_batches_received: int = 0
    orders_count: int = 0


# --------------------------------------------------------------- AI actions

class Recommendation(BaseModel):
    rank: int
    action_type: Literal["DISCOUNT", "TRANSFER", "RETURN", "REORDER"]
    params: dict
    expected_outcome: float
    confidence: float = Field(ge=0, le=100)
    reasoning: str


class ActionOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    batch_id: uuid.UUID
    batch_number: Optional[str] = None
    risk_type: str
    severity: str
    value_at_risk: Optional[float] = None
    recommendations: list[Recommendation]
    status: str
    created_at: datetime


class ExecuteActionRequest(BaseModel):
    selected: Recommendation


class ExecuteActionResponse(BaseModel):
    waste_prevented: float
    green_score_delta: float
    items_cleared: int
    new_status: str
    intervention: str


class MessageOut(BaseModel):
    message: str


# -------------------------------------------------------------- green score

class ScoreComponent(BaseModel):
    name: str
    weight: float
    value: float
    note: str


class GreenScoreOut(BaseModel):
    score: float
    expiry_score: float
    inventory_score: float
    dead_stock_score: float
    waste_score: float
    breakdown: list[ScoreComponent]
    period_date: date


class GreenScoreHistoryPoint(BaseModel):
    period_date: date
    score: float


# ---------------------------------------------------------------- analytics

class DashboardKpis(BaseModel):
    inventory_value: float
    inventory_value_delta_pct: float
    product_count: int
    product_count_delta_pct: float
    at_risk_count: int
    at_risk_value: float
    expired_count: int
    expired_value: float
    waste_prevented_mtd: float
    today_revenue: float = 0.0
    today_orders: int = 0
    today_units: int = 0


class AiPriorityAction(BaseModel):
    products: int
    units: int
    value: float


class AiPriorityActions(BaseModel):
    sell_first: AiPriorityAction
    discount: AiPriorityAction
    transfer: AiPriorityAction
    reorder: AiPriorityAction


class AiInsight(BaseModel):
    title: str
    detail: str
    icon: str


class MiniKpis(BaseModel):
    suppliers: int
    purchase_orders: int
    grn_pending: int
    avg_gross_margin: float


class DailyBrief(BaseModel):
    important_actions: int
    est_impact: float
    sections: list[dict] = []


class DashboardSummary(BaseModel):
    kpis: DashboardKpis
    donut: list[StockHealthSegment]
    sales_trend: list[SalesTrendPoint]
    expiry_timeline: list[ExpiryTimelineBucket]
    urgent_actions: list[ActionOut]
    ai_priority: AiPriorityActions
    ai_insights: list[AiInsight]
    mini_kpis: MiniKpis
    green_score: GreenScoreOut
    daily_brief: DailyBrief


class WastePreventedPoint(BaseModel):
    date: date
    value: float


class WastePreventedSeries(BaseModel):
    total: float
    series: list[WastePreventedPoint]


# ---------------------------------------------------------------- whatsapp

class WhatsAppText(BaseModel):
    body: str


class WhatsAppMessage(BaseModel):
    from_: Optional[str] = Field(None, alias="from")
    text: Optional[WhatsAppText] = None
    timestamp: Optional[str] = None


class WhatsAppMessaging(BaseModel):
    message: Optional[WhatsAppMessage] = None


class WhatsAppEntry(BaseModel):
    id: Optional[str] = None
    changes: list[dict] = []


class WhatsAppWebhookIn(BaseModel):
    entry: list[dict] = []


class WhatsAppStatusOut(BaseModel):
    configured: bool
    verify_token: str
    phone_id: str


# ---------------------------------------------------------------- reports

class MonthlyReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    store_id: uuid.UUID
    month_year: str
    total_sales: float
    total_transactions: int
    waste_prevented_value: float
    actual_waste_value: float
    avg_green_score: float
    top_category: Optional[str] = None
    top_selling_product: Optional[str] = None
    summary_json: dict = {}
    created_at: datetime


# ---------------------------------------------------------------- new schemas

class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    loyalty_points: int = 0


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    loyalty_points: Optional[int] = None


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    store_id: uuid.UUID
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    loyalty_points: int
    created_at: datetime


class StoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    owner_id: Optional[uuid.UUID] = None
    address: Optional[str] = None
    city: Optional[str] = None
    store_type: Optional[str] = None
    is_active: bool = True
    created_at: datetime


class PurchaseOrderItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = 1
    unit_price: Optional[float] = None
    received_quantity: int = 0


class PurchaseOrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    po_id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    unit_price: Optional[float] = None
    received_quantity: int


class PurchaseOrderCreate(BaseModel):
    supplier_id: uuid.UUID
    status: str = "DRAFT"
    total_amount: Optional[float] = None
    expected_delivery_date: Optional[date] = None
    items: list[PurchaseOrderItemCreate] = []


class PurchaseOrderUpdate(BaseModel):
    supplier_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    total_amount: Optional[float] = None
    expected_delivery_date: Optional[date] = None


class PurchaseOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    store_id: uuid.UUID
    supplier_id: uuid.UUID
    status: str
    total_amount: Optional[float] = None
    expected_delivery_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    items: list[PurchaseOrderItemOut] = []


class StockTransferItemCreate(BaseModel):
    product_id: uuid.UUID
    batch_id: Optional[uuid.UUID] = None
    quantity: int = 1


class StockTransferItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    transfer_id: uuid.UUID
    product_id: uuid.UUID
    batch_id: Optional[uuid.UUID] = None
    quantity: int


class StockTransferCreate(BaseModel):
    destination_store_id: uuid.UUID
    status: str = "PENDING"
    items: list[StockTransferItemCreate] = []


class StockTransferUpdate(BaseModel):
    destination_store_id: Optional[uuid.UUID] = None
    status: Optional[str] = None


class StockTransferOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source_store_id: uuid.UUID
    destination_store_id: uuid.UUID
    status: str
    transfer_date: datetime
    created_at: datetime
    items: list[StockTransferItemOut] = []


class ReturnItemCreate(BaseModel):
    product_id: uuid.UUID
    batch_id: Optional[uuid.UUID] = None
    quantity: int = 1
    refund_amount: float = 0.0
    condition: str = "SELLABLE"


class ReturnItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    return_id: uuid.UUID
    product_id: uuid.UUID
    batch_id: Optional[uuid.UUID] = None
    quantity: int
    refund_amount: float
    condition: str


class ReturnCreate(BaseModel):
    customer_id: Optional[uuid.UUID] = None
    sale_id: Optional[uuid.UUID] = None
    total_refund: float = 0.0
    reason: Optional[str] = None
    items: list[ReturnItemCreate] = []


class ReturnOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    store_id: uuid.UUID
    customer_id: Optional[uuid.UUID] = None
    sale_id: Optional[uuid.UUID] = None
    total_refund: float
    reason: Optional[str] = None
    return_date: datetime
    items: list[ReturnItemOut] = []

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    return_id: uuid.UUID
    product_id: uuid.UUID
    batch_id: Optional[uuid.UUID] = None
    quantity: int
    refund_amount: float
    condition: str


class AuditLogCreate(BaseModel):
    user_id: Optional[uuid.UUID] = None
    action: str
    entity_type: str
    entity_id: uuid.UUID
    details: dict = {}


class AuditLogUpdate(BaseModel):
    user_id: Optional[uuid.UUID] = None
    action: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[uuid.UUID] = None
    details: Optional[dict] = None


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    store_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    action: str
    entity_type: str
    entity_id: uuid.UUID
    details: dict
    created_at: datetime

