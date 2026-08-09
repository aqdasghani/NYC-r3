"""Lightweight demand forecasting primitives with cache-backed velocity."""
from __future__ import annotations

import math
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..cache import get_cache
from ..models.database import InventoryBatch, Product, Sale


def calculate_velocity(db: Session, store_id, product_id, days: int = 14) -> float:
    key = f"product:{product_id}:velocity"
    cached = get_cache().get(key)
    if cached is not None:
        return float(cached)
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
    total = db.scalar(
        select(Sale.quantity_sold).where(
            Sale.store_id == store_id, Sale.product_id == product_id, Sale.sale_date >= since
        )
    )
    # scalar() returns first row; sum in Python for compatibility with SQLite decimals.
    rows = db.scalars(select(Sale.quantity_sold).where(
        Sale.store_id == store_id, Sale.product_id == product_id, Sale.sale_date >= since
    )).all()
    velocity = float(sum(rows) / days) if rows else 0.0
    get_cache().set(key, velocity, ttl=1800)
    return velocity


def days_of_supply(quantity: int | float, velocity: float) -> float:
    return float(quantity) / velocity if velocity > 0 else float("inf")


def stockout_eta(quantity: int | float, velocity: float) -> float:
    return days_of_supply(quantity, velocity)


def reorder_quantity(current_qty: int, velocity: float, lead_time_days: int, safety_stock_days: int = 1) -> int:
    return max(0, math.ceil(velocity * (lead_time_days + safety_stock_days)) - current_qty)


def demand_spike(last_week_units: int, prior_units: int, threshold: float = 1.5) -> bool:
    if prior_units <= 0:
        return last_week_units > 0
    return (last_week_units / 7) >= threshold * (prior_units / 28)
