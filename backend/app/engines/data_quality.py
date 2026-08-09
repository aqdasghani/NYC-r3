"""Public data-quality tiers — shared by every AI surface (§13 of the AI spec).

An AI answer is only as trustworthy as the history it was computed from, so
every insight and copilot answer reports a tier: LOW / MEDIUM / HIGH plus a
short human-readable note. Tiers are derived from real counts (number of data
points and days of history), never asserted by the LLM.

For a brand-new store these tiers intentionally produce "LOW / not enough
historical data" — the AI must never pretend to forecast accurately with a
couple of days of transactions.
"""
from __future__ import annotations

NOTES: dict[str, str] = {
    "LOW": "Not enough historical data for a reliable conclusion.",
    "MEDIUM": "Early signal — history is still limited, treat as directional.",
    "HIGH": "Strong historical basis.",
}

_SCORES = {"LOW": 60, "MEDIUM": 80, "HIGH": 95}


def tier(data_points: int, history_days: int) -> str:
    """Classify a data-quality tier from raw counts.

    - LOW:    fewer than 10 data points, or fewer than 3 days of history.
    - MEDIUM: fewer than 100 data points, or fewer than 14 days.
    - HIGH:   otherwise.
    """
    if data_points < 10 or history_days < 3:
        return "LOW"
    if data_points < 100 or history_days < 14:
        return "MEDIUM"
    return "HIGH"


def note(level: str) -> str:
    return NOTES.get(level, "")


def confidence_score(level: str) -> int:
    """Map a data-quality tier to a conservative confidence percentage."""
    return _SCORES.get(level, 60)


def combine(*levels: str | None) -> str:
    """Combines several tiers pessimistically: the weakest level wins."""
    present = [l for l in levels if l]
    if not present:
        return "LOW"
    rank = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
    weakest = min(present, key=lambda l: rank.get(l, 0))
    return weakest
