"""Real reports router — all data from database, no hardcoded values.

Revenue/units/profit/GST figures are computed by the CANONICAL analytics engine
(``app.engines.analytics``): money is normalized to integer paise at read time
(resolving the mixed rupees/paise columns) and reported here as Decimal rupees.
Transactions are distinct invoices; COGS uses batch purchase price with product
price as fallback; margins are None when costs are unknown (never a fabricated 0).
"""
from __future__ import annotations
from datetime import date, datetime, time, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from ..deps import get_current_user, get_db, get_owner_manager
from ..engines import analytics as canonical
from ..engines.analytics import metrics as _m
from ..models.database import InventoryBatch, Product, Sale, Supplier, User

# Reports are an OWNER/MANAGER surface — BILLER/WORKER never see financials.
router = APIRouter(prefix="/api/reports", tags=["reports"], dependencies=[Depends(get_owner_manager)])


def _store(user: User):
    if user.store_id is None:
        raise HTTPException(403, "User is not assigned to a store")
    return user.store_id


def _parse_date(value: str, label: str) -> date:
    """Parse YYYY-MM-DD, surfacing malformed input as a 422 (not a 500)."""
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise HTTPException(422, f"Invalid {label}: expected YYYY-MM-DD, got {value!r}")


def _date_range(from_date: str, to_date: str):
    """Parse date strings to datetime range."""
    start = datetime.combine(_parse_date(from_date, "from_date"), time(0, 0, 0)) if from_date else datetime.combine(date.today().replace(day=1), time(0, 0, 0))
    end = datetime.combine(_parse_date(to_date, "to_date"), time(23, 59, 59)) if to_date else datetime.combine(date.today(), time(23, 59, 59))
    return start, end


def _filter_lines(lines, category: str, product_id: str = ""):
    """Apply report filters to canonical lines (no DB round-trips)."""
    if product_id:
        import uuid
        try:
            pid = uuid.UUID(product_id)
            lines = [l for l in lines if l.product_id == pid]
        except ValueError:
            pass
    if category:
        lines = [l for l in lines if l.category == category]
    return lines


@router.get("/sales")
def sales_report(
    from_date: str = "", to_date: str = "",
    category: str = "", product_id: str = "",
    user: User = Depends(get_current_user), db=Depends(get_db)
):
    """Sales report with filters — net revenue, distinct-invoice transactions."""
    sid = _store(user)
    start, end = _date_range(from_date, to_date)
    lines = _filter_lines(canonical.load_sales(db, sid, start=start, end=end),
                          category, product_id)

    total_revenue = float(canonical.to_rupees(_m.net_revenue_taxable_paise(lines)))
    total_units = _m.units_sold(lines)
    total_gst = float(canonical.to_rupees(_m.gst_collected_paise(lines)))

    daily: dict = {}
    for l in lines:
        d = l.date.isoformat()
        if d not in daily:
            daily[d] = {"date": d, "revenue": 0.0, "units": 0, "gst": 0.0}
        daily[d]["revenue"] += float(canonical.to_rupees(_m.line_net_paise(l)))
        daily[d]["units"] += int(l.quantity or 0)
        daily[d]["gst"] += float(canonical.to_rupees(l.gst_paise))

    by_category = [
        {"category": c["category"], "revenue": float(c["revenue"]), "units": c["units"]}
        for c in canonical.chart.category_performance(lines)
    ]

    return {
        "summary": {
            "total_revenue": round(total_revenue, 2),
            "total_units": total_units,
            "total_gst": round(total_gst, 2),
            "total_transactions": _m.transactions(lines),
            "period_start": str(start.date()),
            "period_end": str(end.date()),
        },
        "daily": [dict(v, revenue=round(v["revenue"], 2), gst=round(v["gst"], 2)) for v in sorted(daily.values(), key=lambda x: x["date"])],
        "by_category": sorted(by_category, key=lambda x: -x["revenue"]),
    }


@router.get("/inventory")
def inventory_report(
    category: str = "",
    user: User = Depends(get_current_user), db=Depends(get_db)
):
    """Current inventory value by category — at-cost, paise-normalized."""
    sid = _store(user)
    snap = canonical.load_inventory(db, sid)      # on-hand batches only (qty>0)
    today = date.today()
    cat_map: dict = {}
    for b in snap:
        if category and b.category != category:
            continue
        cat = b.category or "Unknown"
        days_rem = (b.expiry_date - today).days if b.expiry_date else 10**9
        val = float(canonical.to_rupees(int(b.quantity) * int(b.purchase_price_paise or 0)))
        if cat not in cat_map:
            cat_map[cat] = {"category": cat, "total_value": 0.0, "units": 0, "near_expiry_value": 0.0, "expired_value": 0.0}
        cat_map[cat]["total_value"] += val
        cat_map[cat]["units"] += int(b.quantity or 0)
        if days_rem < 0:
            cat_map[cat]["expired_value"] += val
        elif days_rem <= 15:
            cat_map[cat]["near_expiry_value"] += val

    items = list(cat_map.values())
    for item in items:
        item["total_value"] = round(item["total_value"], 2)
        item["near_expiry_value"] = round(item["near_expiry_value"], 2)
        item["expired_value"] = round(item["expired_value"], 2)

    return {
        "total_inventory_value": round(sum(i["total_value"] for i in items), 2),
        "total_units": sum(i["units"] for i in items),
        "by_category": sorted(items, key=lambda x: -x["total_value"]),
    }


@router.get("/profit")
def profit_report(
    from_date: str = "", to_date: str = "",
    category: str = "",
    user: User = Depends(get_current_user), db=Depends(get_db)
):
    """Revenue and COGS to compute gross profit by period. COGS is batch-level
    (product price fallback); margin/profit are None when costs are unknown."""
    sid = _store(user)
    start, end = _date_range(from_date, to_date)
    lines = _filter_lines(canonical.load_sales(db, sid, start=start, end=end), category)

    daily: dict = {}
    for l in lines:
        d = l.date.isoformat()
        rev = float(canonical.to_rupees(_m.line_net_paise(l)))
        cogs = float(canonical.to_rupees(int(l.quantity or 0) * int(l.batch_purchase_paise or 0)))
        if d not in daily:
            daily[d] = {"date": d, "revenue": 0.0, "cogs": 0.0, "profit": 0.0}
        daily[d]["revenue"] += rev
        daily[d]["cogs"] += cogs
        daily[d]["profit"] += rev - cogs

    agg = canonical.aggregate_lines(lines)
    margin = agg["gross_margin_pct"]
    profit = agg["gross_profit"]

    return {
        "summary": {
            "total_revenue": round(float(agg["net_revenue"]), 2),
            "total_cogs": round(float(agg["cogs"]), 2),
            "total_profit": round(float(profit), 2) if profit is not None else None,
            "gross_margin_pct": round(float(margin), 1) if margin is not None else None,
        },
        "daily": [dict(v, revenue=round(v["revenue"],2), cogs=round(v["cogs"],2), profit=round(v["profit"],2)) for v in sorted(daily.values(), key=lambda x: x["date"])],
    }


@router.get("/gst")
def gst_report(
    from_date: str = "", to_date: str = "",
    user: User = Depends(get_current_user), db=Depends(get_db)
):
    """GST collected grouped by rate — taxable base and distinct invoices."""
    sid = _store(user)
    start, end = _date_range(from_date, to_date)
    lines = canonical.load_sales(db, sid, start=start, end=end)
    rate_map: dict = {}
    for l in lines:
        rate = float(l.gst_rate or 0)
        key = str(int(rate))
        if key not in rate_map:
            rate_map[key] = {"rate_pct": rate, "taxable_amount": 0.0,
                             "gst_collected": 0.0, "transactions": 0,
                             "_invoices": set()}
        rate_map[key]["taxable_amount"] += float(canonical.to_rupees(_m.line_net_paise(l)))
        rate_map[key]["gst_collected"] += float(canonical.to_rupees(l.gst_paise))
        if l.invoice_id is not None:
            rate_map[key]["_invoices"].add(l.invoice_id)
    items = []
    for key, v in rate_map.items():
        items.append({
            "rate_pct": v["rate_pct"],
            "taxable_amount": round(v["taxable_amount"], 2),
            "gst_collected": round(v["gst_collected"], 2),
            "transactions": len(v["_invoices"]),
        })
    return {
        "total_gst_collected": round(sum(i["gst_collected"] for i in items), 2),
        "by_rate": sorted(items, key=lambda x: x["rate_pct"]),
    }


@router.get("/expiry")
def expiry_report(user: User = Depends(get_current_user), db=Depends(get_db)):
    """Expiry risk report — all batches with remaining days and value at risk."""
    sid = _store(user)
    today = date.today()
    batches = db.scalars(select(InventoryBatch).where(InventoryBatch.store_id == sid, InventoryBatch.quantity > 0)).all()
    items = []
    for b in batches:
        prod = db.get(Product, b.product_id)
        days_rem = (b.expiry_date - today).days
        value = float(b.quantity) * float(b.purchase_price or 0)
        tier = "expired" if days_rem < 0 else "critical" if days_rem <= 3 else "warning" if days_rem <= 7 else "upcoming" if days_rem <= 15 else "safe"
        items.append({
            "batch_id": str(b.id),
            "product_name": prod.name if prod else "Unknown",
            "category": prod.category if prod else "Unknown",
            "batch_number": b.batch_number,
            "quantity": b.quantity,
            "expiry_date": str(b.expiry_date),
            "days_remaining": days_rem,
            "value_at_risk": round(value, 2),
            "tier": tier,
        })
    items.sort(key=lambda x: x["days_remaining"])
    return {
        "total_value_at_risk": round(sum(i["value_at_risk"] for i in items if i["tier"] in ["expired", "critical", "warning"]), 2),
        "expired_count": sum(1 for i in items if i["tier"] == "expired"),
        "critical_count": sum(1 for i in items if i["tier"] == "critical"),
        "items": items,
    }


@router.get("/waste")
def waste_report(
    from_date: str = "", to_date: str = "",
    user: User = Depends(get_current_user), db=Depends(get_db)
):
    """Waste prevented vs actual expired waste."""
    from ..engines.waste_engine import waste_prevented_series, waste_prevented_total
    sid = _store(user)
    start_d, end_d = _date_range(from_date, to_date)
    days = (end_d.date() - start_d.date()).days + 1
    series = waste_prevented_series(db, sid, days=days)
    total_prevented = waste_prevented_total(db, sid)
    today = date.today()
    expired_batches = db.scalars(select(InventoryBatch).where(
        InventoryBatch.store_id == sid,
        InventoryBatch.quantity > 0
    )).all()
    actual_waste = sum(
        float(b.quantity) * float(b.purchase_price or 0)
        for b in expired_batches
        if (b.expiry_date - today).days < 0
    )
    return {
        "total_prevented": round(total_prevented, 2),
        "actual_waste": round(actual_waste, 2),
        "series": series,
    }


@router.get("/products")
def products_report(
    from_date: str = "", to_date: str = "",
    category: str = "",
    user: User = Depends(get_current_user), db=Depends(get_db)
):
    """Top and bottom performing products by net revenue and units."""
    sid = _store(user)
    start, end = _date_range(from_date, to_date)
    lines = _filter_lines(canonical.load_sales(db, sid, start=start, end=end), category)
    prods = [
        {"product_id": str(p["product_id"]), "name": p["name"], "category": p["category"],
         "revenue": round(float(p["revenue"]), 2), "units": p["units"], "transactions": p["transactions"]}
        for p in canonical.chart.product_performance(lines)
    ]
    return {
        "top_10": prods[:10],
        "bottom_10": prods[-10:][::-1] if len(prods) > 10 else [],
        "total_products_sold": len(prods),
    }


@router.get("/suppliers")
def suppliers_report(
    from_date: str = "", to_date: str = "",
    user: User = Depends(get_current_user), db=Depends(get_db)
):
    """Supplier-wise purchase and stock report."""
    sid = _store(user)
    suppliers = db.scalars(select(Supplier).where(Supplier.store_id == sid)).all()
    result = []
    for sup in suppliers:
        products = db.scalars(select(Product).where(Product.store_id == sid, Product.supplier_id == sup.id)).all()
        total_stock_value = 0.0
        total_units = 0
        for prod in products:
            batches = db.scalars(select(InventoryBatch).where(InventoryBatch.product_id == prod.id, InventoryBatch.quantity > 0)).all()
            for b in batches:
                total_stock_value += float(b.quantity) * float(b.purchase_price or 0)
                total_units += b.quantity
        result.append({
            "supplier_id": str(sup.id),
            "name": sup.name,
            "contact": sup.contact_phone or "",
            "product_count": len(products),
            "total_stock_value": round(total_stock_value, 2),
            "total_units": total_units,
        })
    result.sort(key=lambda x: -x["total_stock_value"])
    return {"suppliers": result, "total_suppliers": len(result)}


@router.get("/procurement")
def procurement_report(user: User = Depends(get_current_user), db=Depends(get_db)):
    """Purchase order history. Currently returns empty (no PO table yet)."""
    return {"purchase_orders": [], "total_orders": 0, "total_value": 0.0, "note": "Purchase orders module not yet active."}
