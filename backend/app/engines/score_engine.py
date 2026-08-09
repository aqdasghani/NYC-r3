"""Green Score — transparent, non-scientific operational sustainability metric."""
from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models.database import GreenScoreHistory, InventoryBatch, Product, WasteEvent
from .waste_engine import waste_prevented_total


def _clamp(value: float) -> float:
    return max(0.0, min(100.0, round(value, 2)))


def score_expiry_prevention(db: Session, store_id, days: int = 30) -> float:
    batches = db.scalars(select(InventoryBatch).where(InventoryBatch.store_id == store_id)).all()
    if not batches:
        return 100.0
    at_risk = sum(float(b.quantity * (b.purchase_price or 0)) for b in batches if (b.expiry_date - date.today()).days <= 15 and b.quantity > 0)
    prevented = waste_prevented_total(db, store_id, days)
    return _clamp(100 - (at_risk / max(1, at_risk + prevented) * 100) + (prevented / max(1, at_risk + prevented) * 100))


def score_inventory_efficiency(db: Session, store_id) -> float:
    batches = db.scalars(select(InventoryBatch).where(InventoryBatch.store_id == store_id, InventoryBatch.quantity > 0)).all()
    if not batches:
        return 100.0
    stale = sum(float(b.quantity * (b.purchase_price or 0)) for b in batches if (date.today() - (b.last_sale_date or b.received_date)).days > 60)
    total = sum(float(b.quantity * (b.purchase_price or 0)) for b in batches)
    return _clamp(100 - stale / max(1, total) * 100)


def score_dead_stock(db: Session, store_id, days: int = 30) -> float:
    batches = db.scalars(select(InventoryBatch).where(InventoryBatch.store_id == store_id, InventoryBatch.quantity > 0)).all()
    total = sum(float(b.quantity * (b.purchase_price or 0)) for b in batches)
    dead = sum(float(b.quantity * (b.purchase_price or 0)) for b in batches if (date.today() - (b.last_sale_date or b.received_date)).days > 60)
    return _clamp(100 - dead / max(1, total) * 100)


def score_waste_reduction(db: Session, store_id, days: int = 30) -> float:
    since = date.today() - timedelta(days=days)
    total_prevented = waste_prevented_total(db, store_id, days)
    events = db.scalars(select(WasteEvent).where(WasteEvent.store_id == store_id, WasteEvent.created_at >= since)).all()
    actual = sum(float(e.actual_waste or 0) for e in events)
    return _clamp(total_prevented / max(1, total_prevented + actual) * 100)


def calculate_green_score(db: Session, store_id, period_days: int = 30) -> dict:
    expiry = score_expiry_prevention(db, store_id, period_days)
    efficiency = score_inventory_efficiency(db, store_id)
    dead = score_dead_stock(db, store_id, period_days)
    waste = score_waste_reduction(db, store_id, period_days)
    score = _clamp(expiry * .30 + efficiency * .30 + dead * .20 + waste * .20)
    return {"score": score, "expiry_score": expiry, "inventory_score": efficiency, "dead_stock_score": dead, "waste_score": waste, "period_date": date.today()}


def persist_history(db: Session, store_id) -> dict:
    values = calculate_green_score(db, store_id)
    row = db.scalar(select(GreenScoreHistory).where(GreenScoreHistory.store_id == store_id, GreenScoreHistory.period_date == date.today()))
    if row is None:
        row = GreenScoreHistory(store_id=store_id, **values)
        db.add(row)
    else:
        for key, value in values.items():
            setattr(row, key, value)
    db.commit()
    return values
