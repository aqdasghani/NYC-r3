"""AI Intelligence API Routes (AI spec §2, §6, §16, §17, §18, §19, §20).

Endpoints:
  GET  /api/ai/insights          — All insights for the store (optionally ?type=)
  GET  /api/ai/briefing          — Morning briefing data + narrative
  POST /api/ai/copilot           — Owner asks a question (free text)
  GET  /api/ai/heatmap           — Time × Product heatmap
  GET  /api/ai/matrix            — Product classification matrix (math engine)
  GET  /api/ai/associations      — Basket association rules + cross-sell
  GET  /api/ai/behavior          — Full behavioral analysis
  GET  /api/ai/opportunities     — Product Opportunity Engine (PROMOTE/REORDER/…)
  GET  /api/ai/actions           — Prioritized AI Action Center
  GET  /api/ai/forecast          — Demand forecast + reorder suggestions
  GET  /api/ai/memory            — Recommendation feedback loop history
  POST /api/ai/memory/decision   — Record an owner accept/reject decision
  POST /api/ai/memory/{id}/outcome — Measure a decision's 7-day outcome
  GET  /api/ai/end-of-day        — End-of-day analysis
  GET  /api/ai/monthly-review    — Monthly business review

Every number comes from the math engine / database. The AI layer only
interprets — it never supplies a metric.
"""
from __future__ import annotations

import logging
import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db
from ..engines import ai_memory, behavior_engine, insight_engine, math_engine, opportunity_engine
from ..engines.ai_interpreter import answer_owner_question, generate_briefing_narrative, interpret_insight
from ..engines.forecast_engine import days_of_supply, reorder_quantity, stockout_eta
from ..models.database import Invoice, InvoiceItem, Product, User

router = APIRouter(prefix="/api/ai", tags=["AI Intelligence"])
logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _store_id(current_user: User) -> uuid.UUID:
    if not current_user.store_id:
        raise HTTPException(400, "User has no assigned store")
    return current_user.store_id


class CopilotRequest(BaseModel):
    question: str
    include_products: bool = True
    include_behavior: bool = True


class DecisionRequest(BaseModel):
    action_type: str
    decision: str  # ACCEPTED | REJECTED | EXECUTED | DISMISSED
    product_id: str | None = None
    product_name: str | None = None
    recommendation_id: str | None = None
    notes: str = ""


# ───────────────────────────────── insights ─────────────────────────────────

@router.get("/insights")
@router.post("/insights")
def get_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    explain: bool = False,
    type: str | None = None,
):
    sid = _store_id(current_user)
    insights = insight_engine.generate_all_insights(db, sid)
    if type:
        t = type.upper()
        insights = [
            i for i in insights
            if t in ("ALL",) or i["priority"] == t or i["badge"] == t or i["category"] == t
        ]
    if explain:
        return [interpret_insight(i) for i in insights]
    return insights


# ───────────────────────────────── briefing ─────────────────────────────────

@router.get("/briefing")
def get_briefing(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sid = _store_id(current_user)
    data = insight_engine.morning_briefing_data(db, sid)
    narrative = generate_briefing_narrative(data)
    return {"data": data, "narrative": narrative}


# ───────────────────────────────── copilot ──────────────────────────────────

@router.post("/copilot")
def ask_copilot_endpoint(
    req: CopilotRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sid = _store_id(current_user)
    result = answer_owner_question(db, sid, req.question, req.include_products, req.include_behavior)
    try:
        ai_memory.log_ai(
            db, sid, feature="copilot", model=result["model_used"],
            request_summary=req.question, response_summary=result["answer"][:300], ok=True,
        )
    except Exception:  # noqa: BLE001 — logging must never break the answer
        logger.warning("ai_log write failed", exc_info=True)
    return result


# ─────────────────────────────── heatmap ────────────────────────────────────

@router.get("/heatmap")
def get_heatmap(
    days: int = 14,
    limit: int = 15,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Time × Product demand matrix (units sold per hour) from real invoices.

    Shape the intelligence heatmap page renders directly:
    {hours: ["00:00", ...], products: [{id, name}], data: units[product][hour]}.
    """
    sid = _store_id(current_user)
    since = _utcnow() - timedelta(days=days)
    rows = db.execute(
        select(InvoiceItem.product_id, InvoiceItem.quantity, InvoiceItem.created_at)
        .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
        .where(Invoice.store_id == sid, InvoiceItem.created_at >= since)
    ).all()
    per_product: dict[uuid.UUID, list[int]] = defaultdict(lambda: [0] * 24)
    totals: dict[uuid.UUID, int] = defaultdict(int)
    for product_id, quantity, created_at in rows:
        hour = created_at.hour
        per_product[product_id][hour] += quantity or 0
        totals[product_id] += quantity or 0
    top_ids = sorted(totals, key=totals.get, reverse=True)[:limit]
    hours = [f"{h:02d}:00" for h in range(24)]
    if not top_ids:
        return {"hours": hours, "products": [], "data": []}
    names = dict(db.execute(
        select(Product.id, Product.name).where(Product.id.in_(top_ids))
    ).all())
    products = [{"id": str(pid), "name": names.get(pid, "Unknown")} for pid in top_ids]
    data = [per_product[pid] for pid in top_ids]
    return {"hours": hours, "products": products, "data": data}


# ─────────────────────────── product classification matrix ───────────────────

@router.get("/matrix")
def get_product_matrix(
    days: int = 30,
    limit: int = 25,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pure-math product classification matrix (velocity/trend/coverage/margin).

    Classification comes from the math engine — no AI interpretation here.
    Sorted by 30-day velocity, top ``limit`` rows only.
    """
    sid = _store_id(current_user)
    metrics, _dq, _dp = insight_engine._product_metrics(db, sid, days)
    rows = []
    for m in metrics:
        rows.append({
            "productName": m["product"].name,
            "classification": m["classification"],
            "velocity": m["avg_daily"],
            "trend": f"{m['trend']:+.0f}%" if m["trend"] else "0%",
            "coverage": int(m["coverage"]) if m["coverage"] is not None else None,
            "margin": int(round(m["margin"])),
            "expiryDays": m["expiry_days"],
        })
    rows.sort(key=lambda r: r["velocity"] or 0, reverse=True)
    return rows[:limit]


# ─────────────────────────── associations & behavior ────────────────────────

@router.get("/associations")
def get_associations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return behavior_engine.associations(db, _store_id(current_user), days=60)


@router.get("/behavior")
def get_behavior(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return behavior_engine.full_behavior(db, _store_id(current_user), days=30)


# ───────────────────────────── opportunities & actions ──────────────────────

@router.get("/opportunities")
def get_opportunities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 60,
):
    return opportunity_engine.opportunities_for_store(db, _store_id(current_user), limit=limit)


@router.get("/actions")
def get_action_center(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sid = _store_id(current_user)
    insights = insight_engine.generate_all_insights(db, sid, limit=40)
    counts: dict[str, int] = {}
    for i in insights:
        counts[i["badge"]] = counts.get(i["badge"], 0) + 1
    return {
        "actions": insights,
        "summary": {
            "total": len(insights),
            "by_priority": counts,
            "by_category": {c: sum(1 for i in insights if i["category"] == c) for c in sorted({i["category"] for i in insights})},
        },
    }


# ───────────────────────────────── forecast ─────────────────────────────────

@router.get("/forecast")
def get_forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 25,
):
    """Per-product demand forecast built from real velocity + stock."""
    sid = _store_id(current_user)
    metrics, dq, _ = insight_engine._product_metrics(db, sid, days=30)
    rows = []
    for m in metrics:
        stock, vel = m["stock"], m["avg_daily"]
        rows.append({
            "product_id": str(m["product"].id),
            "product_name": m["product"].name,
            "category": m["product"].category,
            "avg_daily_sales": vel,
            "current_stock": stock,
            "days_of_supply": round(days_of_supply(stock, vel), 1) if vel > 0 else None,
            "stockout_eta_days": round(stockout_eta(stock, vel), 1) if vel > 0 else None,
            "lead_time_days": m["lead"],
            "reorder_quantity": reorder_quantity(stock, vel, m["lead"]) if vel > 0 else None,
            "trend_pct": m["trend"],
            "demand_spike": m["trend"] >= 50,
            "data_quality": dq,
        })
    urgent = [r for r in rows if r["reorder_quantity"] and r["reorder_quantity"] > 0]
    urgent.sort(key=lambda r: r["stockout_eta_days"] or 999)
    return {"data_quality": dq, "products": urgent[:limit], "total_analyzed": len(rows)}


# ───────────────────────────────── AI memory ────────────────────────────────

@router.get("/memory")
def get_memory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50,
):
    return ai_memory.list_decisions(db, _store_id(current_user), limit=limit)


@router.post("/memory/decision")
def record_decision_endpoint(
    req: DecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sid = _store_id(current_user)
    pid = uuid.UUID(req.product_id) if req.product_id else None
    rid = uuid.UUID(req.recommendation_id) if req.recommendation_id else None
    row = ai_memory.record_decision(
        db, sid, action_type=req.action_type, decision=req.decision,
        product_id=pid, product_name=req.product_name, recommendation_id=rid, notes=req.notes,
    )
    return {"id": str(row.id), "decision": row.decision, "action_type": row.action_type,
            "product_name": row.product_name, "created_at": row.created_at.isoformat()}


@router.post("/memory/{decision_id}/outcome")
def measure_outcome_endpoint(
    decision_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ai_memory.measure_outcome(db, _store_id(current_user), decision_id)


# ─────────────────────────────── end-of-day ─────────────────────────────────

@router.get("/end-of-day")
def end_of_day_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sid = _store_id(current_user)
    daily = math_engine.daily_sales_engine(db, sid)
    today = daily.get("today", {}) or {}
    yesterday = daily.get("yesterday", {}) or {}
    metrics, dq, _ = insight_engine._product_metrics(db, sid, days=30)

    rev_now, rev_prev = today.get("revenue", 0) or 0, yesterday.get("revenue", 0) or 0
    vs_yesterday = round((rev_now - rev_prev) / rev_prev * 100, 1) if rev_prev > 0 else None

    start = _utcnow() - timedelta(days=1)
    today_items = db.scalars(
        select(InvoiceItem).join(Invoice).where(Invoice.store_id == sid, Invoice.created_at >= start)
    ).all()
    by_product: dict[Any, int] = {}
    for it in today_items:
        by_product[it.product_id] = by_product.get(it.product_id, 0) + it.quantity
    names = {p.id: p.name for p in db.scalars(select(Product).where(Product.store_id == sid)).all()}
    top_today = [{"product_name": names.get(pid, str(pid)), "units": u} for pid, u in
                 sorted(by_product.items(), key=lambda kv: kv[1], reverse=True)[:5]]

    expiring = sum(m["expiring_value"] for m in metrics)
    stock_value = sum(m["stock"] * (m["product"].purchase_price or 0) for m in metrics)
    low_stock = sum(1 for m in metrics if m["avg_daily"] > 0 and m["coverage"] is not None and m["coverage"] <= m["lead"])

    return {
        "as_of": _utcnow().isoformat(),
        "data_quality": dq,
        "today": {
            "revenue": round(rev_now, 2), "orders": today.get("orders", 0),
            "units": today.get("units", 0), "profit": round(today.get("profit", 0) or 0, 2),
        },
        "vs_yesterday_pct": vs_yesterday,
        "yesterday_revenue": round(rev_prev, 2),
        "top_products_today": top_today,
        "inventory": {
            "stock_value": round(stock_value, 2), "expiring_value": round(expiring, 2),
            "low_stock_products": low_stock,
        },
    }


# ─────────────────────────────── monthly review ─────────────────────────────

@router.get("/monthly-review")
def monthly_review(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sid = _store_id(current_user)
    trend = math_engine.monthly_trend_engine(db, sid)
    d30 = trend.get("days_30", {}) or {}
    metrics, dq, _ = insight_engine._product_metrics(db, sid, days=30)

    top_products = sorted([m for m in metrics if m["revenue_30"] > 0],
                          key=lambda m: m["revenue_30"], reverse=True)[:8]
    cat_rev: dict[str, float] = {}
    for m in metrics:
        c = m["product"].category or "Uncategorized"
        cat_rev[c] = cat_rev.get(c, 0.0) + m["revenue_30"]

    return {
        "as_of": _utcnow().isoformat(),
        "data_quality": dq,
        "sales_growth_pct": d30.get("sales_growth_pct"),
        "profit_growth_pct": d30.get("profit_growth_pct"),
        "sales_trend": d30.get("sales_trend"),
        "profit_trend": d30.get("profit_trend"),
        "top_products": [{"product_name": m["product"].name, "revenue_30": m["revenue_30"],
                          "margin_pct": m["margin"]} for m in top_products],
        "revenue_by_category": [{"category": c, "revenue_30": round(v, 2)}
                                for c, v in sorted(cat_rev.items(), key=lambda kv: kv[1], reverse=True)],
        "full_trend": trend,
    }
