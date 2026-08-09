"""Dashboard aggregate, analytics views, insights, and AI briefing endpoint."""
from __future__ import annotations

from datetime import date, timedelta, datetime, time
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
    
    prev_batches = db.scalars(select(InventoryBatch).where(InventoryBatch.store_id == sid, InventoryBatch.received_date < start)).all()
    prev_inventory_value = float(sum((b.quantity or 0) * (b.purchase_price or 0) for b in prev_batches))
    inventory_value_delta_pct = round(((inventory_value - prev_inventory_value) / prev_inventory_value * 100) if prev_inventory_value > 0 else 0.0, 1)

    recent_products = sum(1 for p in products if p.created_at.date() >= start)
    prev_products = len(products) - recent_products
    product_count_delta_pct = round((recent_products / prev_products * 100) if prev_products > 0 else 0.0, 1)

    margins = []
    for s in sales:
        prod = db.get(Product, s.product_id)
        if prod and prod.selling_price and prod.purchase_price and float(prod.selling_price) > 0:
            margins.append((float(prod.selling_price) - float(prod.purchase_price)) / float(prod.selling_price) * 100)
    avg_gross_margin = round(sum(margins) / len(margins), 1) if margins else 0.0

    today_sales = db.scalars(select(Sale).where(Sale.store_id == sid, Sale.sale_date >= datetime.combine(now, datetime.min.time()))).all()
    today_revenue = round(sum(float(s.sale_price) * s.quantity_sold for s in today_sales), 2)
    today_orders = len(set(s.pos_session_id for s in today_sales if s.pos_session_id)) or len(today_sales)
    today_units = sum(s.quantity_sold for s in today_sales)
    
    waste_total = waste_prevented_total(db, sid)
    gs = calculate_green_score(db, sid)
    timeline = expiry_timeline(db, sid)
    health = stock_health(db, sid)
    actions = [AIRecommendation(id=p.id, product_id=p.product_id, batch_id=p.batch_id, risk_type=p.risk_type, severity=p.severity, value_at_risk=p.value_at_risk, recommendation_json=p.recommendation_json, status=p.status, created_at=p.created_at) for p in pending[:4]]
    sell_first = sum(1 for p in pending if "expiry" in p.risk_type.lower())
    discount_count = sum(1 for p in pending if "stock" in p.risk_type.lower() or "overstock" in p.risk_type.lower())
    transfer_count = sum(1 for p in pending if "demand" in p.risk_type.lower())
    reorder_count = sum(1 for p in pending if "stockout" in p.risk_type.lower() or "margin" in p.risk_type.lower())
    # Build dynamic AI insights based on actual store data
    real_insights = []
    
    if discount_count > 0:
        real_insights.append(AiInsight(title="OVERSTOCK_DETECTED", detail=f"{discount_count} products have excess inventory. Consider discounting.", icon="Package"))
    
    if reorder_count > 0:
        real_insights.append(AiInsight(title="DEMAND_SPIKE", detail=f"{reorder_count} products are at risk of stockout.", icon="TrendingUp"))
        
    if waste_total > 0:
        real_insights.append(AiInsight(title="WASTE_PRV", detail=f"Prevented ₹{waste_total:,.0f} potential waste.", icon="Leaf"))
        
    if not real_insights:
        real_insights.append(AiInsight(title="ALL_GOOD", detail="Inventory levels are healthy.", icon="CheckCircle"))

    # Compute real sales trend
    trend_dict = {}
    for i in range(30):
        d = start + timedelta(days=i)
        trend_dict[d] = {"revenue": 0.0, "units": 0}
        
    for s in sales:
        d = s.sale_date.date() if hasattr(s.sale_date, "date") else s.sale_date
        if d in trend_dict:
            trend_dict[d]["revenue"] += float(s.sale_price or 0) * s.quantity_sold
            trend_dict[d]["units"] += s.quantity_sold
            
    trend = [{"date": k, "revenue": round(v["revenue"], 2), "units": v["units"]} for k, v in sorted(trend_dict.items())]
    
    gs = calculate_green_score(db, sid)
    return DashboardSummary(
        kpis=DashboardKpis(inventory_value=inventory_value, inventory_value_delta_pct=inventory_value_delta_pct, product_count=len(products), product_count_delta_pct=product_count_delta_pct, at_risk_count=at_risk_count, at_risk_value=round(at_risk_value, 2), expired_count=expired_count, expired_value=round(expired_value, 2), waste_prevented_mtd=waste_total, today_revenue=today_revenue, today_orders=today_orders, today_units=today_units),
        donut=health, sales_trend=trend, expiry_timeline=timeline,
        urgent_actions=[],  # kept compact in aggregate endpoint
        ai_priority=AiPriorityActions(sell_first=AiPriorityAction(products=sell_first, units=sum(b.quantity for b in batches if 0 <= (b.expiry_date - now).days <= 3 and b.quantity > 0), value=round(sum(float(b.quantity * (b.purchase_price or 0)) for b in batches if 0 <= (b.expiry_date - now).days <= 3), 2)),
                                       discount=AiPriorityAction(products=discount_count, units=0, value=0),
                                       transfer=AiPriorityAction(products=transfer_count, units=0, value=0),
                                       reorder=AiPriorityAction(products=reorder_count, units=0, value=0)),
        ai_insights=real_insights,
        mini_kpis=MiniKpis(suppliers=suppliers, purchase_orders=0, grn_pending=0, avg_gross_margin=avg_gross_margin),
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
    sid = store(user)
    now = date.today()
    start = now - timedelta(days=days-1)
    sales = db.scalars(select(Sale).where(Sale.store_id == sid, Sale.sale_date >= start)).all()
    
    trend_dict = {}
    for i in range(days):
        d = start + timedelta(days=i)
        trend_dict[d] = {"revenue": 0.0, "units": 0}
        
    for s in sales:
        d = s.sale_date.date() if hasattr(s.sale_date, "date") else s.sale_date
        if d in trend_dict:
            trend_dict[d]["revenue"] += float(s.sale_price or 0) * s.quantity_sold
            trend_dict[d]["units"] += s.quantity_sold
            
    return [{"date": k, "revenue": round(v["revenue"], 2), "units": v["units"]} for k, v in sorted(trend_dict.items())]

@router.get("/insights", response_model=list[AiInsight])
def insights(user: User = Depends(get_current_user), db=Depends(get_db)):
    sid = store(user)
    now = date.today()
    batches = db.scalars(select(InventoryBatch).where(InventoryBatch.store_id == sid)).all()
    pending = db.scalars(select(AIRecommendation).where(AIRecommendation.store_id == sid, AIRecommendation.status == "PENDING")).all()
    waste_total = waste_prevented_total(db, sid)
    
    discount_count = sum(1 for p in pending if "stock" in p.risk_type.lower() or "overstock" in p.risk_type.lower())
    reorder_count = sum(1 for p in pending if "stockout" in p.risk_type.lower() or "margin" in p.risk_type.lower())
    
    real_insights = []
    if discount_count > 0:
        real_insights.append(AiInsight(title="OVERSTOCK_DETECTED", detail=f"{discount_count} products have excess inventory.", icon="Package"))
    if reorder_count > 0:
        real_insights.append(AiInsight(title="DEMAND_SPIKE", detail=f"{reorder_count} products are at risk of stockout.", icon="TrendingUp"))
    if waste_total > 0:
        real_insights.append(AiInsight(title="WASTE_PRV", detail=f"Prevented ₹{waste_total:,.0f} potential waste.", icon="Leaf"))
        
    if not real_insights:
        real_insights.append(AiInsight(title="ALL_GOOD", detail="Inventory levels are healthy.", icon="CheckCircle"))
    
    return real_insights

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

@router.get("/hourly")
def hourly_sales(
    target_date: str = "",
    user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """Sales aggregated by hour for a given date."""
    sid = store(user)
    if target_date:
        day = date.fromisoformat(target_date)
    else:
        day = date.today()
    
    day_start = datetime.combine(day, time(0, 0, 0))
    day_end = datetime.combine(day, time(23, 59, 59))
    
    sales = db.scalars(select(Sale).where(
        Sale.store_id == sid,
        Sale.sale_date >= day_start,
        Sale.sale_date <= day_end
    )).all()
    
    hourly = {h: {'hour': h, 'revenue': 0.0, 'units': 0, 'orders': 0} for h in range(24)}
    session_hours = {}
    
    for s in sales:
        h = s.sale_date.hour if hasattr(s.sale_date, "hour") else s.sale_date.time().hour
        hourly[h]['revenue'] += float(s.sale_price or 0) * s.quantity_sold
        hourly[h]['units'] += s.quantity_sold
        if s.pos_session_id:
            session_hours.setdefault(h, set()).add(str(s.pos_session_id))
    
    for h in range(24):
        hourly[h]['orders'] = len(session_hours.get(h, set())) or (1 if hourly[h]['units'] > 0 else 0)
        hourly[h]['revenue'] = round(hourly[h]['revenue'], 2)
    
    return list(hourly.values())


@router.get("/weekly")
def weekly_comparison(user: User = Depends(get_current_user), db=Depends(get_db)):
    """This week vs last week comparison."""
    sid = store(user)
    today = date.today()
    
    this_week_start = today - timedelta(days=today.weekday())
    last_week_start = this_week_start - timedelta(days=7)
    last_week_end = this_week_start - timedelta(days=1)
    
    def week_stats(start, end):
        sales = db.scalars(select(Sale).where(
            Sale.store_id == sid,
            Sale.sale_date >= datetime.combine(start, time(0,0,0)),
            Sale.sale_date <= datetime.combine(end, time(23,59,59))
        )).all()
        revenue = sum(float(s.sale_price or 0) * s.quantity_sold for s in sales)
        units = sum(s.quantity_sold for s in sales)
        return {'revenue': round(revenue, 2), 'units': units, 'transactions': len(sales)}
    
    this_week = week_stats(this_week_start, today)
    last_week = week_stats(last_week_start, last_week_end)
    
    revenue_growth = 0.0
    if last_week['revenue'] > 0:
        revenue_growth = round((this_week['revenue'] - last_week['revenue']) / last_week['revenue'] * 100, 1)
    
    return {
        'this_week': {**this_week, 'start': str(this_week_start), 'end': str(today)},
        'last_week': {**last_week, 'start': str(last_week_start), 'end': str(last_week_end)},
        'revenue_growth_pct': revenue_growth,
    }


@router.get("/monthly")
def monthly_comparison(user: User = Depends(get_current_user), db=Depends(get_db)):
    """This month vs last month comparison."""
    sid = store(user)
    today = date.today()
    
    this_month_start = today.replace(day=1)
    last_month_end = this_month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)
    
    def month_stats(start, end):
        sales = db.scalars(select(Sale).where(
            Sale.store_id == sid,
            Sale.sale_date >= datetime.combine(start, time(0,0,0)),
            Sale.sale_date <= datetime.combine(end, time(23,59,59))
        )).all()
        revenue = sum(float(s.sale_price or 0) * s.quantity_sold for s in sales)
        units = sum(s.quantity_sold for s in sales)
        return {
            'revenue': round(revenue, 2),
            'units': units,
            'transactions': len(sales),
            'start': str(start),
            'end': str(end)
        }
    
    this_month = month_stats(this_month_start, today)
    last_month = month_stats(last_month_start, last_month_end)
    
    revenue_growth = 0.0
    if last_month['revenue'] > 0:
        revenue_growth = round((this_month['revenue'] - last_month['revenue']) / last_month['revenue'] * 100, 1)
    
    return {
        'this_month': this_month,
        'last_month': last_month,
        'revenue_growth_pct': revenue_growth,
    }


@router.get("/heatmap")
def demand_heatmap(user: User = Depends(get_current_user), db=Depends(get_db), days: int = 30):
    """Day-of-week × hour demand matrix. Returns a 7×24 grid."""
    sid = store(user)
    since = datetime.now() - timedelta(days=days)
    sales = db.scalars(select(Sale).where(
        Sale.store_id == sid,
        Sale.sale_date >= since
    )).all()
    
    matrix = [[{'day': d, 'hour': h, 'revenue': 0.0, 'units': 0} for h in range(24)] for d in range(7)]
    
    for s in sales:
        dow = s.sale_date.weekday() if hasattr(s.sale_date, "weekday") else s.sale_date.date().weekday()
        h = s.sale_date.hour if hasattr(s.sale_date, "hour") else s.sale_date.time().hour
        matrix[dow][h]['revenue'] += float(s.sale_price or 0) * s.quantity_sold
        matrix[dow][h]['units'] += s.quantity_sold
    
    for row in matrix:
        for cell in row:
            cell['revenue'] = round(cell['revenue'], 2)
    
    days_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return [
        {'day_index': d, 'day_name': days_names[d], 'hours': matrix[d]}
        for d in range(7)
    ]


@router.get("/product/{product_id}/demand")
def product_demand(
    product_id: str,
    user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """Full demand analysis for a single product: hourly, daily, weekly patterns."""
    import uuid as _uuid
    sid = store(user)
    try:
        pid = _uuid.UUID(product_id)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    product = db.scalar(select(Product).where(Product.id == pid, Product.store_id == sid))
    if not product:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Product not found")
    
    since = datetime.now() - timedelta(days=30)
    sales = db.scalars(select(Sale).where(
        Sale.store_id == sid,
        Sale.product_id == pid,
        Sale.sale_date >= since
    )).all()
    
    hourly = {h: 0 for h in range(24)}
    daily = {}
    dow = {d: 0 for d in range(7)}
    
    for s in sales:
        h = s.sale_date.hour if hasattr(s.sale_date, "hour") else s.sale_date.time().hour
        hourly[h] += s.quantity_sold
        d = str(s.sale_date.date() if hasattr(s.sale_date, "date") else s.sale_date)
        daily[d] = daily.get(d, 0) + s.quantity_sold
        weekday = s.sale_date.weekday() if hasattr(s.sale_date, "weekday") else s.sale_date.date().weekday()
        dow[weekday] += s.quantity_sold
    
    total_units = sum(s.quantity_sold for s in sales)
    total_revenue = sum(float(s.sale_price or 0) * s.quantity_sold for s in sales)
    velocity = total_units / 30 if sales else 0.0
    
    peak_hour = max(hourly, key=hourly.get) if any(hourly.values()) else None
    peak_dow = max(dow, key=dow.get) if any(dow.values()) else None
    dow_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    return {
        'product_id': product_id,
        'product_name': product.name,
        'total_units_30d': total_units,
        'total_revenue_30d': round(total_revenue, 2),
        'velocity_per_day': round(velocity, 2),
        'peak_hour': peak_hour,
        'peak_day': dow_names[peak_dow] if peak_dow is not None else None,
        'hourly_pattern': [{'hour': h, 'units': hourly[h]} for h in range(24)],
        'daily_series': [{'date': d, 'units': u} for d, u in sorted(daily.items())],
        'dow_pattern': [{'day': dow_names[d], 'day_index': d, 'units': dow[d]} for d in range(7)],
    }
