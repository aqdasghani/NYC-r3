"""
DB read path → normalized records for the canonical engine.

The canonical sales source is ``InvoiceItem`` (it records quantity, unit price,
discount, taxable amount, GST rate/amount, line total, batch, customer, and is
written atomically with ``Sale`` by both the seed and the runtime POS engine).

All money fields pass through ``normalize.scale_paise`` with a per-row scale
detected from the unit price, so the mixed rupees/paise defect is resolved here
and nowhere else. Queries are batched (no N+1) — products and batches are
loaded once into maps.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ...models.database import (
    InventoryBatch, Invoice, InvoiceItem, Product, Return,
)
from .normalize import detect_scale, scale_paise
from .metrics import InventorySnapshot, SaleLine


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ──────────────────────────────── product / batch maps ──────────────────────

def product_ref_map(db: Session, store_id: Any) -> dict:
    """Product price/name lookup keyed by product id — shared by every
    money-normalizing reader (canonical loader AND the AI engines) so the
    scale-detection reference is identical everywhere."""
    prods = db.execute(
        select(Product).where(Product.store_id == store_id)
    ).scalars().all()
    return {
        p.id: {
            "name": p.name,
            "category": p.category or "Unknown",
            "selling_price": float(p.selling_price) if p.selling_price is not None else None,
            "purchase_price": float(p.purchase_price) if p.purchase_price is not None else None,
            "gst_rate": float(p.gst_rate or 0),
        }
        for p in prods
    }


def batch_ref_map(db: Session, store_id: Any) -> dict:
    """Batch purchase-price lookup keyed by batch id — the COGS reference."""
    batches = db.execute(
        select(InventoryBatch).where(InventoryBatch.store_id == store_id)
    ).scalars().all()
    return {
        b.id: {"purchase_price": float(b.purchase_price) if b.purchase_price is not None else None}
        for b in batches
    }


# Backwards-compatible aliases (internal only).
_product_map = product_ref_map
_batch_map = batch_ref_map


# ──────────────────────────────── sales ─────────────────────────────────────

def normalize_sale_line(item, created_at, invoice_id, customer_id, pos_session_id,
                        products: dict, batches: dict) -> SaleLine:
    """Normalize ONE (InvoiceItem, invoice-context) row into a paise-based
    SaleLine. This is the single money-normalization implementation — the
    canonical loader AND the AI engines both route through it, so a paise row
    reads the same everywhere (never 100× inflated in one surface)."""
    pid = item.product_id
    pref = products.get(pid, {})
    ref_rupees = pref.get("selling_price")
    scale = detect_scale(item.unit_price, ref_rupees)
    if scale == "unknown":
        scale = "rupees"  # seed/rupee convention is the dominant scale

    unit_paise = scale_paise(item.unit_price, scale)
    taxable_paise = scale_paise(item.taxable_amount, scale)
    gst_paise = scale_paise(item.gst_amount, scale)
    line_total_paise = scale_paise(item.line_total, scale)

    # COGS: batch purchase price if available, else product purchase price.
    batch_paise = 0
    batch_known = False
    bp = batches.get(item.batch_id, {}).get("purchase_price")
    if bp is not None:
        batch_paise, batch_known = _cogs_per_unit(bp, pref), True
    elif pref.get("purchase_price") is not None:
        batch_paise, batch_known = _cogs_per_unit(pref["purchase_price"], pref), True

    return SaleLine(
        date=created_at.date() if hasattr(created_at, "date") else created_at.date(),
        quantity=int(item.quantity or 0),
        unit_price_paise=unit_paise,
        taxable_paise=taxable_paise,
        gst_paise=gst_paise,
        line_total_paise=line_total_paise,
        gst_rate=float(item.gst_rate or 0),
        invoice_id=invoice_id,
        product_id=pid,
        product_name=pref.get("name", "Unknown"),
        category=pref.get("category", "Unknown"),
        customer_id=customer_id,
        pos_session_id=pos_session_id,
        batch_purchase_paise=batch_paise,
        batch_purchase_known=batch_known,
        ts=created_at,
    )


def load_sales(db: Session, store_id: Any,
               start: Optional[datetime] = None,
               end: Optional[datetime] = None) -> list[SaleLine]:
    """Load and normalize all invoice lines in [start, end) for a store.

    Money columns are normalized to integer paise using the per-row scale
    detected from the line's unit price vs the product's selling price.
    """
    products = product_ref_map(db, store_id)
    batches = batch_ref_map(db, store_id)

    q = (
        select(InvoiceItem, Invoice.created_at, Invoice.id, Invoice.customer_id, Invoice.pos_session_id)
        .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
        .where(Invoice.store_id == store_id)
    )
    if start is not None:
        q = q.where(Invoice.created_at >= start)
    if end is not None:
        q = q.where(Invoice.created_at < end)

    rows = db.execute(q).all()
    return [
        normalize_sale_line(item, created_at, invoice_id, customer_id, pos_session_id, products, batches)
        for item, created_at, invoice_id, customer_id, pos_session_id in rows
    ]


def _cogs_per_unit(batch_or_product_price: float, product_ref: dict) -> int:
    """Normalize a per-unit cost (rupee-scale by convention) to paise."""
    ref = product_ref.get("purchase_price") or product_ref.get("selling_price")
    scale = detect_scale(batch_or_product_price, ref)
    if scale == "unknown":
        scale = "rupees"
    return scale_paise(batch_or_product_price, scale)


# ──────────────────────────────── inventory ─────────────────────────────────

def load_inventory(db: Session, store_id: Any) -> list[InventorySnapshot]:
    """On-hand batches (quantity > 0) with at-cost values in paise."""
    products = _product_map(db, store_id)
    batches = db.execute(
        select(InventoryBatch).where(
            InventoryBatch.store_id == store_id,
            InventoryBatch.quantity > 0,
        )
    ).scalars().all()

    out: list[InventorySnapshot] = []
    for b in batches:
        pref = products.get(b.product_id, {})
        pp = float(b.purchase_price) if b.purchase_price is not None else None
        if pp is None:
            pp = pref.get("purchase_price") or 0.0
        price_paise = _cogs_per_unit(pp, pref)
        out.append(InventorySnapshot(
            product_id=b.product_id,
            product_name=pref.get("name", "Unknown"),
            category=pref.get("category", "Unknown"),
            batch_id=b.id,
            quantity=int(b.quantity or 0),
            purchase_price_paise=price_paise,
            expiry_date=b.expiry_date,
            received_date=b.received_date,
            last_sale_date=b.last_sale_date,
        ))
    return out


def load_inventory_value_paise(db: Session, store_id: Any) -> int:
    """Quick total at-cost inventory value (used for dashboard KPI)."""
    return sum(i.quantity * i.purchase_price_paise for i in load_inventory(db, store_id))


# ──────────────────────────────── returns / refunds ─────────────────────────

@dataclass  # noqa: E402
class ReturnLine:
    date: date
    product_id: Any
    product_name: str = ""
    quantity: int = 0
    reason: str = ""
    unit_price_paise: int = 0      # traceable price at return time, paise
    traceable: bool = False        # False → refund value cannot be established


def load_returns(db: Session, store_id: Any,
                 start: Optional[datetime] = None,
                 end: Optional[datetime] = None) -> list[ReturnLine]:
    """Returns with a best-effort refund value (quantity × product selling price).

    ``traceable`` is False when the product price is unknown, so refund figures
    are honest "insufficient data" rather than guesses.
    """
    products = _product_map(db, store_id)
    q = select(Return).where(Return.store_id == store_id)
    if start is not None:
        q = q.where(Return.created_at >= start)
    if end is not None:
        q = q.where(Return.created_at < end)
    rows = db.execute(q).scalars().all()

    out: list[ReturnLine] = []
    for r in rows:
        pref = products.get(r.product_id, {})
        price = pref.get("selling_price")
        traceable = price is not None and float(price) > 0
        price_paise = scale_paise(price, "rupees") if traceable else 0
        out.append(ReturnLine(
            date=r.created_at.date() if hasattr(r.created_at, "date") else r.created_at.date(),
            product_id=r.product_id,
            product_name=pref.get("name", "Unknown"),
            quantity=int(r.quantity or 0),
            reason=r.reason or "",
            unit_price_paise=price_paise,
            traceable=traceable,
        ))
    return out
