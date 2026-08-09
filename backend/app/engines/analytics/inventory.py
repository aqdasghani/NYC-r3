"""
Inventory analytics — ONE implementation for every stock metric.

Inputs are ``InventorySnapshot`` rows (on-hand batches, at-cost paise) plus
normalized ``SaleLine`` records for velocity. All thresholds are documented
constants; all ratios return ``None`` ("insufficient data") when the
denominator is zero/missing.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Iterable, Optional

from .metrics import InventorySnapshot, SaleLine, days_of_inventory, \
    inventory_turnover, sell_through_pct, velocity_per_day
from .normalize import safe_div, to_rupees

# documented thresholds (match prior engine conventions where they were sane)
STALE_DAYS = 60              # no sale in 60 days → dead stock
SLOW_DAYS = 30               # days of cover above which an item is slow-moving
FAST_UNITS_PER_DAY = 3.0     # velocity above which an item is fast-moving
STOCKOUT_DAYS = 7            # days of cover below which → stockout risk
EXCESS_DAYS = 60             # days of cover above which → excess stock
EXPIRY_WINDOW_DAYS = 15      # expiry risk window


def inventory_value_paise(snapshot: Iterable[InventorySnapshot]) -> int:
    """Σ quantity × at-cost purchase price (paise)."""
    return sum(int(i.quantity or 0) * int(i.purchase_price_paise or 0) for i in snapshot)


def sell_through(snapshot: Iterable[InventorySnapshot], sales: Iterable[SaleLine]) -> Optional[object]:
    """Total sell-through: units sold / (sold + on hand). None when empty."""
    sold = sum(int(l.quantity or 0) for l in sales)
    on_hand = sum(int(i.quantity or 0) for i in snapshot)
    return sell_through_pct(sold, on_hand)


def turnover(cogs_paise_value: int, avg_inventory_paise: Optional[int]) -> Optional[object]:
    """COGS / average inventory value. None when no inventory."""
    return inventory_turnover(cogs_paise_value, avg_inventory_paise)


def product_velocity(sales: Iterable[SaleLine], days: int = 14) -> dict:
    """Per-product units/day over the window. ``days`` <= 0 → None velocities."""
    units: dict = defaultdict(int)
    for l in sales:
        units[l.product_id] += int(l.quantity or 0)
    return {pid: velocity_per_day(u, days) for pid, u in units.items()}


def stock_status(snapshot: Iterable[InventorySnapshot],
                 sales: Iterable[SaleLine],
                 today: Optional[date] = None,
                 velocity_days: int = 14) -> list[dict]:
    """Per-product stock classification with evidence.

    Each item: ``{product_id, name, category, on_hand_units, value_paise,
    value, days_of_cover, status}`` where status is one of:
    DEAD | SLOW | NORMAL | FAST | STOCKOUT_RISK | EXCESS | EXPIRY_RISK.
    ``days_of_cover`` is None when velocity is zero (never a fabricated 0).
    """
    today = today or date.today()
    # group on-hand by product
    on_hand: dict = defaultdict(lambda: {"units": 0, "value": 0, "last_sale": None, "min_expiry": None})
    for i in snapshot:
        g = on_hand[i.product_id]
        g["units"] += int(i.quantity or 0)
        g["value"] += int(i.quantity or 0) * int(i.purchase_price_paise or 0)
        if i.last_sale_date and (g["last_sale"] is None or i.last_sale_date > g["last_sale"]):
            g["last_sale"] = i.last_sale_date
        if i.expiry_date and (g["min_expiry"] is None or i.expiry_date < g["min_expiry"]):
            g["min_expiry"] = i.expiry_date

    vel = product_velocity(sales, days=velocity_days)

    out = []
    for pid, g in on_hand.items():
        days_cover = days_of_inventory(g["units"], vel.get(pid))
        idle_days = (today - g["last_sale"]).days if g["last_sale"] else STALE_DAYS + 1
        expiry_days = (g["min_expiry"] - today).days if g["min_expiry"] else None

        status = "NORMAL"
        if g["units"] > 0 and idle_days > STALE_DAYS:
            status = "DEAD"
        elif days_cover is not None and days_cover > EXCESS_DAYS:
            status = "EXCESS"
        elif expiry_days is not None and 0 <= expiry_days <= EXPIRY_WINDOW_DAYS:
            status = "EXPIRY_RISK"
        elif days_cover is not None and days_cover <= STOCKOUT_DAYS:
            status = "STOCKOUT_RISK"
        elif days_cover is not None and days_cover > SLOW_DAYS:
            status = "SLOW"
        elif days_cover is not None and days_cover <= SLOW_DAYS:
            status = "FAST"

        out.append({
            "product_id": pid,
            "name": next((i.product_name for i in snapshot if i.product_id == pid), "Unknown"),
            "category": next((i.category for i in snapshot if i.product_id == pid), "Unknown"),
            "on_hand_units": g["units"],
            "value_paise": g["value"],
            "value": to_rupees(g["value"]),
            "days_of_cover": days_cover,
            "velocity_per_day": vel.get(pid),
            "idle_days": idle_days if g["last_sale"] else None,
            "expiry_days": expiry_days,
            "status": status,
        })
    return out


def summary(snapshot: Iterable[InventorySnapshot],
            sales: Iterable[SaleLine],
            today: Optional[date] = None,
            velocity_days: int = 14) -> dict:
    """Inventory dashboard summary (one source for every surface)."""
    snap = list(snapshot)
    sl = list(sales)
    value = inventory_value_paise(snap)
    statuses = stock_status(snap, sl, today=today, velocity_days=velocity_days)
    counts = defaultdict(int)
    for s in statuses:
        counts[s["status"]] += 1
    return {
        "inventory_value_paise": value,
        "inventory_value": to_rupees(value),
        "on_hand_units": sum(s["on_hand_units"] for s in statuses),
        "products_on_hand": len({s["product_id"] for s in statuses}),
        "sell_through_pct": sell_through(snap, sl),
        "stock_health": {
            "dead": counts["DEAD"],
            "excess": counts["EXCESS"],
            "expiry_risk": counts["EXPIRY_RISK"],
            "stockout_risk": counts["STOCKOUT_RISK"],
            "slow": counts["SLOW"],
            "fast": counts["FAST"],
            "normal": counts["NORMAL"],
        },
        "dead_stock_value_paise": sum(s["value_paise"] for s in statuses if s["status"] == "DEAD"),
        "dead_stock_value": to_rupees(sum(s["value_paise"] for s in statuses if s["status"] == "DEAD")),
        "statuses": statuses,
    }
