"""Behavioral Retail Intelligence — observable purchasing behavior only.

This is the "psychology" layer, but deliberately NOT clinical: it studies
what people actually do at the checkout (co-purchases, time-of-day baskets,
basket size) using the store's own data. It never infers sensitive personal
attributes, never "diagnoses" customers, and every claim is an *observed
pattern* — wording stays observational ("co-purchased", "attached to larger
baskets"), never causal or psychological.

A basket == one Invoice (one checkout). Where POS sessions exist they group
several invoices; we fall back to invoice-level baskets when they don't.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.database import Invoice, InvoiceItem, Product
from . import math_engine
from .data_quality import tier as dq_tier

_SEGMENTS = [
    ("MORNING", 6, 11),
    ("AFTERNOON", 12, 16),
    ("EVENING", 17, 21),
    ("NIGHT", 22, 5),
]

_MISSIONS = [
    (1, 1, "QUICK TOP-UP"),
    (2, 3, "DAILY ESSENTIALS"),
    (4, 8, "WEEKLY SHOP"),
    (9, 10**9, "HOUSEHOLD RESTOCK"),
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _baskets(db: Session, store_id: Any, days: int) -> dict:
    """Group invoice items into baskets keyed by (session or invoice) id."""
    start = _utcnow() - timedelta(days=days)
    items = db.scalars(
        select(InvoiceItem).join(Invoice).where(Invoice.store_id == store_id, Invoice.created_at >= start)
    ).all()
    baskets: dict = defaultdict(list)
    for it in items:
        key = it.invoice.pos_session_id or it.invoice_id
        baskets[key].append(it)
    return baskets


def _product_names(db: Session, ids: set) -> dict:
    if not ids:
        return {}
    rows = db.execute(select(Product.id, Product.name).where(Product.id.in_(list(ids)))).all()
    return {pid: name for pid, name in rows}


# ─────────────────────────────── associations & cross-sell ───────────────────

def associations(db: Session, store_id: Any, days: int = 60) -> dict:
    """Basket association rules + cross-sell opportunities.

    The math engine computes support / confidence / lift; this layer only adds
    plain-English interpretation and turns the strongest rules into
    cross-sell suggestions.
    """
    rules = math_engine.basket_analysis(db, store_id, days=days)

    # Total basket count for the quality tier.
    baskets = _baskets(db, store_id, days)
    n_baskets = len(baskets)
    data_points = sum(len(v) for v in baskets.values())

    cross_sell = []
    for r in rules[:6]:
        conf = round(r.get("confidence_a_to_b", 0) * 100)
        cross_sell.append({
            "trigger_product": r["product_a_name"],
            "suggested_product": r["product_b_name"],
            "lift": r["lift"],
            "confidence_pct": conf,
            "co_purchases": r["co_purchases"],
            "interpretation": (
                f"Customers who buy {r['product_a_name']} also buy {r['product_b_name']} {conf}% of the "
                f"time ({r['co_purchases']} co-purchases). Suggest {r['product_b_name']} at checkout "
                f"when {r['product_a_name']} is scanned."
            ),
        })

    return {
        "association_rules": rules,
        "cross_sell_opportunities": cross_sell,
        "n_baskets": n_baskets,
        "data_quality": dq_tier(data_points, days),
        "note": "Observed co-purchase patterns only — not a psychological claim.",
    }


# ─────────────────────────────── time-of-day behavior ────────────────────────

def time_behavior(db: Session, store_id: Any, days: int = 30) -> list[dict]:
    """Which products dominate which part of the day (learned from this store)."""
    items = db.scalars(
        select(InvoiceItem).join(Invoice).where(Invoice.store_id == store_id, Invoice.created_at >= _utcnow() - timedelta(days=days))
    ).all()

    segments = []
    for name, lo, hi in _SEGMENTS:
        seg_items = [
            it for it in items
            if (it.invoice.created_at.hour >= lo if lo <= hi else it.invoice.created_at.hour >= lo or it.invoice.created_at.hour <= hi)
        ]
        revenue = round(sum(float(it.unit_price or 0) * it.quantity for it in seg_items), 2)
        units = sum(it.quantity for it in seg_items)
        if units == 0:
            continue
        by_product: Counter = Counter()
        for it in seg_items:
            by_product[it.product_id] += it.quantity
        top = by_product.most_common(3)
        names = _product_names(db, {pid for pid, _ in top})
        segments.append({
            "segment": name,
            "hours": f"{lo:02d}:00-{hi:02d}:00",
            "revenue": revenue,
            "units": units,
            "share_of_day_units": round(units / max(1, sum(it.quantity for it in items)) * 100, 1),
            "top_products": [{"product_name": names[pid], "units": qty} for pid, qty in top],
        })

    segments.sort(key=lambda s: s["units"], reverse=True)
    return segments


# ─────────────────────────────── discount response ───────────────────────────

def discount_response(db: Session, store_id: Any, days: int = 30) -> dict:
    """Observational comparison of discounted vs full-price sales.

    We never claim discounts *caused* a change — only that discounted lines
    sold at a different rate, which is a signal to test further.
    """
    items = db.scalars(
        select(InvoiceItem).join(Invoice).where(Invoice.store_id == store_id, Invoice.created_at >= _utcnow() - timedelta(days=days))
    ).all()

    discounted = [it for it in items if float(it.discount_amount or 0) > 0]
    regular = [it for it in items if float(it.discount_amount or 0) == 0]

    def _stats(rows):
        return {
            "lines": len(rows),
            "units": sum(it.quantity for it in rows),
            "revenue": round(sum(float(it.unit_price or 0) * it.quantity for it in rows), 2),
        }

    stats = {
        "discounted": _stats(discounted),
        "regular": _stats(regular),
        "total_discount_given": round(sum(float(it.discount_amount or 0) for it in discounted), 2),
    }

    discounted_units = stats["discounted"]["units"]
    if discounted_units == 0:
        stats["data_quality"] = "LOW"
        stats["note"] = "No discounted sales in this window — no discount-response signal yet."
        return stats

    reg_units = stats["regular"]["units"]
    delta = round((discounted_units - reg_units) / reg_units * 100, 1) if reg_units > 0 else None
    stats["discounted_vs_regular_delta_pct"] = delta
    stats["data_quality"] = dq_tier(len(items), days)
    stats["note"] = (
        "Observational comparison: discounted lines moved differently than full-price lines. "
        "Not proof that the discount caused the difference — use as a test signal."
    )
    return stats


# ─────────────────────────────── impulse-like patterns ───────────────────────

def impulse_patterns(db: Session, store_id: Any, days: int = 30) -> list[dict]:
    """Products that frequently ride along in larger baskets.

    A product is "impulse-like" if it usually appears in multi-item baskets
    (high attachment) — a placement/cross-sell signal, not a personality claim.
    """
    baskets = _baskets(db, store_id, days)

    total_baskets = len(baskets)
    if total_baskets < 10:
        return []

    basket_sizes: dict = {}
    for key, items in baskets.items():
        distinct = {it.product_id for it in items}
        basket_sizes[key] = distinct

    multi = {k: v for k, v in basket_sizes.items() if len(v) >= 2}

    appears_in_any: Counter = Counter()
    appears_in_multi: Counter = Counter()
    for key, distinct in basket_sizes.items():
        for pid in distinct:
            appears_in_any[pid] += 1
        if key in multi:
            for pid in distinct:
                appears_in_multi[pid] += 1

    names = _product_names(db, set(appears_in_any.keys()))
    rows = []
    for pid, total in appears_in_any.items():
        if total < 5:
            continue
        attach = appears_in_multi[pid] / total
        if attach >= 0.7:
            rows.append({
                "product_name": names[pid],
                "attachment_rate": round(attach, 2),
                "appears_in_baskets": total,
                "in_multi_item_baskets": appears_in_multi[pid],
                "observation": (
                    f"{names[pid]} appears in {round(attach * 100)}% of baskets alongside other items — "
                    f"an impulse-like purchasing pattern (consider checkout placement or bundling)."
                ),
            })

    rows.sort(key=lambda r: r["attachment_rate"], reverse=True)
    return rows[:8]


# ─────────────────────────────── shopping missions ───────────────────────────

def shopping_missions(db: Session, store_id: Any, days: int = 30) -> list[dict]:
    """Cluster checkouts into transaction-pattern groups by size & value.

    These are behavioral clusters of *basket size*, not psychological
    diagnoses: QUICK TOP-UP (1 item), DAILY ESSENTIALS (2–3), WEEKLY SHOP
    (4–8), HOUSEHOLD RESTOCK (9+).
    """
    baskets = _baskets(db, store_id, days)
    if not baskets:
        return []

    clusters: dict[str, dict] = {}
    for lo, hi, label in _MISSIONS:
        clusters[label] = {"count": 0, "value_total": 0.0, "items_total": 0, "product_units": Counter()}

    for key, items in baskets.items():
        distinct = {it.product_id for it in items}
        value = sum(float(it.line_total or it.unit_price * it.quantity or 0) for it in items)
        for lo, hi, label in _MISSIONS:
            if lo <= len(distinct) <= hi:
                c = clusters[label]
                c["count"] += 1
                c["value_total"] += value
                c["items_total"] += len(items)
                for it in items:
                    c["product_units"][it.product_id] += it.quantity
                break

    n = sum(c["count"] for c in clusters.values()) or 1
    names = _product_names(db, {pid for c in clusters.values() for pid in c["product_units"]})
    results = []
    for label, c in clusters.items():
        if c["count"] == 0:
            continue
        top = c["product_units"].most_common(1)
        results.append({
            "mission": label,
            "share_pct": round(c["count"] / n * 100, 1),
            "basket_count": c["count"],
            "avg_basket_value": round(c["value_total"] / c["count"], 2),
            "avg_items": round(c["items_total"] / c["count"], 1),
            "top_product": names[top[0][0]] if top else None,
        })

    results.sort(key=lambda r: r["share_pct"], reverse=True)
    return results


# ─────────────────────────────── full bundle ─────────────────────────────────

def full_behavior(db: Session, store_id: Any, days: int = 30) -> dict:
    """Everything the Behavioral Retail AI knows about this store in one call."""
    assoc = associations(db, store_id, days=60)
    return {
        "associations": assoc,
        "time_behavior": time_behavior(db, store_id, days),
        "discount_response": discount_response(db, store_id, days),
        "impulse_patterns": impulse_patterns(db, store_id, days),
        "shopping_missions": shopping_missions(db, store_id, days),
        "weekday_pattern": math_engine.weekday_pattern(db, store_id, days=60),
        "note": "All patterns are observed from this store's transaction history.",
    }
