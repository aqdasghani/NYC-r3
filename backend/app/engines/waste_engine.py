"""Waste-prevention measurement and history."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models.database import WasteEvent


def record_waste_event(db: Session, store_id, product_id, potential_value: float,
                       intervention_type: str, value_prevented: float, actual_waste: float = 0) -> WasteEvent:
    event = WasteEvent(store_id=store_id, product_id=product_id, potential_value=potential_value,
                       intervention_type=intervention_type, value_prevented=value_prevented,
                       actual_waste=actual_waste)
    db.add(event)
    db.flush()
    return event


def waste_prevented_total(db: Session, store_id, days: int = 30) -> float:
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
    total = db.scalar(select(func.coalesce(func.sum(WasteEvent.value_prevented), 0)).where(
        WasteEvent.store_id == store_id, WasteEvent.created_at >= since
    ))
    return round(float(total or 0), 2)


def waste_prevented_series(db: Session, store_id, days: int = 30) -> list[dict]:
    since = date.today() - timedelta(days=days - 1)
    events = db.scalars(select(WasteEvent).where(
        WasteEvent.store_id == store_id,
        WasteEvent.created_at >= datetime.combine(since, datetime.min.time()),
    )).all()
    totals = {since + timedelta(days=i): 0.0 for i in range(days)}
    for event in events:
        day = event.created_at.date()
        if day in totals:
            totals[day] += float(event.value_prevented or 0)
    return [{"date": day, "value": round(value, 2)} for day, value in totals.items()]
