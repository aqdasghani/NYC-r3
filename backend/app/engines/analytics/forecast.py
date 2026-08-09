"""
Forecasting — data-quality gated, never presented as fact.

Forecasts are only produced when the history supports them (≥ ``min_history``
days and ≥ ``min_points`` observations with any non-zero sales). Outputs are
explicitly labeled ``kind: "forecast"`` and carry a prediction band so no
surface can mistake a prediction for a recorded value. With insufficient data
the engine returns ``kind: "insufficient"`` with the reason — it does NOT invent
a number.

Method: simple exponential smoothing (single level), α = ALPHA, one-step-ahead
residuals to size an empirical band that widens with sqrt(horizon step).
"""
from __future__ import annotations

import math
from datetime import date, timedelta
from typing import Optional

ALPHA = 0.3
DEFAULT_MIN_HISTORY_DAYS = 28
DEFAULT_MIN_POINTS = 30


def generate_forecast(daily_units: list[float],
                      horizon: int = 7,
                      min_history: int = DEFAULT_MIN_HISTORY_DAYS,
                      min_points: int = DEFAULT_MIN_POINTS) -> dict:
    """Forecast next ``horizon`` days of units from a daily series.

    Args:
        daily_units: units per day, chronological, possibly zero-filled.
        horizon: number of forecast points.

    Returns:
        ``{"kind": "insufficient", "reason": ...}`` or
        ``{"kind": "forecast", "method": "SES(a=0.3)", "actual": [...],
           "forecast": [{"day": n, "units": float, "lo": float, "hi": float}]}``
        where ``units`` is the point forecast and ``lo``/``hi`` the 95% band.
    """
    series = [float(x) for x in daily_units if x is not None]
    nonzero = [x for x in series if x > 0]
    if len(series) < min_history or len(nonzero) < min_points:
        reason = (f"Insufficient data: {len(series)} days (need >={min_history}), "
                  f"{len(nonzero)} non-zero points (need >={min_points})")
        return {"kind": "insufficient", "reason": reason}

    level = series[0]
    residuals: list[float] = []
    for x in series[1:]:
        level = ALPHA * x + (1 - ALPHA) * level
        residuals.append(x - level)
    std = math.sqrt(sum(r * r for r in residuals) / max(1, len(residuals)))

    points = []
    current = level
    for step in range(1, horizon + 1):
        current = ALPHA * current + (1 - ALPHA) * current  # persistence
        band = 1.96 * std * math.sqrt(step)
        points.append({
            "day": step,
            "units": round(current, 2),
            "lo": round(max(0.0, current - band), 2),
            "hi": round(current + band, 2),
        })
    return {
        "kind": "forecast",
        "method": "SES(a=0.3)",
        "alpha": ALPHA,
        "history_days": len(series),
        "residual_std": round(std, 2),
        "actual": [round(x, 2) for x in series],
        "forecast": points,
    }
