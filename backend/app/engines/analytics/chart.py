"""
Chart-ready aggregations — correct labels, date ranges, units and shares.

Every payload is in a stable shape: money as ``revenue_paise`` (int) plus
``revenue`` (Decimal rupees) so charts never guess a scale, and percentages are
computed here once (a share over a total) rather than in each frontend page.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Iterable, Optional

from .metrics import SaleLine, line_net_paise
from .normalize import to_rupees

WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _percent(part: float, whole: float) -> Optional[float]:
    if whole == 0:
        return None
    return round(part / whole * 100, 1)


def category_performance(lines: Iterable[SaleLine]) -> list[dict]:
    """Revenue/units by category, with category share of revenue.

    Share is None (insufficient) when total revenue is zero — never a 0.0
    fabricated share."""
    agg: dict = defaultdict(lambda: {"revenue": 0, "units": 0})
    for l in lines:
        g = agg[l.category or "Unknown"]
        g["revenue"] += line_net_paise(l)
        g["units"] += int(l.quantity or 0)
    total = sum(g["revenue"] for g in agg.values())
    out = [
        {
            "category": cat,
            "revenue_paise": g["revenue"],
            "revenue": to_rupees(g["revenue"]),
            "units": g["units"],
            "share_pct": _percent(g["revenue"], total),
        }
        for cat, g in agg.items()
    ]
    return sorted(out, key=lambda x: -x["revenue_paise"])


def product_performance(lines: Iterable[SaleLine], limit: Optional[int] = None) -> list[dict]:
    """Revenue/units/transactions by product, best first."""
    agg: dict = defaultdict(lambda: {"revenue": 0, "units": 0, "invoices": set(), "name": "Unknown", "category": "Unknown"})
    for l in lines:
        g = agg[l.product_id]
        g["revenue"] += line_net_paise(l)
        g["units"] += int(l.quantity or 0)
        if l.invoice_id is not None:
            g["invoices"].add(l.invoice_id)
        g["name"] = l.product_name or g["name"]
        g["category"] = l.category or g["category"]
    out = [
        {
            "product_id": pid,
            "name": g["name"],
            "category": g["category"],
            "revenue_paise": g["revenue"],
            "revenue": to_rupees(g["revenue"]),
            "units": g["units"],
            "transactions": len(g["invoices"]),
        }
        for pid, g in agg.items()
    ]
    out.sort(key=lambda x: -x["revenue_paise"])
    return out[:limit] if limit else out


def peak_hours(lines: Iterable[SaleLine]) -> list[dict]:
    """Revenue/units/orders per hour (0..23), labels included."""
    agg = {h: {"revenue": 0, "units": 0, "invoices": set()} for h in range(24)}
    for l in lines:
        if l.ts is None:
            continue
        h = l.ts.hour
        g = agg[h]
        g["revenue"] += line_net_paise(l)
        g["units"] += int(l.quantity or 0)
        if l.invoice_id is not None:
            g["invoices"].add(l.invoice_id)
    return [
        {
            "hour": h,
            "label": f"{h:02d}:00",
            "revenue_paise": g["revenue"],
            "revenue": to_rupees(g["revenue"]),
            "units": g["units"],
            "orders": len(g["invoices"]),
        }
        for h, g in sorted(agg.items())
    ]


def weekday_breakdown(lines: Iterable[SaleLine]) -> list[dict]:
    """Revenue/units per day of week (0=Monday..6=Sunday)."""
    agg = {d: {"revenue": 0, "units": 0} for d in range(7)}
    for l in lines:
        g = agg[l.date.weekday()]
        g["revenue"] += line_net_paise(l)
        g["units"] += int(l.quantity or 0)
    return [
        {
            "day_index": d,
            "day_name": WEEKDAY_NAMES[d],
            "revenue_paise": agg[d]["revenue"],
            "revenue": to_rupees(agg[d]["revenue"]),
            "units": agg[d]["units"],
        }
        for d in range(7)
    ]


def demand_heatmap(lines: Iterable[SaleLine]) -> list[dict]:
    """7×24 day-of-week × hour demand matrix, zero-filled.

    Each cell: ``{day, hour, revenue_paise, revenue, units, orders}`` where
    ``orders`` is the distinct invoice count for that (weekday, hour) — never a
    fabricated ``1`` just because a unit was sold. ``revenue`` is net (taxable).
    """
    cells = [
        {"day": d, "hour": h, "revenue": 0, "units": 0, "invoices": set()}
        for d in range(7) for h in range(24)
    ]
    index = {c["day"] * 24 + c["hour"]: c for c in cells}
    for l in lines:
        if l.ts is None:
            continue
        cell = index[l.ts.weekday() * 24 + l.ts.hour]
        cell["revenue"] += line_net_paise(l)
        cell["units"] += int(l.quantity or 0)
        if l.invoice_id is not None:
            cell["invoices"].add(l.invoice_id)
    return [
        {
            "day_index": d,
            "day_name": WEEKDAY_NAMES[d],
            "hours": [
                {
                    "day": d,
                    "hour": h,
                    "revenue_paise": c["revenue"],
                    "revenue": to_rupees(c["revenue"]),
                    "units": c["units"],
                    "orders": len(c["invoices"]),
                }
                for h, c in index.items() if c["day"] == d
            ],
        }
        for d in range(7)
    ]
