"""
Comparable-period time-series engine.

Iron rule: NEVER compare incomparable periods. ``comparable_periods`` returns an
equal-length (current, previous) pair — "this week" (Mon→today, 3 elapsed days
on a Wednesday) is compared against the SAME 3 days of last week, never the full
7-day week. "Today vs yesterday" compares the elapsed clock window (00:00→now)
against the same window yesterday. Growth is reported as ``None`` when the
previous period has no revenue (insufficient data), never as a fabricated 0.0%.

All aggregation is over normalized ``SaleLine`` records (see loader/metrics).
Date bucketing uses the stored (UTC, naive) ``created_at`` timestamp — the same
convention the existing routers use; the timezone caveat is documented in the
final report.
"""
from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Iterable, Optional

from .metrics import (
    SaleLine, average_basket_size, average_order_value_paise, cogs_paise,
    discounts_paise, gross_margin_pct, gross_profit_paise,
    gross_revenue_paise, gst_collected_paise, line_net_paise,
    net_revenue_invoiced_paise, net_revenue_taxable_paise, revenue_growth_pct,
    transactions, units_sold,
)
from .normalize import to_rupees


@dataclass
class Period:
    start: date
    end: date                       # inclusive
    elapsed_days: int
    is_partial: bool
    start_ts: Optional[datetime] = None   # precise intra-day window (today kind)
    end_ts: Optional[datetime] = None

    def includes(self, line: SaleLine) -> bool:
        if self.start_ts is not None and self.end_ts is not None and line.ts is not None:
            return self.start_ts <= line.ts < self.end_ts
        return self.start <= line.date <= self.end

    @property
    def label(self) -> str:
        return f"{self.start.isoformat()}/{self.end.isoformat()}"


def _nth_of_month(year: int, month: int, day: int) -> date:
    last = calendar.monthrange(year, month)[1]
    return date(year, month, min(day, last))


def _prev_month(year: int, month: int) -> tuple[int, int]:
    if month == 1:
        return year - 1, 12
    return year, month - 1


def comparable_periods(kind: str, today: Optional[date] = None,
                       now: Optional[datetime] = None) -> tuple[Period, Period]:
    """Equal-length (current, previous) comparison windows.

    ``kind``: ``"today" | "week" | "month" | "year" | "rolling7" | "rolling30"``.

    - ``today``:  today 00:00→now vs yesterday 00:00→same clock time (intra-day).
    - ``week``:   this week Mon→today (N days) vs prior week's same N days.
    - ``month``:  MTD (N days) vs prior month's same N days.
    - ``year``:   YTD (N days) vs prior year's same N days.
    - ``rolling7`` / ``rolling30``: the last N COMPLETE days vs the N days before.
    """
    today = today or date.today()
    now = now or datetime.now()
    today_dt = datetime.combine(today, time.min)

    if kind == "today":
        elapsed = now - today_dt
        cur = Period(today, today, 0, True, start_ts=today_dt, end_ts=now)
        prev_dt = datetime.combine(today - timedelta(days=1), time.min)
        prev = Period(today - timedelta(days=1), today - timedelta(days=1), 0, True,
                      start_ts=prev_dt, end_ts=prev_dt + elapsed)
        return (cur, prev)

    if kind == "rolling7":
        n = 7
        cur = Period(today - timedelta(days=n), today - timedelta(days=1), n, False)
        prev = Period(today - timedelta(days=2 * n), today - timedelta(days=n + 1), n, False)
        return (cur, prev)

    if kind == "rolling30":
        n = 30
        cur = Period(today - timedelta(days=n), today - timedelta(days=1), n, False)
        prev = Period(today - timedelta(days=2 * n), today - timedelta(days=n + 1), n, False)
        return (cur, prev)

    if kind == "week":
        n = today.weekday() + 1            # elapsed days this week
        cur = Period(today - timedelta(days=n - 1), today, n, True)
        # The prior window is the SAME weekdays one week earlier — shift by 7
        # calendar days, NOT by n (Mon–Wed vs Fri–Sun would be incomparable).
        prev = Period(cur.start - timedelta(days=7), cur.end - timedelta(days=7), n, False)
        return (cur, prev)

    if kind == "month":
        n = today.day
        cur = Period(today.replace(day=1), today, n, True)
        py, pm = _prev_month(today.year, today.month)
        prev = Period(date(py, pm, 1), _nth_of_month(py, pm, n), n, False)
        return (cur, prev)

    if kind == "year":
        n = today.timetuple().tm_yday
        cur = Period(today.replace(month=1, day=1), today, n, True)
        py = today.year - 1
        prev = Period(date(py, 1, 1), _nth_of_month(py, 12, n), n, False)
        return (cur, prev)

    raise ValueError(f"unknown comparison kind: {kind!r}")


def daily_series(lines: Iterable[SaleLine], days: int,
                 end_date: Optional[date] = None) -> list[dict]:
    """Daily revenue/units/orders for the last ``days`` days (zero-filled)."""
    end = end_date or date.today()
    start = end - timedelta(days=days - 1)
    day_map: dict[date, list[int]] = {}
    inv_set: dict[date, set] = {}
    for l in lines:
        if start <= l.date <= end:
            day_map.setdefault(l.date, [0, 0])
            day_map[l.date][0] += line_net_paise(l)        # net (taxable) revenue
            day_map[l.date][1] += int(l.quantity or 0)
            if l.invoice_id is not None:
                inv_set.setdefault(l.date, set()).add(l.invoice_id)
    out = []
    for i in range(days):
        d = start + timedelta(days=i)
        rev, units = day_map.get(d, [0, 0])
        orders = len(inv_set.get(d, set())) if d in inv_set else 0
        out.append({
            "date": d.isoformat(),
            "revenue_paise": rev,
            "revenue": to_rupees(rev),
            "units": units,
            "orders": orders,
        })
    return out


def aggregate_lines(lines: list[SaleLine]) -> dict:
    """One aggregate block for a period — the numbers every surface shares."""
    rev_gross = gross_revenue_paise(lines)
    rev_net = net_revenue_taxable_paise(lines)
    txns = transactions(lines)
    gp = gross_profit_paise(lines)
    aov = average_order_value_paise(lines)
    return {
        "gross_revenue_paise": rev_gross,
        "gross_revenue": to_rupees(rev_gross),
        "net_revenue_paise": rev_net,
        "net_revenue": to_rupees(rev_net),
        "discounts_paise": discounts_paise(lines),
        "discounts": to_rupees(discounts_paise(lines)),
        "gst_collected_paise": gst_collected_paise(lines),
        "gst_collected": to_rupees(gst_collected_paise(lines)),
        "invoiced_paise": net_revenue_invoiced_paise(lines),
        "invoiced": to_rupees(net_revenue_invoiced_paise(lines)),
        "cogs_paise": cogs_paise(lines),
        "cogs": to_rupees(cogs_paise(lines)),
        "gross_profit_paise": gp,
        "gross_profit": to_rupees(gp) if gp is not None else None,
        "gross_margin_pct": gross_margin_pct(lines),
        "units": units_sold(lines),
        "transactions": txns,
        "aov_paise": aov,
        "aov": to_rupees(aov) if aov is not None else None,
        "basket_size": average_basket_size(lines),
    }


def compare_periods(current: Period, previous: Period,
                    lines: list[SaleLine]) -> dict:
    """Equal-length comparison with honest growth (None on zero baseline)."""
    cur_lines = [l for l in lines if current.includes(l)]
    prev_lines = [l for l in lines if previous.includes(l)]
    cur = aggregate_lines(cur_lines)
    prev = aggregate_lines(prev_lines)
    return {
        "current_period": current.label,
        "previous_period": previous.label,
        "current": cur,
        "previous": prev,
        "net_revenue_growth_pct": revenue_growth_pct(cur["net_revenue_paise"], prev["net_revenue_paise"]),
        "units_growth_pct": revenue_growth_pct(cur["units"], prev["units"]),
    }


def trend_direction(values: list[float], min_points: int = 7) -> dict:
    """Directional trend from a numeric series, gated on sample size.

    Returns ``{"direction", "basis", "n"}``. ``basis`` is ``"insufficient"``
    below ``min_points`` (never a manufactured direction).
    Labels: SPIKE (>+50%), INCREASING (>+15%), STABLE, DECREASING (<-15%), DROP (<-50%).
    """
    n = len(values)
    if n < min_points:
        return {"direction": "insufficient", "basis": "insufficient", "n": n}
    half = n // 2
    first = sum(values[:half]) / half
    second = sum(values[half:]) / (n - half)
    if first == 0:
        pct = None
    else:
        pct = (second - first) / first * 100
    if pct is None:
        direction = "STABLE"
    elif pct > 50:
        direction = "SPIKE"
    elif pct > 15:
        direction = "INCREASING"
    elif pct < -50:
        direction = "DROP"
    elif pct < -15:
        direction = "DECREASING"
    else:
        direction = "STABLE"
    return {"direction": direction, "basis": "trend", "n": n, "pct_change": pct}
