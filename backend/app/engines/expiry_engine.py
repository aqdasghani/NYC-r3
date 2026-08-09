"""Expiry classification, risk queries, and timeline aggregation."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.database import InventoryBatch, Product
from ..models.schemas import ExpiryTimelineBucket


BUCKETS = (
    ("0-3", 0, 3),
    ("4-7", 4, 7),
    ("8-15", 8, 15),
    ("16-30", 16, 30),
    ("30+", 31, 10_000),
)


def tier_for(days_remaining: int) -> str:
    if days_remaining <= 3:
        return "CRITICAL"
    if days_remaining <= 15:
        return "WARNING"
    if days_remaining <= 30:
        return "UPCOMING"
    return "SAFE"


def days_remaining(batch: InventoryBatch, today: date | None = None) -> int:
    return (batch.expiry_date - (today or date.today())).days


def expected_leftover(batch: InventoryBatch, velocity: float) -> float:
    return max(0.0, float(batch.quantity) - velocity * max(0, days_remaining(batch)))


def classify_batch(batch: InventoryBatch, velocity: float = 0.0, today: date | None = None) -> dict:
    remaining = days_remaining(batch, today)
    return {
        "days_remaining": remaining,
        "severity": tier_for(remaining),
        "expected_leftover": expected_leftover(batch, velocity),
    }


def get_at_risk_batches(db: Session, store_id, max_days: int = 15) -> list[InventoryBatch]:
    today = date.today()
    batches = db.scalars(
        select(InventoryBatch)
        .where(InventoryBatch.store_id == store_id, InventoryBatch.quantity > 0)
        .order_by(InventoryBatch.expiry_date)
    ).all()
    return [b for b in batches if 0 <= (b.expiry_date - today).days <= max_days]


def expiry_timeline(db: Session, store_id) -> list[ExpiryTimelineBucket]:
    today = date.today()
    rows = db.scalars(
        select(InventoryBatch)
        .where(InventoryBatch.store_id == store_id, InventoryBatch.quantity > 0)
    ).all()
    result = []
    for label, minimum, maximum in BUCKETS:
        items = 0
        value = Decimal("0")
        for batch in rows:
            remaining = (batch.expiry_date - today).days
            if minimum <= remaining <= maximum:
                items += 1
                value += Decimal(str(batch.quantity)) * Decimal(str(batch.purchase_price or 0))
        result.append(ExpiryTimelineBucket(label=label, min_days=minimum, max_days=maximum, items=items, value=float(value)))
    return result


def stock_health(db: Session, store_id) -> list[dict]:
    """Aggregate the six dashboard health segments from batch state."""
    today = date.today()
    products = db.scalars(select(Product).where(Product.store_id == store_id)).all()
    batches = db.scalars(select(InventoryBatch).where(InventoryBatch.store_id == store_id)).all()
    by_product: dict = {}
    for batch in batches:
        by_product.setdefault(batch.product_id, []).append(batch)
    counts = {name: 0 for name in ("Good Stock", "Near Expiry", "Expired", "Low Stock", "Overstock", "Dead Stock")}
    for product in products:
        product_batches = by_product.get(product.id, [])
        total = sum(max(0, b.quantity) for b in product_batches)
        active = [b for b in product_batches if b.quantity > 0]
        if not active or total == 0:
            counts["Dead Stock"] += 1
            continue
        minimum = min((b.expiry_date - today).days for b in active)
        velocity = 0.0  # stock health intentionally remains DB-only and deterministic
        if minimum < 0:
            counts["Expired"] += 1
        elif minimum <= 15:
            counts["Near Expiry"] += 1
        elif total <= 5:
            counts["Low Stock"] += 1
        elif velocity == 0 and all((today - (b.last_sale_date or b.received_date)).days > 60 for b in active):
            counts["Dead Stock"] += 1
        elif total > 500:
            counts["Overstock"] += 1
        else:
            counts["Good Stock"] += 1
    colors = {
        "Good Stock": "#10B981", "Near Expiry": "#F59E0B", "Expired": "#EF4444",
        "Low Stock": "#3B82F6", "Overstock": "#111827", "Dead Stock": "#6B7280",
    }
    return [{"name": name, "value": value, "color": colors[name]} for name, value in counts.items()]
