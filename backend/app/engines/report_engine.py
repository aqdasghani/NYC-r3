"""Monthly Report Engine — Aggregates monthly sales, waste prevented, Green Score, top products, and generates downloadable summaries."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from calendar import monthrange
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models.database import MonthlyReport, Sale, Product, WasteEvent, GreenScoreHistory
from .score_engine import calculate_green_score
from .waste_engine import waste_prevented_total


def generate_monthly_report(db: Session, store_id: Any, month_year: str) -> dict:
    """Generate or refresh monthly summary for store_id and month_year (YYYY-MM)."""
    try:
        year, month = map(int, month_year.split("-"))
    except ValueError:
        today = date.today()
        year, month = today.year, today.month
        month_year = f"{year:04d}-{month:02d}"

    _, last_day = monthrange(year, month)
    start_date = datetime(year, month, 1, 0, 0, 0)
    end_date = datetime(year, month, last_day, 23, 59, 59)
    start_date_only = date(year, month, 1)
    end_date_only = date(year, month, last_day)

    # 1. Total Sales & Transactions
    sales_q = select(
        func.coalesce(func.sum(Sale.sale_price * Sale.quantity_sold), 0.0).label("revenue"),
        func.count(func.distinct(Sale.pos_session_id)).label("txns")
    ).where(
        Sale.store_id == store_id,
        Sale.sale_date >= start_date,
        Sale.sale_date <= end_date
    )
    sales_res = db.execute(sales_q).first()
    total_sales = float(sales_res.revenue) if sales_res else 0.0
    total_txns = int(sales_res.txns) if sales_res else 0

    # 2. Top Selling Product
    top_prod_q = select(
        Product.name,
        func.sum(Sale.quantity_sold).label("qty_sold")
    ).join(Sale, Product.id == Sale.product_id).where(
        Sale.store_id == store_id,
        Sale.sale_date >= start_date,
        Sale.sale_date <= end_date
    ).group_by(Product.name).order_by(func.sum(Sale.quantity_sold).desc()).limit(1)

    top_prod_row = db.execute(top_prod_q).first()
    top_selling = top_prod_row[0] if top_prod_row else "N/A"

    # 3. Top Category
    top_cat_q = select(
        Product.category,
        func.sum(Sale.sale_price * Sale.quantity_sold).label("cat_revenue")
    ).join(Sale, Product.id == Sale.product_id).where(
        Sale.store_id == store_id,
        Sale.sale_date >= start_date,
        Sale.sale_date <= end_date
    ).group_by(Product.category).order_by(func.sum(Sale.sale_price * Sale.quantity_sold).desc()).limit(1)

    top_cat_row = db.execute(top_cat_q).first()
    top_category = top_cat_row[0] if top_cat_row and top_cat_row[0] else "Grocery"

    # 4. Waste Prevented & Actual Waste
    waste_events = db.scalars(
        select(WasteEvent).where(
            WasteEvent.store_id == store_id,
            WasteEvent.created_at >= start_date,
            WasteEvent.created_at <= end_date
        )
    ).all()
    prevented_val = sum(float(e.value_prevented or 0.0) for e in waste_events)
    actual_val = sum(float(e.actual_waste or 0.0) for e in waste_events)

    # 5. Average Green Score
    green_scores = db.scalars(
        select(GreenScoreHistory.score).where(
            GreenScoreHistory.store_id == store_id,
            GreenScoreHistory.period_date >= start_date_only,
            GreenScoreHistory.period_date <= end_date_only
        )
    ).all()
    if green_scores:
        avg_score = round(sum(float(s) for s in green_scores) / len(green_scores), 2)
    else:
        current_gs = calculate_green_score(db, store_id)
        avg_score = current_gs["score"]

    summary_json = {
        "month_name": start_date.strftime("%B %Y"),
        "total_sales": total_sales,
        "total_transactions": total_txns,
        "waste_prevented_value": prevented_val,
        "actual_waste_value": actual_val,
        "avg_green_score": avg_score,
        "top_category": top_category,
        "top_selling_product": top_selling,
        "generated_at": datetime.utcnow().isoformat()
    }

    # Persist or Update MonthlyReport
    report_row = db.scalar(
        select(MonthlyReport).where(
            MonthlyReport.store_id == store_id,
            MonthlyReport.month_year == month_year
        )
    )
    if report_row is None:
        report_row = MonthlyReport(
            store_id=store_id,
            month_year=month_year,
            total_sales=total_sales,
            total_transactions=total_txns,
            waste_prevented_value=prevented_val,
            actual_waste_value=actual_val,
            avg_green_score=avg_score,
            top_category=top_category,
            top_selling_product=top_selling,
            summary_json=summary_json
        )
        db.add(report_row)
    else:
        report_row.total_sales = total_sales
        report_row.total_transactions = total_txns
        report_row.waste_prevented_value = prevented_val
        report_row.actual_waste_value = actual_val
        report_row.avg_green_score = avg_score
        report_row.top_category = top_category
        report_row.top_selling_product = top_selling
        report_row.summary_json = summary_json

    db.commit()
    db.refresh(report_row)
    return summary_json
