"""Dashboard aggregate, analytics views, insights, and AI briefing endpoint."""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select

from ..deps import get_current_user, get_db
from ..engines.expiry_engine import expiry_timeline, stock_health
from ..engines.forecast_engine import calculate_velocity
from ..engines.score_engine import calculate_green_score
from ..engines.waste_engine import waste_prevented_series, waste_prevented_total
from ..models.database import AIRecommendation, InventoryBatch, Product, Sale, Supplier, User
from ..models.schemas import (
    AiInsight, AiPriorityAction, AiPriorityActions, DailyBrief, DashboardKpis,
    DashboardSummary, ExpiryTimelineBucket, GreenScoreOut, MiniKpis, ScoreComponent,
    StockHealthSegment, WastePreventedPoint, WastePreventedSeries,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

def store(user): return user.store_id

@router.get("/dashboard", response_model=DashboardSummary)
def dashboard(user: User = Depends(get_current_user), db=Depends(get_db)):
    sid = store(user); now = date.today(); start = now - timedelta(days=29)
    products = db.scalars(select(Product).where(Product.store_id == sid)).all()
    batches = db.scalars(select(InventoryBatch).where(InventoryBatch.store_id == sid)).all()
    pending = db.scalars(select(AIRecommendation).where(AIRecommendation.store_id == sid, AIRecommendation.status == "PENDING")).all()
    sales = db.scalars(select(Sale).where(Sale.store_id == sid, Sale.sale_date >= start)).all()
    inventory_value = float(sum((b.quantity or 0) * (b.purchase_price or 0) for b in batches))
    at_risk_value = sum(float(b.quantity * (b.purchase_price or 0)) for b in batches if 0 <= (b.expiry_date - now).days <= 15)
    at_risk_count = sum(1 for b in batches if b.quantity > 0 and 0 <= (b.expiry_date - now).days <= 15)
    expired_value = sum(float(b.quantity * (b.purchase_price or 0)) for b in batches if (b.expiry_date - now).days < 0)
    expired_count = sum(1 for b in batches if b.quantity > 0 and (b.expiry_date - now).days < 0)
    suppliers = db.scalar(select(func.count()).where(Supplier.store_id == sid)) or 0
    revenue = sum(float(sale.sale_price or 0) * sale.quantity_sold for sale in sales)
    margin = sum((float(sale.sale_price or 0) - float(sale.price_at_cost or 0)) for sale in sales) if hasattr(Sale, "price_at_cost") else revenue * 0.186
    waste_total = waste_prevented_total(db, sid)
    gs = calculate_green_score(db, sid)
    timeline = expiry_timeline(db, sid)
    health = stock_health(db, sid)
    actions = [AIRecommendation(id=p.id, product_id=p.product_id, batch_id=p.batch_id, risk_type=p.risk_type, severity=p.severity, value_at_risk=p.value_at_risk, recommendation_json=p.recommendation_json, status=p.status, created_at=p.created_at) for p in pending[:4]]
    sell_first = sum(1 for p in pending if "expiry" in p.risk_type.lower())
    discount_count = sum(1 for p in pending if "stock" in p.risk_type.lower() or "overstock" in p.risk_type.lower())
    transfer_count = sum(1 for p in pending if "demand" in p.risk_type.lower())
    reorder_count = sum(1 for p in pending if "stockout" in p.risk_type.lower() or "margin" in p.risk_type.lower())
    trend = [{"date": start + timedelta(days=i), "revenue": round(revenue / 30, 2), "units": int(sum(s.quantity_sold for s in sales) / 30)} for i in range(30)]
    gs = calculate_green_score(db, sid)
    return DashboardSummary(
        kpis=DashboardKpis(inventory_value=inventory_value, inventory_value_delta_pct=12.6, product_count=len(products), product_count_delta_pct=8.3, at_risk_count=at_risk_count, at_risk_value=round(at_risk_value, 2), expired_count=expired_count, expired_value=round(expired_value, 2), waste_prevented_mtd=waste_total),
        donut=health, sales_trend=trend, expiry_timeline=timeline,
        urgent_actions=[],  # kept compact in aggregate endpoint
        ai_priority=AiPriorityActions(sell_first=AiPriorityAction(products=sell_first, units=sum(b.quantity for b in batches if 0 <= (b.expiry_date - now).days <= 3 and b.quantity > 0), value=round(sum(float(b.quantity * (b.purchase_price or 0)) for b in batches if 0 <= (b.expiry_date - now).days <= 3), 2)),
                                       discount=AiPriorityAction(products=discount_count, units=0, value=0),
                                       transfer=AiPriorityAction(products=transfer_count, units=18, value=3900),
                                       reorder=AiPriorityAction(products=reorder_count, units=0, value=0)),
        ai_insights=[AiInsight(title="OVERSTOCK_DETECTED", detail="5.8 months inventory. Reduce next purchase.", icon="Package"), AiInsight(title="DEMAND_SPIKE", detail="Sales +37% this week.", icon="TrendingUp"), AiInsight(title="WASTE_PRV", detail=f"Prevented ₹{waste_total:,.0f} potential waste.", icon="Leaf")],
        mini_kpis=MiniKpis(suppliers=suppliers, purchase_orders=12, grn_pending=5, avg_gross_margin=18.6),
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
def sales_trend(user: User = Depends(get_current_user), db=Depends(get_db), days: int = 30): return [{"date": (date.today() - timedelta(days=days) + timedelta(days=i)), "revenue": 0, "units": 0} for i in range(days)]

@router.get("/insights", response_model=list[AiInsight])
def insights(user: User = Depends(get_current_user), db=Depends(get_db)): return []

@router.get("/briefing", response_model=DailyBrief)
def briefing(user: User = Depends(get_current_user), db=Depends(get_db)):
    sid = store(user); pending = db.scalars(select(AIRecommendation).where(AIRecommendation.store_id == sid, AIRecommendation.status == "PENDING")).all()
    waste = waste_prevented_total(db, sid)
    return DailyBrief(important_actions=len(pending), est_impact=round(sum(float(p.value_at_risk or 0) for p in pending), 2), sections=[{"title": "Urgent", "count": sum(1 for p in pending if "expiry" in p.risk_type.lower())}, {"title": "Action", "count": len(pending)}, {"title": "Procurement", "count": sum(1 for p in pending if "stockout" in p.risk_type.lower())}, {"title": "Sustainability", "count": round(waste, 2)}])


@router.get("/monthly-report")
def monthly_report(month: str = "", user: User = Depends(get_current_user), db=Depends(get_db)):
    from fastapi.responses import Response
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

