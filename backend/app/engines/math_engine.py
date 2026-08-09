"""
Math Engine — Pure Python, Zero LLM.

IRON LAW: Every number returned by this module comes from the database.
No estimation, no interpolation without a stated formula, no invention.

Functions in this module are the ONLY source of numerical truth for the
Data Analyst AI and Behavioral Retail AI. AI receives the output of these
functions as structured context and interprets it. AI does NOT generate numbers.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from itertools import combinations
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models.database import (
    Invoice, InvoiceItem,
    InventoryBatch, Product,
)
# Money is normalized by the CANONICAL analytics layer (mixed rupees/paise
# columns resolve at read time). Every revenue/profit figure below delegates to
# it so the AI never receives an inflated or mixed-scale number.
from .analytics import aggregate_lines as _canon_aggregate
from .analytics import load_sales as _canon_load_sales
from .analytics import metrics as _canon_metrics
from .analytics import to_rupees as _to_rupees
from .analytics.loader import batch_ref_map, load_inventory as _canon_load_inventory, \
    normalize_sale_line, product_ref_map


# ─────────────────────────────── helpers ─────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _data_quality(data_points: int, history_days: int) -> str:
    """Transparent data-quality tier so AI never overstates confidence."""
    if data_points < 10 or history_days < 3:
        return "LOW"
    if data_points < 100 or history_days < 14:
        return "MEDIUM"
    return "HIGH"


def _trend_label(pct_change: float) -> str:
    """Convert a numeric % change into a human-readable trend label."""
    if pct_change > 50:
        return "SPIKE"
    if pct_change > 15:
        return "INCREASING"
    if pct_change < -50:
        return "DROP"
    if pct_change < -15:
        return "DECREASING"
    return "STABLE"


# ─────────────────────────────── pure math utilities ─────────────────────────

def calculateSubtotal(items: list[tuple[float, int]]) -> float:
    return round(sum(price * qty for price, qty in items), 2)

def calculateDiscount(subtotal: float, discount_pct: float) -> float:
    return round(subtotal * (discount_pct / 100), 2)

def calculateTaxableAmount(subtotal: float, discount: float) -> float:
    return round(subtotal - discount, 2)

def calculateGST(taxable_amount: float, gst_pct: float = 18.0) -> float:
    return round(taxable_amount * (gst_pct / 100), 2)

def calculateRevenue(taxable_amount: float, gst: float) -> float:
    return round(taxable_amount + gst, 2)

def calculateCOGS(items: list[tuple[float, int]]) -> float:
    return round(sum(pp * qty for pp, qty in items), 2)

def calculateGrossProfit(revenue: float, cogs: float) -> float:
    return round(revenue - cogs, 2)

def calculateMargin(gross_profit: float, revenue: float) -> float:
    if revenue <= 0:
        return 0.0
    return round((gross_profit / revenue) * 100, 2)

def calculateAOV(total_revenue: float, num_orders: int) -> float:
    if num_orders <= 0:
        return 0.0
    return round(total_revenue / num_orders, 2)

def calculateSalesVelocity(total_units: int, days: int) -> float:
    if days <= 0:
        return 0.0
    return round(total_units / days, 2)

def calculateStockCoverage(current_stock: int, sales_velocity: float) -> float | None:
    if sales_velocity <= 0:
        return None
    return round(current_stock / sales_velocity, 1)

def calculateReorderPoint(sales_velocity: float, lead_time_days: int = 7, safety_stock: int = 5) -> int:
    return int(round(sales_velocity * lead_time_days)) + safety_stock

def calculateExpiryRisk(expiry_date: date | None) -> int | None:
    if not expiry_date:
        return None
    return (expiry_date - date.today()).days

def calculateDemandTrend(current_period_units: int, prev_period_units: int) -> float:
    if prev_period_units <= 0:
        return 100.0 if current_period_units > 0 else 0.0
    return round((current_period_units - prev_period_units) / prev_period_units * 100, 2)

def calculateInventoryValue(items: list[tuple[float, int]]) -> float:
    return round(sum(pp * qty for pp, qty in items), 2)

def calculateWaste(waste_items: list[tuple[float, int]]) -> float:
    return round(sum(pp * qty for pp, qty in waste_items), 2)

def calculateWastePrevented(prevented_items: list[tuple[float, int]]) -> float:
    return round(sum(pp * qty for pp, qty in prevented_items), 2)

# ─────────────────────────────── product analytics ───────────────────────────

def product_analytics(db: Session, store_id: Any, product_id: Any, days: int = 30) -> dict:
    """
    Compute structured metrics for a single product.

    Returns a dict that is safe to pass directly to the AI interpreter.
    All numbers come from DB aggregation or arithmetic on DB values.
    """
    now = _utcnow()
    start_30 = now - timedelta(days=30)
    start_7 = now - timedelta(days=7)
    start_prev7 = now - timedelta(days=14)

    # Pull recent sales once (with invoice context, normalized to paise)
    rows = db.execute(
        select(InvoiceItem, Invoice.created_at, Invoice.id, Invoice.customer_id, Invoice.pos_session_id)
        .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
        .where(Invoice.store_id == store_id, InvoiceItem.product_id == product_id, Invoice.created_at >= start_30)
    ).all()
    products_map = product_ref_map(db, store_id)
    batches_map = batch_ref_map(db, store_id)
    sales_30d = [normalize_sale_line(it, ts, iid, cid, psid, products_map, batches_map)
                 for it, ts, iid, cid, psid in rows]
    sales_7d = [s for s in sales_30d if s.ts is not None and s.ts >= start_7]
    sales_prev7 = [s for s in sales_30d if s.ts is not None and start_prev7 <= s.ts < start_7]

    units_30d = sum(s.quantity for s in sales_30d)
    units_7d = sum(s.quantity for s in sales_7d)
    units_prev7 = sum(s.quantity for s in sales_prev7)
    revenue_30d = float(_to_rupees(_canon_metrics.net_revenue_taxable_paise(sales_30d)))

    avg_daily_30d = round(units_30d / 30, 2)
    avg_daily_7d = round(units_7d / 7, 2)

    # Trend: compare last 7d vs prior 7d (normalized per day)
    trend_pct = 0.0
    if units_prev7 > 0:
        trend_pct = round((units_7d - units_prev7) / units_prev7 * 100, 1)
    elif units_7d > 0:
        trend_pct = 100.0  # new sales where there were none

    # Product info
    product = db.get(Product, product_id)
    batches = db.scalars(
        select(InventoryBatch).where(
            InventoryBatch.store_id == store_id,
            InventoryBatch.product_id == product_id,
            InventoryBatch.quantity > 0,
        )
    ).all()
    total_stock = sum(b.quantity for b in batches)
    nearest_expiry = min((b.expiry_date for b in batches), default=None)
    expiry_days = (nearest_expiry - date.today()).days if nearest_expiry else None

    purchase_price = float(product.purchase_price or 0) if product else 0
    selling_price = float(product.selling_price or 0) if product else 0
    margin_pct = round((selling_price - purchase_price) / selling_price * 100, 1) if selling_price > 0 else 0.0

    stock_coverage_days = round(total_stock / avg_daily_30d, 1) if avg_daily_30d > 0 else None

    # Classification
    classification = _classify_product(
        avg_daily=avg_daily_30d,
        trend_pct=trend_pct,
        stock_coverage_days=stock_coverage_days,
        margin_pct=margin_pct,
        expiry_days=expiry_days,
        data_points=len(sales_30d),
    )

    return {
        "product_id": str(product_id),
        "product_name": product.name if product else "Unknown",
        "category": product.category if product else None,
        "barcode": product.barcode if product else None,
        "sales_7d": units_7d,
        "sales_30d": units_30d,
        "revenue_30d": round(revenue_30d, 2),
        "avg_daily_sales_30d": avg_daily_30d,
        "avg_daily_sales_7d": avg_daily_7d,
        "trend_pct": trend_pct,
        "trend_label": _trend_label(trend_pct),
        "current_stock": total_stock,
        "stock_coverage_days": stock_coverage_days,
        "nearest_expiry_date": nearest_expiry.isoformat() if nearest_expiry else None,
        "expiry_days": expiry_days,
        "purchase_price": purchase_price,
        "selling_price": selling_price,
        "margin_pct": margin_pct,
        "gross_profit_30d": (
            float(_to_rupees(gp)) if (gp := _canon_metrics.gross_profit_paise(sales_30d)) is not None else None
        ),
        "classification": classification,
        "data_points": len(sales_30d),
        "data_quality": _data_quality(len(sales_30d), 30),
        "history_days_available": min(30, (now - sales_30d[0].ts).days + 1) if sales_30d else 0,
    }


def _classify_product(
    avg_daily: float,
    trend_pct: float,
    stock_coverage_days: float | None,
    margin_pct: float,
    expiry_days: int | None,
    data_points: int,
) -> str:
    """
    Rule-based product classification.
    """
    if data_points < 3:
        return "UNKNOWN"
    if expiry_days is not None and expiry_days <= 4:
        return "RISKY"
    if avg_daily == 0:
        return "DEAD"
    if avg_daily < 0.5:
        return "LOW DEMAND"
    if trend_pct <= -20 and avg_daily < 2:
        return "DECLINING"
    if trend_pct >= 15 and avg_daily >= 2:
        return "HIGH DEMAND"
    if avg_daily >= 5:
        return "HIGH DEMAND"
    return "MEDIUM DEMAND"


# ─────────────────────────────── daily & monthly trend engines ───────────────

def daily_sales_engine(db: Session, store_id: Any) -> dict:
    now = _utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    d7_start = now - timedelta(days=7)
    d30_start = now - timedelta(days=30)
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month_start = (this_month_start - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def _block(start: datetime, end: datetime) -> dict:
        """One period's revenue/units/orders/profit/aov from the canonical
        engine — net revenue (taxable), distinct-invoice transactions, batch-
        level COGS. profit/aov are None when unknown (never fabricated)."""
        agg = _canon_aggregate(_canon_load_sales(db, store_id, start=start, end=end))
        aov = agg["aov"]
        return {
            "revenue": round(float(agg["net_revenue"]), 2),
            "units": int(agg["units"]),
            "orders": int(agg["transactions"]),
            "profit": round(float(agg["gross_profit"]), 2) if agg["gross_profit"] is not None else None,
            "aov": round(float(aov), 2) if aov is not None else None,
        }

    return {
        "today": _block(today_start, now),
        "yesterday": _block(yesterday_start, today_start),
        "days_7": _block(d7_start, now),
        "days_30": _block(d30_start, now),
        "this_month": _block(this_month_start, now),
        "previous_month": _block(prev_month_start, this_month_start),
    }

def monthly_trend_engine(db: Session, store_id: Any) -> dict:
    now = _utcnow()
    periods = {
        "days_7": 7,
        "days_30": 30,
        "days_90": 90,
        "months_6": 180,
        "months_12": 365
    }

    def _trend_cls(pct: float | None) -> str:
        if pct is None:
            return "INSUFFICIENT"  # no baseline — never a fabricated STABLE
        if pct > 10: return "RISING"
        if pct < -10: return "DECLINING"
        if abs(pct) > 50: return "VOLATILE"
        return "STABLE"

    def _growth(cur_paise, prev_paise) -> float | None:
        g = _canon_metrics.revenue_growth_pct(cur_paise, prev_paise)
        return float(g) if g is not None else None

    results = {}
    for label, days in periods.items():
        curr_start = now - timedelta(days=days)
        prev_start = now - timedelta(days=days * 2)
        # Equal-length rolling windows, canonical money (paise-normalized).
        cur = _canon_aggregate(_canon_load_sales(db, store_id, start=curr_start, end=now))
        prev = _canon_aggregate(_canon_load_sales(db, store_id, start=prev_start, end=curr_start))
        sg = _growth(cur["net_revenue_paise"], prev["net_revenue_paise"])
        pg = _growth(cur["gross_profit_paise"], prev["gross_profit_paise"])

        results[label] = {
            "sales_growth_pct": sg,
            "profit_growth_pct": pg,
            "sales_trend": _trend_cls(sg),
            "profit_trend": _trend_cls(pg),
        }
    return results

# ─────────────────────────────── store-wide analytics ────────────────────────

def store_analytics(db: Session, store_id: Any, days: int = 30) -> dict:
    """
    Store-level aggregated metrics. Revenue/transactions/basket and growth come
    from the canonical engine (paise-normalized, distinct invoices); inventory
    values are the canonical at-cost snapshot. All numbers from DB.
    """
    now = _utcnow()
    start = now - timedelta(days=days)
    start_prev = now - timedelta(days=days * 2)

    lines = _canon_load_sales(db, store_id, start=start, end=now)
    prev_lines = _canon_load_sales(db, store_id, start=start_prev, end=start)
    agg = _canon_aggregate(lines)
    prev_agg = _canon_aggregate(prev_lines)

    growth = _canon_metrics.revenue_growth_pct(agg["net_revenue_paise"], prev_agg["net_revenue_paise"])

    products = db.scalars(select(Product).where(Product.store_id == store_id)).all()
    snap = _canon_load_inventory(db, store_id)
    inventory_value = float(_to_rupees(sum(s.quantity * s.purchase_price_paise for s in snap)))
    today = date.today()
    at_risk_value = sum(
        float(_to_rupees(s.quantity * s.purchase_price_paise))
        for s in snap
        if s.expiry_date and 0 <= (s.expiry_date - today).days <= 15
    )

    aov = agg["aov"]
    return {
        "store_id": str(store_id),
        "period_days": days,
        "total_revenue": round(float(agg["net_revenue"]), 2),
        "prev_period_revenue": round(float(prev_agg["net_revenue"]), 2),
        "revenue_growth_pct": float(growth) if growth is not None else None,
        "revenue_trend": _trend_label(float(growth)) if growth is not None else "INSUFFICIENT_DATA",
        "total_units_sold": int(agg["units"]),
        "total_transactions": int(agg["transactions"]),
        "avg_basket_value": round(float(aov), 2) if aov is not None else 0,
        "product_count": len(products),
        "total_inventory_value": round(inventory_value, 2),
        "at_risk_value": round(at_risk_value, 2),
        "data_points": len(lines),
        "data_quality": _data_quality(len(lines), days),
    }


# ─────────────────────────────── hourly pattern ──────────────────────────────

def hourly_pattern(db: Session, store_id: Any, product_id: Any | None = None, days: int = 30) -> list[dict]:
    """
    Returns 24 buckets (hour 0–23) with revenue, units, and order count.
    Revenue is the canonical net (taxable) figure in rupees — the same number
    the reports show, never a 100× paise leak. Orders = distinct invoices.
    Based entirely on InvoiceItem records — no inference.
    """
    now = _utcnow()
    start = now - timedelta(days=days)

    q = (
        select(InvoiceItem, Invoice.created_at, Invoice.id, Invoice.customer_id, Invoice.pos_session_id)
        .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
        .where(Invoice.store_id == store_id, Invoice.created_at >= start)
    )
    if product_id:
        q = q.where(InvoiceItem.product_id == product_id)
    rows = db.execute(q).all()
    products_map = product_ref_map(db, store_id)
    batches_map = batch_ref_map(db, store_id)
    lines = [normalize_sale_line(it, ts, iid, cid, psid, products_map, batches_map)
             for it, ts, iid, cid, psid in rows]

    buckets = [{"hour": h, "label": f"{h:02d}:00", "revenue_paise": 0, "units": 0, "_invoices": set()}
               for h in range(24)]
    for l in lines:
        if l.ts is None:
            continue
        h = l.ts.hour
        b = buckets[h]
        b["revenue_paise"] += _canon_metrics.line_net_paise(l)
        b["units"] += l.quantity
        if l.invoice_id is not None:
            b["_invoices"].add(l.invoice_id)

    out = []
    for b in buckets:
        b["revenue"] = round(float(_to_rupees(b.pop("revenue_paise"))), 2)
        b["orders"] = len(b.pop("_invoices"))
        b["is_peak"] = False
        out.append(b)

    max_rev = max(b["revenue"] for b in out)
    if max_rev > 0:
        peak_hour = next(b["hour"] for b in out if b["revenue"] == max_rev)
        for b in out:
            b["is_peak"] = b["hour"] == peak_hour
    return out

def time_demand_engine(db: Session, store_id: Any, product_id: Any | None = None, days: int = 30) -> list[str]:
    """Phase 19: WHAT sells WHEN. Groups peak sales hours into readable blocks."""
    buckets = hourly_pattern(db, store_id, product_id, days)
    if not buckets:
        return []
    
    total_units = sum(b["units"] for b in buckets)
    if total_units == 0:
        return []
        
    avg_units = total_units / 24
    
    peak_hours = [b["hour"] for b in buckets if b["units"] > avg_units * 1.5]
    if not peak_hours:
        sorted_buckets = sorted(buckets, key=lambda x: x["units"], reverse=True)
        peak_hours = sorted([b["hour"] for b in sorted_buckets[:3] if b["units"] > 0])
        
    if not peak_hours:
        return []
        
    blocks = []
    current_block = [peak_hours[0]]
    for h in peak_hours[1:]:
        if h == current_block[-1] + 1:
            current_block.append(h)
        else:
            blocks.append(current_block)
            current_block = [h]
    blocks.append(current_block)
    
    results = []
    for block in blocks:
        start = block[0]
        end = block[-1] + 1
        results.append(f"{start:02d}:00-{end:02d}:00")
        
    return results


# ─────────────────────────────── weekday pattern ─────────────────────────────

def weekday_pattern(db: Session, store_id: Any, product_id: Any | None = None, days: int = 60) -> list[dict]:
    """
    Returns 7 buckets (Mon–Sun) with avg daily revenue and units.
    Revenue is the canonical net (taxable) figure in rupees. Uses at least 4
    weeks of data for reliability; flags LOW quality if fewer.
    """
    DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    now = _utcnow()
    start = now - timedelta(days=days)

    q = (
        select(InvoiceItem, Invoice.created_at, Invoice.id, Invoice.customer_id, Invoice.pos_session_id)
        .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
        .where(Invoice.store_id == store_id, Invoice.created_at >= start)
    )
    if product_id:
        q = q.where(InvoiceItem.product_id == product_id)
    rows = db.execute(q).all()
    products_map = product_ref_map(db, store_id)
    batches_map = batch_ref_map(db, store_id)
    lines = [normalize_sale_line(it, ts, iid, cid, psid, products_map, batches_map)
             for it, ts, iid, cid, psid in rows]

    buckets: dict[int, dict] = {i: {"weekday": DAYS[i], "weekday_index": i, "revenue_paise": 0, "units": 0, "count_days": 0} for i in range(7)}
    day_seen: dict[int, set] = defaultdict(set)
    for l in lines:
        if l.ts is None:
            continue
        wd = l.ts.weekday()  # 0=Mon
        buckets[wd]["revenue_paise"] += _canon_metrics.line_net_paise(l)
        buckets[wd]["units"] += l.quantity
        day_seen[wd].add(l.ts.date())

    for i, b in buckets.items():
        n_days = max(1, len(day_seen[i]))
        b["revenue"] = round(float(_to_rupees(b["revenue_paise"])), 2)
        b["avg_daily_revenue"] = round(b["revenue"] / n_days, 2)
        b["avg_daily_units"] = round(b["units"] / n_days, 2)
        b["count_days"] = n_days
        b["data_quality"] = _data_quality(b["units"], n_days)

    results = list(buckets.values())
    max_rev = max(b["avg_daily_revenue"] for b in results)

    valid_days = [b["avg_daily_revenue"] for b in results if b["count_days"] > 0]
    min_rev = min(valid_days) if valid_days else 0

    for b in results:
        b.pop("revenue_paise", None)
        b["is_best_day"] = (b["avg_daily_revenue"] == max_rev and max_rev > 0)
        b["is_worst_day"] = (b["avg_daily_revenue"] == min_rev and b["count_days"] > 0)
    return results


# ─────────────────────────────── basket analysis ─────────────────────────────

def basket_analysis(db: Session, store_id: Any, days: int = 60, min_support: float = 0.02) -> list[dict]:
    """
    Market basket analysis using Apriori-style frequent itemset counting.

    mode: approximate (support threshold filters low-frequency pairs)
    ε: support threshold = min_support (default 2% of baskets)
    Caller acceptance: insight is labeled with support/confidence/lift — no false certainty.

    Returns association rules sorted by lift (desc).
    Only pairs with lift > 1.0 are returned (genuine positive association).
    """
    now = _utcnow()
    start = now - timedelta(days=days)

    sales = db.scalars(
        select(InvoiceItem).join(Invoice).where(Invoice.store_id == store_id, Invoice.created_at >= start)
    ).all()

    if not sales:
        return []

    # Group by checkout: use pos_session_id when a POS session exists, otherwise
    # each Invoice is its own basket (one invoice = one checkout).
    baskets: dict[Any, set] = defaultdict(set)
    for s in sales:
        key = s.invoice.pos_session_id or s.invoice_id
        baskets[key].add(s.product_id)

    n_baskets = len(baskets)
    if n_baskets < 10:
        return []  # Insufficient data for reliable association

    basket_list = list(baskets.values())
    product_freq: Counter = Counter()
    pair_freq: Counter = Counter()

    for basket in basket_list:
        for pid in basket:
            product_freq[pid] += 1
        for a, b in combinations(sorted(basket), 2):
            pair_freq[(a, b)] += 1

    # Build association rules
    rules = []
    min_count = max(3, int(min_support * n_baskets))

    for (a, b), count in pair_freq.items():
        if count < min_count:
            continue
        support = round(count / n_baskets, 4)
        conf_a_to_b = round(count / product_freq[a], 4) if product_freq[a] > 0 else 0
        conf_b_to_a = round(count / product_freq[b], 4) if product_freq[b] > 0 else 0
        freq_a = product_freq[a] / n_baskets
        freq_b = product_freq[b] / n_baskets
        lift = round(support / (freq_a * freq_b), 3) if freq_a * freq_b > 0 else 0

        if lift <= 1.0:
            continue  # No positive association

        prod_a = db.get(Product, a)
        prod_b = db.get(Product, b)
        if not prod_a or not prod_b:
            continue

        rules.append({
            "product_a_id": str(a),
            "product_a_name": prod_a.name,
            "product_b_id": str(b),
            "product_b_name": prod_b.name,
            "co_purchases": count,
            "support": support,
            "confidence_a_to_b": conf_a_to_b,
            "confidence_b_to_a": conf_b_to_a,
            "lift": lift,
            "n_baskets_analyzed": n_baskets,
            "data_quality": _data_quality(count, days),
        })

    return sorted(rules, key=lambda r: r["lift"], reverse=True)[:20]


# ─────────────────────────────── trend detection ─────────────────────────────

def trend_detection(db: Session, store_id: Any, product_id: Any, days: int = 30) -> dict:
    """
    Compares last 7 days vs prior 7 days for the product.
    Returns trend with statistical basis, not guess.
    """
    now = _utcnow()
    last7_start = now - timedelta(days=7)
    prev7_start = now - timedelta(days=14)

    products_map = product_ref_map(db, store_id)
    batches_map = batch_ref_map(db, store_id)

    def _lines(start: datetime, end: datetime | None) -> list:
        q = (
            select(InvoiceItem, Invoice.created_at, Invoice.id, Invoice.customer_id, Invoice.pos_session_id)
            .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
            .where(Invoice.store_id == store_id, InvoiceItem.product_id == product_id, Invoice.created_at >= start)
        )
        if end is not None:
            q = q.where(Invoice.created_at < end)
        rows = db.execute(q).all()
        return [normalize_sale_line(it, ts, iid, cid, psid, products_map, batches_map)
                for it, ts, iid, cid, psid in rows]

    last7 = _lines(last7_start, None)
    prev7 = _lines(prev7_start, last7_start)

    units_last = sum(l.quantity for l in last7)
    units_prev = sum(l.quantity for l in prev7)
    rev_last = float(_to_rupees(_canon_metrics.net_revenue_taxable_paise(last7)))
    rev_prev = float(_to_rupees(_canon_metrics.net_revenue_taxable_paise(prev7)))

    pct_change = round((units_last - units_prev) / units_prev * 100, 1) if units_prev > 0 else (100.0 if units_last > 0 else 0.0)
    rev_pct = round((rev_last - rev_prev) / rev_prev * 100, 1) if rev_prev > 0 else (100.0 if rev_last > 0 else 0.0)

    data_points = len(last7) + len(prev7)
    sufficient = data_points >= 5 and units_prev > 0

    return {
        "product_id": str(product_id),
        "period": "last7d_vs_prior7d",
        "units_last_7d": units_last,
        "units_prior_7d": units_prev,
        "revenue_last_7d": round(rev_last, 2),
        "revenue_prior_7d": round(rev_prev, 2),
        "units_pct_change": pct_change,
        "revenue_pct_change": rev_pct,
        "trend_label": _trend_label(pct_change) if sufficient else "INSUFFICIENT_DATA",
        "sufficient_data": sufficient,
        "data_quality": _data_quality(data_points, 14),
        "data_points": data_points,
    }


# ─────────────────────────────── price response ──────────────────────────────

def price_response(db: Session, store_id: Any, product_id: Any) -> dict | None:
    """
    Observed price-demand relationship.
    CAUTION: This is correlation only. Do NOT label as causal elasticity.
    Returns None if insufficient price variation exists.
    """
    sales = db.scalars(
        select(InvoiceItem).join(Invoice).where(Invoice.store_id == store_id, InvoiceItem.product_id == product_id,
                           Invoice.created_at >= _utcnow() - timedelta(days=90))
    ).all()

    if len(sales) < 20:
        return None

    # Group by price point
    by_price: dict[float, list[int]] = defaultdict(list)
    for s in sales:
        price = round(float(s.unit_price or 0), 1)
        if price > 0:
            by_price[price].append(s.quantity)

    if len(by_price) < 2:
        return None  # No price variation — cannot analyze

    price_points = []
    for price, quantities in sorted(by_price.items()):
        n_days = len(quantities)
        price_points.append({
            "price": price,
            "total_units": sum(quantities),
            "avg_units_per_occurrence": round(sum(quantities) / n_days, 2),
            "occurrences": n_days,
        })

    return {
        "product_id": str(product_id),
        "price_points": price_points,
        "note": "Observed price-response pattern only. Not causal elasticity.",
        "data_quality": _data_quality(len(sales), 90),
        "data_points": len(sales),
    }


# ─────────────────────────────── time heatmap ────────────────────────────────

def time_product_heatmap(db: Session, store_id: Any, days: int = 30) -> dict:
    """
    Returns a TIME × PRODUCT heatmap of sales intensity.
    Each cell = units sold in that hour bucket for that product.
    Only top 10 products by volume are included for readability.
    """
    now = _utcnow()
    start = now - timedelta(days=days)
    sales = db.scalars(select(InvoiceItem).join(Invoice).where(Invoice.store_id == store_id, Invoice.created_at >= start)).all()

    # Find top products by volume
    product_volume: Counter = Counter()
    for s in sales:
        product_volume[s.product_id] += s.quantity

    top_products = [pid for pid, _ in product_volume.most_common(10)]
    if not top_products:
        return {"products": [], "hours": list(range(24)), "cells": [], "data_quality": "LOW"}

    # Build heatmap
    cells: dict[tuple, int] = defaultdict(int)
    for s in sales:
        if s.product_id in top_products:
            cells[(s.product_id, s.invoice.created_at.hour)] += s.quantity

    product_names: dict = {}
    for pid in top_products:
        p = db.get(Product, pid)
        product_names[str(pid)] = p.name if p else str(pid)

    heatmap_rows = []
    for pid in top_products:
        row = {
            "product_id": str(pid),
            "product_name": product_names[str(pid)],
            "hours": [cells.get((pid, h), 0) for h in range(24)],
            "total": product_volume[pid],
        }
        heatmap_rows.append(row)

    return {
        "products": heatmap_rows,
        "hours": list(range(24)),
        "hour_labels": [f"{h:02d}:00" for h in range(24)],
        "data_quality": _data_quality(len(sales), days),
        "days_analyzed": days,
    }
