"""POS sale schemas — canonical receipt/line shape shared by the backend, the
frontend (`lib/backend-types.ts`), and the test suite.

Contract notes:
- A line is keyed by ``product_id`` OR ``barcode`` (exactly one). Barcodes are
  resolved to a product server-side so the golden "scan -> sell" path works.
- ``unit_price`` is optional: when omitted the server uses the product master's
  ``selling_price`` (the server is the price authority, never the client).
- All money fields are integer paise for precision.
"""
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, field_validator, model_validator


class ReceiptLine(BaseModel):
    product_id: UUID
    name: str
    unit: str = "pkt"
    batch_id: UUID
    batch_number: Optional[str] = None
    qty: int
    unit_price: int
    gst_rate: float
    gst_amount: int
    line_total: int


class Receipt(BaseModel):
    receipt_no: str
    store_id: UUID
    timestamp: datetime
    lines: list[ReceiptLine]
    subtotal: int
    gst_total: int
    discount_total: int
    grand_total: int


class PosItemRequest(BaseModel):
    product_id: Optional[UUID] = None
    barcode: Optional[str] = None
    quantity: int
    unit_price: Optional[int] = None
    discount_amount: int = 0

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("quantity must be greater than 0")
        return v

    @field_validator("discount_amount")
    @classmethod
    def discount_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("discount_amount must be >= 0")
        return v

    @model_validator(mode="after")
    def require_product_ref(self) -> "PosItemRequest":
        if not self.product_id and not (self.barcode or "").strip():
            raise ValueError("either product_id or barcode is required")
        return self


class PosSaleRequest(BaseModel):
    pos_session_id: Optional[UUID] = None
    customer_id: Optional[UUID] = None
    payment_method: str = "CASH"
    amount_paid: int = 0
    items: list[PosItemRequest]


class PosSaleResponse(BaseModel):
    receipt: Receipt