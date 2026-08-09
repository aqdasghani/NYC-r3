"""
Canonical Analytics & Mathematical Engine — single source of truth.

Every surface (routers, reports, charts, AI, frontend) must consume these
functions instead of re-implementing metric math. Money is integer paise
internally and Decimal rupees at the boundary; every ratio returns ``None``
(= "insufficient data") rather than a fabricated number.

Public API (the mission-named functions):
    calculate_revenue, calculate_profit, calculate_margin, calculate_growth,
    calculate_aov, calculate_retention, calculate_inventory_turnover,
    calculate_sell_through, calculate_inventory_value, detect_anomalies,
    generate_forecast, plus lower-level pure metrics in ``metrics``.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Optional

from . import anomalies, chart, customer, forecast, inventory, metrics, normalize, timeseries
from .loader import load_inventory, load_returns, load_sales
from .metrics import (
    SaleLine, average_basket_size, average_order_value_paise, cogs_paise,
    contribution_margin_pct, customer_coverage, days_of_inventory,
    gross_margin_pct, gross_profit_paise, gross_revenue_paise,
    gst_collected_paise, inventory_turnover, net_revenue_invoiced_paise,
    net_revenue_taxable_paise, repeat_purchase_rate, revenue_growth_pct,
    sell_through_pct, transactions, units_sold, velocity_per_day,
)
from .normalize import detect_scale, normalize_unit, safe_div, scale_paise, to_rupees
from .timeseries import Period, aggregate_lines, comparable_periods, compare_periods, \
    daily_series, trend_direction


# ──────────────────────────────── revenue / profit ──────────────────────────

def calculate_revenue(db, store_id, start: Optional[datetime] = None,
                      end: Optional[datetime] = None) -> dict:
    """Full revenue summary for a window (gross/net/discounts/gst/profit/margin/
    aov/basket/transactions) — the block every surface shares."""
    lines = load_sales(db, store_id, start, end)
    return aggregate_lines(lines)


def calculate_profit(db, store_id, start: Optional[datetime] = None,
                     end: Optional[datetime] = None) -> dict:
    """Gross profit & margin for a window. profit/margin are None when COGS or
    revenue is unknown — never fabricated zeros."""
    lines = load_sales(db, store_id, start, end)
    gp = gross_profit_paise(lines)
    return {
        "net_revenue_paise": net_revenue_taxable_paise(lines),
        "net_revenue": to_rupees(net_revenue_taxable_paise(lines)),
        "cogs_paise": cogs_paise(lines),
        "cogs": to_rupees(cogs_paise(lines)),
        "gross_profit_paise": gp,
        "gross_profit": to_rupees(gp) if gp is not None else None,
        "gross_margin_pct": gross_margin_pct(lines),
        "cogs_coverage": metrics.cogs_coverage(lines),
    }


def calculate_margin(db, store_id, start: Optional[datetime] = None,
                     end: Optional[datetime] = None) -> Optional[Any]:
    """Gross margin % for a window (Decimal or None)."""
    return gross_margin_pct(load_sales(db, store_id, start, end))


def calculate_aov(db, store_id, start: Optional[datetime] = None,
                  end: Optional[datetime] = None) -> Optional[dict]:
    """Average order value for a window (paise + rupees), None-shaped on no data."""
    lines = load_sales(db, store_id, start, end)
    aov = average_order_value_paise(lines)
    return {
        "aov_paise": aov,
        "aov": to_rupees(aov) if aov is not None else None,
        "transactions": transactions(lines),
        "insufficient": aov is None,
    }


# ──────────────────────────────── growth / trends ───────────────────────────

def calculate_growth(db, store_id, kind: str = "week",
                     today: Optional[date] = None, now: Optional[datetime] = None) -> dict:
    """Equal-length period comparison with honest growth (None on zero baseline)."""
    cur, prev = comparable_periods(kind, today, now)
    lines = load_sales(db, store_id)
    return compare_periods(cur, prev, lines)


def calculate_trend(db, store_id, days: int = 30, end_date: Optional[date] = None) -> dict:
    """Daily series + directional trend for the last ``days`` days."""
    lines = load_sales(db, store_id)
    series = daily_series(lines, days, end_date)
    direction = trend_direction([float(p["revenue_paise"]) for p in series])
    return {"series": series, "trend": direction}


# ──────────────────────────────── customers ─────────────────────────────────

def calculate_retention(db, store_id, start: Optional[datetime] = None,
                        end: Optional[datetime] = None) -> dict:
    """Customer summary; every metric None (= insufficient data) when gated."""
    lines = load_sales(db, store_id, start, end)
    return customer.summarize_customers(lines)


# ──────────────────────────────── inventory ─────────────────────────────────

def calculate_inventory_value(db, store_id) -> dict:
    return {
        "inventory_value_paise": inventory.inventory_value_paise(load_inventory(db, store_id)),
        "inventory_value": to_rupees(inventory.inventory_value_paise(load_inventory(db, store_id))),
    }


def calculate_inventory_turnover(db, store_id, start: Optional[datetime] = None,
                                 end: Optional[datetime] = None,
                                 avg_inventory_paise: Optional[int] = None) -> Optional[Any]:
    """COGS / average inventory value. avg_inventory defaults to current value;
    None when there is no inventory."""
    if avg_inventory_paise is None:
        avg_inventory_paise = inventory.inventory_value_paise(load_inventory(db, store_id))
    lines = load_sales(db, store_id, start, end)
    return inventory_turnover(cogs_paise(lines), avg_inventory_paise)


def calculate_sell_through(db, store_id, start: Optional[datetime] = None,
                           end: Optional[datetime] = None) -> Optional[Any]:
    """Units sold / (sold + on hand) for the window."""
    return inventory.sell_through(load_inventory(db, store_id), load_sales(db, store_id, start, end))


def calculate_inventory_status(db, store_id) -> dict:
    """Full stock-health summary (dead/slow/fast/stockout/expiry/excess)."""
    return inventory.summary(load_inventory(db, store_id), load_sales(db, store_id))


# ──────────────────────────────── anomalies / forecast ──────────────────────

def detect_anomalies(db, store_id, days: int = 30,
                     today: Optional[date] = None) -> dict:
    """Seasonality-aware anomalies on the last ``days`` days."""
    lines = load_sales(db, store_id)
    series = daily_series(lines, days, today)
    rev = anomalies.detect_daily_anomalies(series, today)
    disc = anomalies.discount_share_anomaly(lines)
    return {
        "window_days": days,
        "daily_anomalies": rev,
        "discount_anomaly": disc,
        "has_enough_data": bool(rev) or bool(disc),
    }


def generate_forecast(db, store_id, days: int = 60, horizon: int = 7,
                      end_date: Optional[date] = None) -> dict:
    """Data-quality-gated unit forecast. Always labeled ``kind``."""
    lines = load_sales(db, store_id)
    series = daily_series(lines, days, end_date)
    return forecast.generate_forecast([float(p["units"]) for p in series], horizon=horizon)


# ──────────────────────────────── chart payloads ────────────────────────────

def chart_data(db, store_id, start: Optional[datetime] = None,
               end: Optional[datetime] = None) -> dict:
    """Chart-ready payloads (categories, products, peak hours, weekday)."""
    lines = load_sales(db, store_id, start, end)
    return {
        "by_category": chart.category_performance(lines),
        "by_product": chart.product_performance(lines),
        "peak_hours": chart.peak_hours(lines),
        "weekday": chart.weekday_breakdown(lines),
    }
