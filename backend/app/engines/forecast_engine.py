"""Lightweight demand forecasting primitives with cache-backed velocity."""
from __future__ import annotations

import math
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..cache import get_cache
from ..models.database import InventoryBatch, Product, Sale


def calculate_velocity(db: Session, store_id: Any, product_id: Any, days: int = 14) -> float:
    """
    Computes daily sales velocity over the past N days.
    """
    since = date.today() - timedelta(days=days)
    
    # Fast path if using a single query
    if hasattr(Sale, "quantity_sold"):
        total_qty = db.scalar(
            select(func.coalesce(func.sum(Sale.quantity_sold), 0)).where(
                Sale.store_id == store_id, Sale.product_id == product_id, Sale.sale_date >= since
            )
        )
        return float(total_qty or 0) / max(1, days)
        
    rows = db.scalars(select(Sale.quantity_sold).where(
        Sale.store_id == store_id, Sale.product_id == product_id, Sale.sale_date >= since
    )).all()
    total = sum(rows)
    return float(total) / max(1, days)


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
