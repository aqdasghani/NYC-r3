"""AI Insight Engine (AI spec §3).

Combines the math engine, analytics and behavioral intelligence into
structured, grounded insights. Every insight carries:

    title, category, severity, priority (DO NOW/DO TODAY/WATCH/OPPORTUNITY),
    evidence (the actual numbers), recommendation, expected_impact,
    explanation, confidence and data_quality.

All numbers come from the database via the math engine — the LLM only
explains, it never supplies a metric. For a brand-new store the engine
returns an honest "insufficient data" insight instead of pretending.
"""
from __future__ import annotations

import logging
import uuid
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.database import Invoice, InvoiceItem, InventoryBatch, Product
from . import behavior_engine, math_engine
from .analytics import calculate_revenue as _canon_revenue
from .analytics import metrics as _canon_metrics
from .analytics import to_rupees as _to_rupees
from .analytics.loader import batch_ref_map, normalize_sale_line, product_ref_map
from .data_quality import tier as dq_tier
from .priority_engine import BADGE_LABELS, from_value_and_days, tier as priority_tier

logger = logging.getLogger(__name__)

SEVERITY_BY_PRIORITY = {
    "DO_NOW": "CRITICAL",
    "DO_TODAY": "WARNING",
    "WATCH": "WARNING",
    "OPPORTUNITY": "INFO",
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _insight(*, title: str, category: str, priority: str, dq: str, evidence: dict,
             recommendation: str, expected_impact: str, explanation: str) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "title": title,
        "category": category,
        "severity": SEVERITY_BY_PRIORITY.get(priority, "INFO"),
        "priority": priority,
        "badge": BADGE_LABELS.get(priority, priority),
        "evidence": evidence,
        "recommendation": recommendation,
        "expected_impact": expected_impact,
        "explanation": explanation,
        "confidence": dq,
        "data_quality": dq,
        "created_at": _utcnow().isoformat(),
    }


# ─────────────────────────── batched product metrics ─────────────────────────

def _product_metrics(db: Session, store_id: Any, days: int = 30) -> list[dict]:
    """One batched pass over products/sales/batches — avoids N+1 queries."""
    now = _utcnow()
    start = now - timedelta(days=days)
    prev_start = now - timedelta(days=days * 2)

    products = db.scalars(select(Product).where(Product.store_id == store_id)).all()
    products_map = product_ref_map(db, store_id)
    batches_map = batch_ref_map(db, store_id)

    def _lines(query):
        rows = db.execute(query).all()
        return [normalize_sale_line(it, ts, iid, cid, psid, products_map, batches_map)
                for it, ts, iid, cid, psid in rows]

    items = _lines(
        select(InvoiceItem, Invoice.created_at, Invoice.id, Invoice.customer_id, Invoice.pos_session_id)
        .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
        .where(Invoice.store_id == store_id, Invoice.created_at >= start)
    )
    prev_items = _lines(
        select(InvoiceItem, Invoice.created_at, Invoice.id, Invoice.customer_id, Invoice.pos_session_id)
        .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
        .where(Invoice.store_id == store_id, Invoice.created_at >= prev_start, Invoice.created_at < start)
    )
    batches = db.scalars(select(InventoryBatch).where(InventoryBatch.store_id == store_id, InventoryBatch.quantity > 0)).all()

    def _agg(lines):
        a: dict = defaultdict(lambda: {"units": 0, "revenue_paise": 0})
        for l in lines:
            e = a[l.product_id]
            e["units"] += l.quantity
            e["revenue_paise"] += _canon_metrics.line_net_paise(l)
        return a

    cur = _agg(items)
    prev = _agg(prev_items)

    stock: dict = defaultdict(int)
    expiring_value: dict = defaultdict(float)
    batches_by: dict = defaultdict(list)
    for b in batches:
        stock[b.product_id] += b.quantity
        batches_by[b.product_id].append(b)
        d = (b.expiry_date - date.today()).days
        if 0 <= d <= 15:
            expiring_value[b.product_id] += float(b.quantity * (b.purchase_price or 0))

    data_points = len(items)
    dq = dq_tier(data_points, days)

    out = []
    for p in products:
        units_30 = cur.get(p.id, {}).get("units", 0)
        units_prev = prev.get(p.id, {}).get("units", 0)
        avg_daily = round(units_30 / days, 2)
        trend = round((units_30 - units_prev) / units_prev * 100, 1) if units_prev > 0 else (100.0 if units_30 > 0 else 0.0)
        s = stock.get(p.id, 0)
        lead = p.lead_time_days or 2
        coverage = round(s / avg_daily, 1) if avg_daily > 0 else None
        pp = float(p.purchase_price or 0)
        sp = float(p.selling_price or 0)
        margin = round((sp - pp) / sp * 100, 1) if sp > 0 else 0.0
        expiries = sorted((b.expiry_date for b in batches_by[p.id]))
        expiry_days = (expiries[0] - date.today()).days if expiries else None

        classification = math_engine._classify_product(
            avg_daily=avg_daily,
            trend_pct=trend,
            stock_coverage_days=coverage,
            margin_pct=margin,
            expiry_days=expiry_days,
            data_points=units_30,  # units sold in window as an activity proxy
        )

        out.append({
            "product": p,
            "units_30": units_30,
            "units_prev": units_prev,
            "revenue_30": round(float(_to_rupees(cur.get(p.id, {}).get("revenue_paise", 0))), 2),
            "avg_daily": avg_daily,
            "trend": trend,
            "stock": s,
            "coverage": coverage,
            "margin": margin,
            "expiry_days": expiry_days,
            "expiring_value": round(expiring_value.get(p.id, 0.0), 2),
            "lead": lead,
            "classification": classification,
        })
    return out, dq, data_points


# ─────────────────────────────── insight builders ────────────────────────────

def _expiry_insights(metrics: list[dict], dq: str) -> list[dict]:
    insights = []

    overdue = [m for m in metrics if m["expiry_days"] is not None and m["expiry_days"] < 0 and m["stock"] > 0]
    overdue.sort(key=lambda m: m["expiry_days"])
    for m in overdue[:4]:
        value = round(m["stock"] * (m["product"].purchase_price or 0), 2)
        insights.append(_insight(
            title=f"{m['product'].name} already expired {abs(m['expiry_days'])} days ago",
            category="WASTE",
            priority="WATCH" if value < 500 else "DO_TODAY",
            dq=dq,
            evidence={
                "product": m["product"].name,
                "days_overdue": abs(m["expiry_days"]),
                "current_stock": m["stock"],
                "value_lost": value,
            },
            recommendation=f"Record {m['stock']} units of {m['product'].name} as spoilage and remove them from sellable stock.",
            expected_impact=f"Account for the ₹{value} loss and stop offering expired stock.",
            explanation=f"Stock of {m['stock']} units passed its expiry {abs(m['expiry_days'])} days ago and cannot be sold.",
        ))

    expiring = [m for m in metrics if m["expiry_days"] is not None and 0 <= m["expiry_days"] <= 15 and m["stock"] > 0]
    expiring.sort(key=lambda m: m["expiry_days"])
    for m in expiring[:6]:
        priority = priority_tier("HIGH", "HIGH", 95) if m["expiry_days"] <= 3 else from_value_and_days(m["expiring_value"], m["expiry_days"], 80, 7)
        insights.append(_insight(
            title=f"{m['product'].name} expires in {m['expiry_days']} days",
            category="EXPIRY",
            priority=priority,
            dq=dq,
            evidence={
                "product": m["product"].name,
                "expiry_days": m["expiry_days"],
                "current_stock": m["stock"],
                "avg_daily_sales": m["avg_daily"],
                "value_at_risk": m["expiring_value"],
            },
            recommendation=f"Sell first or discount {m['product'].name} — it expires in {m['expiry_days']} days.",
            expected_impact=f"Recover up to ₹{m['expiring_value']} before it is written off.",
            explanation=f"Stock coverage ({m['coverage']} days) is shorter than the time left before expiry ({m['expiry_days']} days); unsold units are at risk.",
        ))
    return insights


def _stockout_insights(metrics: list[dict], dq: str) -> list[dict]:
    insights = []
    risky = [m for m in metrics if m["avg_daily"] > 0 and m["coverage"] is not None and m["coverage"] <= m["lead"]]
    risky.sort(key=lambda m: m["coverage"] or 999)
    for m in risky[:5]:
        priority = from_value_and_days(0.0, m["coverage"], 85, 2.0)
        insights.append(_insight(
            title=f"{m['product'].name} may run out in {m['coverage']} days",
            category="INVENTORY",
            priority=priority,
            dq=dq,
            evidence={
                "product": m["product"].name,
                "current_stock": m["stock"],
                "avg_daily_sales": m["avg_daily"],
                "stock_coverage_days": m["coverage"],
                "lead_time_days": m["lead"],
            },
            recommendation=f"Order more {m['product'].name} — coverage ({m['coverage']} days) is below the {m['lead']}-day lead time.",
            expected_impact="Avoid a stockout on a product customers buy daily.",
            explanation="Average daily demand of {avg} units against {stock} units in stock gives only {cov} days of cover.".format(
                avg=m["avg_daily"], stock=m["stock"], cov=m["coverage"]),
        ))
    return insights


def _dead_stock_insights(metrics: list[dict], dq: str) -> list[dict]:
    insights = []
    dead = [m for m in metrics if m["stock"] > 0 and (m["units_30"] == 0 or (m["coverage"] is not None and m["coverage"] >= 60))]
    dead.sort(key=lambda m: m["stock"], reverse=True)
    for m in dead[:4]:
        value = round(m["stock"] * (m["product"].purchase_price or 0), 2)
        insights.append(_insight(
            title=f"{m['product'].name} is dead stock",
            category="INVENTORY",
            priority="WATCH" if value < 500 else "DO_TODAY",
            dq=dq,
            evidence={
                "product": m["product"].name,
                "current_stock": m["stock"],
                "units_sold_30d": m["units_30"],
                "stock_value": value,
            },
            recommendation=f"Discount or bundle {m['product'].name} to move {m['stock']} units; stop reordering it.",
            expected_impact=f"Free up ₹{value} of capital tied up in unsold stock.",
            explanation=f"No meaningful sales in 30 days ({m['units_30']} units) against {m['stock']} units in stock — the stock is not moving.",
        ))
    return insights


def _demand_insights(metrics: list[dict], dq: str) -> list[dict]:
    insights = []
    movers = [m for m in metrics if abs(m["trend"]) >= 50 and m["units_30"] >= 3]
    movers.sort(key=lambda m: abs(m["trend"]), reverse=True)
    for m in movers[:5]:
        rising = m["trend"] > 0
        priority = "WATCH" if rising else "DO_TODAY"
        insights.append(_insight(
            title=f"{m['product'].name} demand {'rising' if rising else 'falling'} {abs(m['trend']) / 1:.0f}%",
            category="DEMAND",
            priority=priority,
            dq=dq,
            evidence={
                "product": m["product"].name,
                "units_30d": m["units_30"],
                "trend_pct": m["trend"],
                "current_stock": m["stock"],
                "stock_coverage_days": m["coverage"],
            },
            recommendation=(
                f"Prepare more stock of {m['product'].name}." if rising
                else f"Review {m['product'].name} — sales dropped {abs(m['trend']):.0f}% and {m['stock']} units are in stock."
            ),
            expected_impact="Capitalize on growing demand" if rising else "Prevent accumulating dead stock.",
            explanation=f"Last 30 days sold {m['units_30']} units versus {m['units_prev']} in the previous 30 — a {m['trend']:+.0f}% change.",
        ))
    return insights


def _store_trend_insight(db: Session, store_id: Any, dq: str) -> list[dict]:
    """Store-level revenue direction (7d vs prior 7d) from real invoices."""
    now = _utcnow()
    w1 = now - timedelta(days=7)
    w2 = now - timedelta(days=14)
    cur = _canon_revenue(db, store_id, start=w1, end=now)
    prev = _canon_revenue(db, store_id, start=w2, end=w1)
    rev_curr = float(cur["net_revenue"])
    rev_prev = float(prev["net_revenue"])
    if rev_prev <= 0:
        return []
    pct = round((rev_curr - rev_prev) / rev_prev * 100, 1)
    if abs(pct) < 10:
        return []
    direction = "up" if pct > 0 else "down"
    return [_insight(
        title=f"Store revenue {direction} {abs(pct):.1f}% vs prior week",
        category="SALES",
        priority="WATCH",
        dq=dq,
        evidence={"revenue_last_7d": round(rev_curr, 2), "revenue_prior_7d": round(rev_prev, 2), "change_pct": pct},
        recommendation="Keep current stocking and staffing" if pct > 0 else "Check whether a product, day or hour drove the drop.",
        expected_impact="Understand the weekly sales direction to plan procurement.",
        explanation=f"₹{rev_curr:,.0f} in the last 7 days versus ₹{rev_prev:,.0f} in the prior 7 — a {pct:+.1f}% change.",
    )]


def _best_hour_insight(db: Session, store_id: Any, dq: str) -> list[dict]:
    hours = math_engine.hourly_pattern(db, store_id, days=30)
    if not hours:
        return []
    peak = max(hours, key=lambda h: h["units"])
    if peak["units"] == 0:
        return []
    return [_insight(
        title=f"Peak sales hour: {peak['label']}",
        category="SALES",
        priority="OPPORTUNITY",
        dq=dq,
        evidence={"peak_hour": peak["label"], "units": peak["units"], "revenue": peak["revenue"], "hour": peak["hour"]},
        recommendation=f"Schedule stock-outs and staffing around {peak['label']}.",
        expected_impact="Reduce stockouts during your strongest selling hour.",
        explanation=f"The hour {peak['label']} sold {peak['units']} units worth ₹{peak['revenue']:,.0f} — the highest of the day.",
    )]


def _basket_insight(db: Session, store_id: Any, dq: str) -> list[dict]:
    assoc = behavior_engine.associations(db, store_id, days=60)
    rules = assoc.get("association_rules", [])
    if not rules:
        return []
    r = rules[0]
    conf = round(r.get("confidence_a_to_b", 0) * 100)
    return [_insight(
        title=f"{r['product_a_name']} often comes with {r['product_b_name']}",
        category="BEHAVIOR",
        priority="OPPORTUNITY",
        dq=dq,
        evidence={
            "product_a": r["product_a_name"],
            "product_b": r["product_b_name"],
            "co_purchases": r["co_purchases"],
            "confidence_pct": conf,
            "lift": r["lift"],
        },
        recommendation=f"Suggest {r['product_b_name']} when {r['product_a_name']} is scanned, and place them nearby.",
        expected_impact="Grow basket size with an observed co-purchase pattern.",
        explanation=f"Across {r.get('n_baskets_analyzed', 0)} baskets, buyers of {r['product_a_name']} also took {r['product_b_name']} {conf}% of the time.",
    )]


def _data_quality_insight(data_points: int, days: int, dq: str) -> list[dict]:
    if dq == "LOW":
        return [_insight(
            title="Early signal — not enough history yet",
            category="DATA",
            priority="WATCH",
            dq=dq,
            evidence={"data_points": data_points, "history_days": days},
            recommendation="Keep selling. Insights become reliable after ~2 weeks of transactions.",
            expected_impact="Accurate forecasts and recommendations as history accumulates.",
            explanation=f"Only {data_points} sale line items across ~{days} days — below the threshold for reliable seasonality analysis.",
        )]
    return []


# ─────────────────────────────── public entry points ─────────────────────────

def generate_all_insights(db: Session, store_id: Any, limit: int = 40) -> list[dict]:
    metrics, dq, data_points = _product_metrics(db, store_id)
    builders = [
        _expiry_insights(metrics, dq),
        _stockout_insights(metrics, dq),
        _dead_stock_insights(metrics, dq),
        _demand_insights(metrics, dq),
        _store_trend_insight(db, store_id, dq),
        _best_hour_insight(db, store_id, dq),
        _basket_insight(db, store_id, dq),
        _data_quality_insight(data_points, 30, dq),
    ]
    insights = [i for b in builders for i in b]

    priority_rank = {"DO_NOW": 0, "DO_TODAY": 1, "WATCH": 2, "OPPORTUNITY": 3}
    insights.sort(key=lambda i: priority_rank.get(i["priority"], 9))
    return insights[:limit]


def morning_briefing_data(db: Session, store_id: Any) -> dict:
    """The numbers behind the owner's morning briefing (spec §18)."""
    metrics, dq, _ = _product_metrics(db, store_id)
    insights = generate_all_insights(db, store_id, limit=10)
    do_now = [i for i in insights if i["priority"] == "DO_NOW"]
    stock_value = sum(m["stock"] * (m["product"].purchase_price or 0) for m in metrics)
    expiring_value = sum(m["expiring_value"] for m in metrics)
    low_stock = sum(1 for m in metrics if m["avg_daily"] > 0 and m["coverage"] is not None and m["coverage"] <= m["lead"])

    return {
        "as_of": _utcnow().isoformat(),
        "data_quality": dq,
        "sections": {
            "sales": math_engine.daily_sales_engine(db, store_id),
            "inventory": {
                "stock_value": round(stock_value, 2),
                "expiring_value": round(expiring_value, 2),
                "low_stock_products": low_stock,
            },
        },
        "important_actions": len(do_now),
        "top_actions": do_now[:3],
        "all_insights": insights,
    }
