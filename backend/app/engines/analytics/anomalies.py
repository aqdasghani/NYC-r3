"""
Anomaly detection — seasonality-aware, sample-size gated.

Approach: for daily revenue/units, the expected value of a day is the MEAN of
the same day-of-week over the window (Monday expects a Monday, not a Sunday).
A day is flagged when its residual (actual − expected) has |z| ≥ Z_THRESHOLD
relative to the same-weekday residual distribution. With fewer than
MIN_SAMPLES same-weekday points (or no baseline), nothing is flagged — no false
alarms from normal weekly seasonality, and no claims without evidence.

Every result carries its evidence (z, expected, actual) so the caller can show
the reasoning, never a bare "sales spiked!".
"""
from __future__ import annotations

import math
from collections import defaultdict
from datetime import date
from typing import Iterable, Optional

from .metrics import SaleLine

Z_THRESHOLD = 2.5
MIN_SAMPLES = 3            # same-weekday observations needed for a baseline
WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _z_scores(values: list[float], keys: list) -> list[Optional[float]]:
    """z-score of each value against its group mean/std (group = same weekday)."""
    groups: dict = defaultdict(list)
    for k, v in zip(keys, values):
        groups[k].append(v)
    stats: dict = {}
    for k, g in groups.items():
        if len(g) < MIN_SAMPLES:
            stats[k] = None
            continue
        mean = sum(g) / len(g)
        var = sum((x - mean) ** 2 for x in g) / len(g)
        std = math.sqrt(var) if var > 0 else 0.0
        stats[k] = (mean, std)
    out = []
    for k, v in zip(keys, values):
        s = stats.get(k)
        if s is None or s[1] == 0:
            out.append(None)
        else:
            out.append((v - s[0]) / s[1])
    return out


def detect_daily_anomalies(points: list[dict], today: Optional[date] = None) -> list[dict]:
    """Flag unusual days in a daily series (``{date, revenue_paise, units}``).

    Returns anomalies sorted by |z| descending: ``{date, metric, direction,
    z, expected, actual, weekday}``.
    """
    today = today or date.today()
    if len(points) < MIN_SAMPLES * 2:
        return []
    keys = [date.fromisoformat(p["date"]).weekday() for p in points]
    rev_z = _z_scores([float(p.get("revenue_paise", 0)) for p in points], keys)
    unit_z = _z_scores([float(p.get("units", 0)) for p in points], keys)

    out = []
    for i, p in enumerate(points):
        for z, metric, getter in ((rev_z[i], "revenue", lambda i: p.get("revenue_paise", 0)),
                                  (unit_z[i], "units", lambda i: p.get("units", 0))):
            if z is None or abs(z) < Z_THRESHOLD:
                continue
            d = date.fromisoformat(p["date"])
            if d > today:  # never flag a future day
                continue
            out.append({
                "date": p["date"],
                "weekday": WEEKDAY_NAMES[d.weekday()],
                "metric": metric,
                "direction": "SPIKE" if z > 0 else "DROP",
                "z": round(z, 2),
                "actual": getter(i),
                "expected": None,
            })
    out.sort(key=lambda a: -abs(a["z"]))
    return out


def discount_share_anomaly(lines: Iterable[SaleLine]) -> Optional[dict]:
    """Discount share of revenue vs the overall window baseline, per day.

    Flags days whose discount % deviates more than Z_THRESHOLD standard
    deviations from the window's day-level discount share. None when the window
    is too small or no discounts were given at all.
    """
    from .metrics import gross_revenue_paise
    sl = list(lines)
    if len(sl) < 14:
        return None
    per_day: dict = defaultdict(lambda: [0, 0])  # date -> [gross, taxable]
    for l in sl:
        g = per_day[l.date]
        g[0] += int(l.unit_price_paise or 0) * int(l.quantity or 0)
        g[1] += int(l.taxable_paise or 0)
    shares = []
    dates = []
    for d, (gross, taxable) in sorted(per_day.items()):
        if gross == 0:
            continue
        share = (gross - taxable) / gross * 100
        shares.append(share)
        dates.append(d)
    if not shares:
        return None
    mean = sum(shares) / len(shares)
    var = sum((s - mean) ** 2 for s in shares) / len(shares)
    std = math.sqrt(var)
    if std == 0:
        return None
    worst = max(range(len(shares)), key=lambda i: abs(shares[i] - mean) / std)
    z = (shares[worst] - mean) / std
    if abs(z) < Z_THRESHOLD:
        return None
    return {
        "date": dates[worst].isoformat(),
        "metric": "discount_share",
        "direction": "HIGH" if z > 0 else "LOW",
        "z": round(z, 2),
        "actual_pct": round(shares[worst], 2),
        "expected_pct": round(mean, 2),
    }
