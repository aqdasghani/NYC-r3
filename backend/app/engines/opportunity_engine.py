"""Product Opportunity Engine (AI spec §23).

For every product we compute demand, margin, stock, expiry, velocity and
trend from the database, then classify it into one action:

    PROMOTE      — high demand + healthy margin → push it
    REORDER      — high/medium demand + low stock → buy more
    DISCOUNT     — low demand + high stock → clear it
    SELL FIRST   — stock expiring soon → sell before expiry
    STOP BUYING  — long coverage + weak demand → don't restock

This is a pure calculation — the LLM never picks the action. The engine runs
one batched pass over sales + batches so it stays cheap even for a large
catalog.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.database import Invoice, InvoiceItem, InventoryBatch, Product
from .data_quality import tier as dq_tier

PROMOTE = "PROMOTE"
REORDER = "REORDER"
DISCOUNT = "DISCOUNT"
SELL_FIRST = "SELL_FIRST"
STOP_BUYING = "STOP_BUYING"

ACTION_ORDER = {SELL_FIRST: 0, REORDER: 1, STOP_BUYING: 2, DISCOUNT: 3, PROMOTE: 4}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _classify(avg_daily: float, units_30: int, stock: int, coverage: float | None,
              margin: float, expiry_days: int | None, lead: int) -> tuple[str, str] | None:
    if units_30 == 0 and stock == 0:
        return None  # not stocked and never sold — nothing to act on

    if expiry_days is not None and expiry_days <= 7 and stock > 0:
        return SELL_FIRST, f"Stock expires in {expiry_days} days — clear it before expiry."

    if coverage is not None and coverage >= 60 and avg_daily <= 2:
        return STOP_BUYING, f"{coverage:.0f} days of stock coverage against ~{avg_daily}/day demand — stop restocking."

    if avg_daily >= 2 and coverage is not None and coverage <= lead:
        return REORDER, f"Stock covers only {coverage:.1f} days, below the {lead}-day lead time."

    if coverage is not None and coverage >= 30 and avg_daily <= 2:
        return DISCOUNT, f"Slow-moving (~{avg_daily}/day) with {coverage:.0f} days of cover."

    if avg_daily >= 5 and margin >= 20:
        return PROMOTE, f"High demand ({avg_daily}/day) with {margin:.0f}% margin — promote it."

    if avg_daily >= 5:
        return REORDER, f"High demand ({avg_daily}/day) — keep stock healthy."

    return None


def opportunities_for_store(db: Session, store_id: Any, days: int = 30, limit: int = 60) -> list[dict]:
    now = _utcnow()
    start = now - timedelta(days=days)
    prev_start = now - timedelta(days=days * 2)

    products = db.scalars(select(Product).where(Product.store_id == store_id)).all()
    if not products:
        return []

    items = db.scalars(
        select(InvoiceItem).join(Invoice).where(Invoice.store_id == store_id, Invoice.created_at >= start)
    ).all()
    prev_items = db.scalars(
        select(InvoiceItem).join(Invoice).where(Invoice.store_id == store_id, Invoice.created_at >= prev_start, Invoice.created_at < start)
    ).all()
    batches = db.scalars(
        select(InventoryBatch).where(InventoryBatch.store_id == store_id, InventoryBatch.quantity > 0)
    ).all()

    def _aggregate(rows: list[InvoiceItem]) -> dict:
        agg: dict = defaultdict(lambda: {"units": 0, "revenue": 0.0})
        for it in rows:
            a = agg[it.product_id]
            a["units"] += it.quantity
            a["revenue"] += float(it.unit_price or 0) * it.quantity
        return agg

    cur = _aggregate(items)
    prev = _aggregate(prev_items)

    stock_by_pid: dict = defaultdict(int)
    batches_by_pid: dict = defaultdict(list)
    for b in batches:
        stock_by_pid[b.product_id] += b.quantity
        batches_by_pid[b.product_id].append(b)

    data_points = len(items)
    dq = dq_tier(data_points, days)

    results: list[dict] = []
    for p in products:
        units_30 = cur.get(p.id, {}).get("units", 0)
        units_prev = prev.get(p.id, {}).get("units", 0)
        avg_daily = round(units_30 / days, 2)
        trend = round((units_30 - units_prev) / units_prev * 100, 1) if units_prev > 0 else (100.0 if units_30 > 0 else 0.0)
        stock = stock_by_pid.get(p.id, 0)
        lead = p.lead_time_days or 2
        coverage = round(stock / avg_daily, 1) if avg_daily > 0 else None
        pp = float(p.purchase_price or 0)
        sp = float(p.selling_price or 0)
        margin = round((sp - pp) / sp * 100, 1) if sp > 0 else 0.0
        expiries = sorted((b.expiry_date for b in batches_by_pid[p.id]))
        expiry_days = (expiries[0] - date.today()).days if expiries else None

        classified = _classify(avg_daily, units_30, stock, coverage, margin, expiry_days, lead)
        if not classified:
            continue
        action, reason = classified

        results.append({
            "product_id": str(p.id),
            "product_name": p.name,
            "category": p.category,
            "barcode": p.barcode,
            "action": action,
            "reason": reason,
            "metrics": {
                "avg_daily_sales": avg_daily,
                "trend_pct": trend,
                "current_stock": stock,
                "stock_coverage_days": coverage,
                "margin_pct": margin,
                "expiry_days": expiry_days,
            },
            "expected_impact": _expected_impact(action, avg_daily, stock, expiry_days),
            "confidence": dq,
            "data_quality": dq,
        })

    results.sort(key=lambda r: ACTION_ORDER.get(r["action"], 9))
    return results[:limit]


def _expected_impact(action: str, avg_daily: float, stock: int, expiry_days: int | None) -> str:
    if action == SELL_FIRST and expiry_days is not None:
        return f"Recover up to {stock} units before they expire in {expiry_days} days."
    if action == REORDER:
        return f"Avoid a stockout; maintain ~{max(1, round(avg_daily * 7))} units of cover."
    if action == DISCOUNT:
        return f"Convert ~{stock} units of slow stock into cash instead of dead stock."
    if action == STOP_BUYING:
        return f"Free up working capital currently locked in {stock} units of slow stock."
    return "Grow sales of a product your customers already want."
