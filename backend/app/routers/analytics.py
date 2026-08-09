"""Dashboard aggregate, analytics views, insights, and AI briefing endpoint.

All revenue/transaction/order figures are computed by the CANONICAL analytics
engine (``app.engines.analytics``) — the single source of truth for metric
math. Money is normalized to integer paise at read time (rupees/paise mixed
columns) and surfaced here as Decimal rupees. No router re-implements revenue,
profit, margin, growth, transactions or chart aggregation.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select

from ..deps import get_current_user, get_db, get_owner_manager
from ..engines import analytics as canonical
from ..engines.expiry_engine import expiry_timeline, stock_health
from ..engines.score_engine import calculate_green_score
from ..engines.waste_engine import waste_prevented_series, waste_prevented_total
from ..models.database import AIRecommendation, InventoryBatch, Product, Supplier, User
from ..models.schemas import (
    ActionOut, AiInsight, AiPriorityAction, AiPriorityActions, DailyBrief,
    DashboardKpis, DashboardSummary, ExpiryTimelineBucket, GreenScoreOut,
    MiniKpis, Recommendation, ScoreComponent, StockHealthSegment,
    WastePreventedPoint, WastePreventedSeries,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

def store(user):
    if user.store_id is None:
        raise HTTPException(403, "User is not assigned to a store")
    return user.store_id


def _rupees(paise_value):
    """Decimal rupee figure → float for JSON; None passes through (insufficient)."""
    if paise_value is None:
        return None
    return float(canonical.to_rupees(paise_value))


def _action_out(row, db) -> ActionOut:
    product = db.get(Product, row.product_id)
    recs = [Recommendation.model_validate(r) for r in (row.recommendation_json or [])]
    return ActionOut(
        id=row.id, product_id=row.product_id, product_name=product.name if product else "Unknown",
        batch_id=row.batch_id, batch_number=None, risk_type=row.risk_type, severity=row.severity,
        value_at_risk=float(row.value_at_risk or 0), recommendations=recs,
        status=row.status, created_at=row.created_at,
    )


def _insights_from(batches, at_risk_count, at_risk_value, expired_count, expired_value, reorder_count) -> list[AiInsight]:
    """Data-derived insights — never fabricated. An empty store => empty list."""
    insights: list[AiInsight] = []
    if expired_count > 0:
        insights.append(AiInsight(title="EXPIRED_STOCK", detail=f"{expired_count} batch(es) expired, ₹{expired_value:,.0f} at risk of write-off.", icon="AlertTriangle"))
    if at_risk_count > 0:
        insights.append(AiInsight(title="EXPIRING_SOON", detail=f"{at_risk_count} batch(es) expiring within 15 days, ₹{at_risk_value:,.0f} at risk.", icon="Clock"))
    if reorder_count > 0:
        insights.append(AiInsight(title="STOCKOUT_RISK", detail=f"{reorder_count} product(s) below coverage — reorder suggested.", icon="ShoppingCart"))
    dead_stock_value = sum(float(b.quantity * (b.purchase_price or 0)) for b in batches
                           if b.quantity > 0 and (date.today() - (b.last_sale_date or b.received_date)).days > 60)
    if dead_stock_value > 0:
        insights.append(AiInsight(title="DEAD_STOCK", detail=f"₹{dead_stock_value:,.0f} locked in products with no sale for 60+ days.", icon="Package"))
    return insights

@router.get("/dashboard", response_model=DashboardSummary)
def dashboard(user: User = Depends(get_owner_manager), db=Depends(get_db)):
    sid = store(user); now = date.today(); start = date.today() - timedelta(days=29)
    products = db.scalars(select(Product).where(Product.store_id == sid)).all()
    batches = db.scalars(select(InventoryBatch).where(InventoryBatch.store_id == sid)).all()
    pending = db.scalars(select(AIRecommendation).where(AIRecommendation.store_id == sid, AIRecommendation.status == "PENDING")).all()
    at_risk_value = sum(float(b.quantity * (b.purchase_price or 0)) for b in batches if 0 <= (b.expiry_date - now).days <= 15)
    at_risk_count = sum(1 for b in batches if b.quantity > 0 and 0 <= (b.expiry_date - now).days <= 15)
    expired_value = sum(float(b.quantity * (b.purchase_price or 0)) for b in batches if (b.expiry_date - now).days < 0)
    expired_count = sum(1 for b in batches if b.quantity > 0 and (b.expiry_date - now).days < 0)
    suppliers = db.scalar(select(func.count()).where(Supplier.store_id == sid)) or 0

    # ── canonical revenue block (net revenue = Σ taxable, paise→rupees) ──────
    window_start = datetime.combine(start, time.min)
    window_end = datetime.now()
    rev_30d = canonical.calculate_revenue(db, sid, start=window_start, end=window_end)
    inventory_value = canonical.calculate_inventory_value(db, sid)
    trend_points = canonical.daily_series(canonical.load_sales(db, sid), days=30, end_date=now)
    trend = [{"date": date.fromisoformat(p["date"]), "revenue": float(p["revenue"]), "units": p["units"]}
             for p in trend_points]

    before_30 = now - timedelta(days=30)
    prev_value = float(sum(
        (b.quantity or 0) * float(b.purchase_price or 0)
        for b in db.scalars(select(InventoryBatch).where(
            InventoryBatch.store_id == sid,
            InventoryBatch.received_date <= before_30
        )).all()
    ))
    iv = float(inventory_value["inventory_value"])
    delta_pct = round((iv - prev_value) / prev_value * 100, 1) if prev_value > 0 else 0.0

    new_products_30d = sum(1 for p in products if hasattr(p, 'created_at') and p.created_at and p.created_at.date() >= (now - timedelta(days=30)))
    prev_product_count = len(products) - new_products_30d
    product_delta_pct = round(new_products_30d / prev_product_count * 100, 1) if prev_product_count > 0 else 0.0

    # ── today KPIs: real transactions (distinct invoices), not sessions ──────
    today = date.today()
    today_start = datetime.combine(today, time.min)
    today_agg = canonical.calculate_revenue(db, sid, start=today_start, end=window_end)
    today_revenue = float(today_agg["net_revenue"])
    today_orders = today_agg["transactions"]
    today_units = today_agg["units"]

    insights = _insights_from(batches, at_risk_count, at_risk_value, expired_count, expired_value, len(pending))
    waste_total = waste_prevented_total(db, sid)
    gs = calculate_green_score(db, sid)
    timeline = expiry_timeline(db, sid)
    health = stock_health(db, sid)
    urgent_actions = [_action_out(p, db) for p in pending[:4]]
    sell_first = sum(1 for p in pending if "expiry" in p.risk_type.lower())
    discount_count = sum(1 for p in pending if "stock" in p.risk_type.lower() or "overstock" in p.risk_type.lower())
    transfer_count = sum(1 for p in pending if "demand" in p.risk_type.lower())
    reorder_count = sum(1 for p in pending if "stockout" in p.risk_type.lower() or "margin" in p.risk_type.lower())
    margin = rev_30d["gross_margin_pct"]

    return DashboardSummary(
        kpis=DashboardKpis(inventory_value=iv, inventory_value_delta_pct=delta_pct, product_count=len(products), product_count_delta_pct=product_delta_pct, at_risk_count=at_risk_count, at_risk_value=round(at_risk_value, 2), expired_count=expired_count, expired_value=round(expired_value, 2), waste_prevented_mtd=waste_total, today_revenue=today_revenue, today_orders=today_orders, today_units=today_units),
        donut=health, sales_trend=trend, expiry_timeline=timeline,
        urgent_actions=urgent_actions,
        ai_priority=AiPriorityActions(sell_first=AiPriorityAction(products=sell_first, units=sum(b.quantity for b in batches if 0 <= (b.expiry_date - now).days <= 3 and b.quantity > 0), value=round(sum(float(b.quantity * (b.purchase_price or 0)) for b in batches if 0 <= (b.expiry_date - now).days <= 3), 2)),
                                       discount=AiPriorityAction(products=discount_count, units=0, value=0),
                                       transfer=AiPriorityAction(products=transfer_count, units=0, value=0),
                                       reorder=AiPriorityAction(products=reorder_count, units=0, value=0)),
        ai_insights=insights,
        mini_kpis=MiniKpis(suppliers=suppliers, purchase_orders=0, grn_pending=0, avg_gross_margin=float(margin) if margin is not None else 0.0),
        green_score=GreenScoreOut(**gs, breakdown=[
            ScoreComponent(name="Expiry Prevention", weight=.30, value=gs["expiry_score"], note="At-risk stock cleared before expiry"),
            ScoreComponent(name="Inventory Efficiency", weight=.30, value=gs["inventory_score"], note="Healthy stock turnover"),
            ScoreComponent(name="Dead Stock Control", weight=.20, value=gs["dead_stock_score"], note="Capital not locked in stale stock"),
            ScoreComponent(name="Waste Reduction", weight=.20, value=gs["waste_score"], note="Potential waste prevented"),
        ]),
        daily_brief=DailyBrief(important_actions=len(pending), est_impact=sum(float(p.value_at_risk or 0) for p in pending), sections=[{"title": "Urgent", "count": sell_first}, {"title": "Discount", "count": discount_count}, {"title": "Transfer", "count": transfer_count}, {"title": "Reorder", "count": reorder_count}],
    ))

@router.get("/waste-prevented", response_model=WastePreventedSeries)
def waste_prevented(days: int = 30, user: User = Depends(get_current_user), db=Depends(get_db)):
    series = waste_prevented_series(db, store(user), days)
    return WastePreventedSeries(total=sum(point["value"] for point in series), series=[WastePreventedPoint.model_validate(point) for point in series])

@router.get("/stock-health", response_model=list[StockHealthSegment])
def stock_health_endpoint(user: User = Depends(get_current_user), db=Depends(get_db)): return stock_health(db, store(user))

@router.get("/sales-trend")
def sales_trend(user: User = Depends(get_current_user), db=Depends(get_db), days: int = 30):
    """Daily net revenue/units for the last N days — canonical zero-filled series
    (net revenue = Σ taxable, distinct-invoice orders)."""
    sid = store(user)
    series = canonical.daily_series(canonical.load_sales(db, sid), days=days, end_date=date.today())
    return [{"date": p["date"], "revenue": float(p["revenue"]), "units": p["units"], "orders": p["orders"]}
            for p in series]

@router.get("/insights", response_model=list[AiInsight])
def insights(user: User = Depends(get_current_user), db=Depends(get_db)):
    sid = store(user)
    now = date.today()
    batches = db.scalars(select(InventoryBatch).where(InventoryBatch.store_id == sid)).all()
    at_risk_value = sum(float(b.quantity * (b.purchase_price or 0)) for b in batches if 0 <= (b.expiry_date - now).days <= 15)
    at_risk_count = sum(1 for b in batches if b.quantity > 0 and 0 <= (b.expiry_date - now).days <= 15)
    expired_value = sum(float(b.quantity * (b.purchase_price or 0)) for b in batches if (b.expiry_date - now).days < 0)
    expired_count = sum(1 for b in batches if b.quantity > 0 and (b.expiry_date - now).days < 0)
    pending = db.scalars(select(AIRecommendation).where(AIRecommendation.store_id == sid, AIRecommendation.status == "PENDING")).all()
    reorder_count = sum(1 for p in pending if "stockout" in p.risk_type.lower() or "margin" in p.risk_type.lower())
    return _insights_from(batches, at_risk_count, at_risk_value, expired_count, expired_value, reorder_count)

@router.get("/briefing", response_model=DailyBrief)
def briefing(user: User = Depends(get_current_user), db=Depends(get_db)):
    sid = store(user); pending = db.scalars(select(AIRecommendation).where(AIRecommendation.store_id == sid, AIRecommendation.status == "PENDING")).all()
    waste = waste_prevented_total(db, sid)
    return DailyBrief(important_actions=len(pending), est_impact=round(sum(float(p.value_at_risk or 0) for p in pending), 2), sections=[{"title": "Urgent", "count": sum(1 for p in pending if "expiry" in p.risk_type.lower())}, {"title": "Action", "count": len(pending)}, {"title": "Procurement", "count": sum(1 for p in pending if "stockout" in p.risk_type.lower())}, {"title": "Sustainability", "count": round(waste, 2)}])


@router.get("/monthly-report")
def monthly_report(month: str = "", user: User = Depends(get_current_user), db=Depends(get_db)):
    from ..engines.report_engine import generate_monthly_report
    sid = store(user)
    if not month:
        month = date.today().strftime("%Y-%m")
    return generate_monthly_report(db, sid, month)


@router.get("/monthly-report/export-csv")
def export_monthly_report_csv(month: str = "", user: User = Depends(get_current_user), db=Depends(get_db)):
    from fastapi.responses import Response
    from ..engines.report_engine import generate_monthly_report
    sid = store(user)
    if not month:
        month = date.today().strftime("%Y-%m")
    report = generate_monthly_report(db, sid, month)
    csv_lines = [
        "Metric,Value",
        f"Month,{report['month_name']}",
        f"Total Sales Revenue (INR),{report['total_sales']}",
        f"Total Transactions,{report['total_transactions']}",
        f"Waste Prevented Value (INR),{report['waste_prevented_value']}",
        f"Actual Waste Value (INR),{report['actual_waste_value']}",
        f"Average Green Score,{report['avg_green_score']}",
        f"Top Category,{report['top_category']}",
        f"Top Selling Product,\"{report['top_selling_product']}\"",
    ]
    csv_data = "\n".join(csv_lines)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=Monthly_Report_{month}.csv"}
    )


@router.get("/hourly")
def hourly_sales(
    target_date: str = "",
    user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """Sales by hour for a day (default: today). Orders = distinct invoices —
    never a fabricated ``1`` per unit-sold hour."""
    sid = store(user)
    if target_date:
        day = date.fromisoformat(target_date)
    else:
        day = date.today()
    day_start = datetime.combine(day, time(0, 0, 0))
    day_end = day_start + timedelta(days=1)
    lines = canonical.load_sales(db, sid, start=day_start, end=day_end)
    hours = canonical.chart.peak_hours(lines)
    return [{"hour": h["hour"], "label": h["label"], "revenue": float(h["revenue"]),
             "units": h["units"], "orders": h["orders"]} for h in hours]


@router.get("/weekly")
def weekly_comparison(user: User = Depends(get_current_user), db=Depends(get_db)):
    """This week (Mon→today) vs the SAME weekdays of last week — equal length.
    Growth is None ("insufficient data") when the prior period has no revenue."""
    sid = store(user)
    cur, prev = canonical.timeseries.comparable_periods("week")
    cmp = canonical.timeseries.compare_periods(cur, prev, canonical.load_sales(db, sid))
    return {
        "this_week": {"revenue": float(cmp["current"]["net_revenue"]),
                      "units": cmp["current"]["units"],
                      "transactions": cmp["current"]["transactions"],
                      "start": cur.start.isoformat(), "end": cur.end.isoformat()},
        "last_week": {"revenue": float(cmp["previous"]["net_revenue"]),
                      "units": cmp["previous"]["units"],
                      "transactions": cmp["previous"]["transactions"],
                      "start": prev.start.isoformat(), "end": prev.end.isoformat()},
        "revenue_growth_pct": float(cmp["net_revenue_growth_pct"]) if cmp["net_revenue_growth_pct"] is not None else None,
    }


@router.get("/monthly")
def monthly_comparison(user: User = Depends(get_current_user), db=Depends(get_db)):
    """MTD vs the SAME number of days of last month — equal length."""
    sid = store(user)
    cur, prev = canonical.timeseries.comparable_periods("month")
    cmp = canonical.timeseries.compare_periods(cur, prev, canonical.load_sales(db, sid))
    return {
        "this_month": {"revenue": float(cmp["current"]["net_revenue"]),
                       "units": cmp["current"]["units"],
                       "transactions": cmp["current"]["transactions"],
                       "start": cur.start.isoformat(), "end": cur.end.isoformat()},
        "last_month": {"revenue": float(cmp["previous"]["net_revenue"]),
                       "units": cmp["previous"]["units"],
                       "transactions": cmp["previous"]["transactions"],
                       "start": prev.start.isoformat(), "end": prev.end.isoformat()},
        "revenue_growth_pct": float(cmp["net_revenue_growth_pct"]) if cmp["net_revenue_growth_pct"] is not None else None,
    }


@router.get("/heatmap")
def demand_heatmap(days: int = 30, user: User = Depends(get_current_user), db=Depends(get_db)):
    """7×24 day-of-week × hour demand heatmap — canonical aggregation with real
    order counts."""
    sid = store(user)
    since = datetime.now() - timedelta(days=days)
    lines = canonical.load_sales(db, sid, start=since)
    matrix = canonical.chart.demand_heatmap(lines)
    for row in matrix:
        for cell in row["hours"]:
            cell["revenue"] = float(cell["revenue"])
    return matrix
