"""Recommendation priority tiers (AI spec §6).

Every AI recommendation gets an impact, an urgency and a confidence, and the
three combine into one of four owner-facing tiers:

    🔥 DO NOW       — high impact, high urgency, high confidence
    ⚡ DO TODAY     — high impact, but not immediately critical
    📊 WATCH        — real signal, low urgency, worth monitoring
    💡 OPPORTUNITY  — optional / nice-to-have

The inputs are derived from the math engine — a number, a time horizon and a
data-quality tier — never from the LLM.
"""
from __future__ import annotations

TIER_DO_NOW = "DO_NOW"
TIER_DO_TODAY = "DO_TODAY"
TIER_WATCH = "WATCH"
TIER_OPPORTUNITY = "OPPORTUNITY"

# Display labels used by the frontend badge mapper.
BADGE_LABELS = {
    TIER_DO_NOW: "DO NOW",
    TIER_DO_TODAY: "DO TODAY",
    TIER_WATCH: "WATCH",
    TIER_OPPORTUNITY: "OPPORTUNITY",
}


def impact_from_value(value: float) -> str:
    """Impact tier by rupee value at stake.

    Scale is conservative for a small Indian retailer: >₹2,000 is HIGH,
    >₹500 is MEDIUM, otherwise LOW.
    """
    if value >= 2000:
        return "HIGH"
    if value >= 500:
        return "MEDIUM"
    return "LOW"


def urgency_from_days(days: float | None, threshold_days: float = 7.0) -> str:
    """Urgency tier from days-until-event (expiry, stockout, etc.)."""
    if days is None:
        return "LOW"
    if days <= 3:
        return "HIGH"
    if days <= threshold_days:
        return "MEDIUM"
    return "LOW"


def tier(impact: str, urgency: str, confidence: int) -> str:
    """Combine impact / urgency / confidence into an owner-facing tier.

    ``confidence`` is a 0–100 number (usually from ``data_quality``).
    """
    if impact == "HIGH" and urgency == "HIGH" and confidence >= 70:
        return TIER_DO_NOW
    if impact == "HIGH" and (urgency == "HIGH" or confidence >= 70):
        return TIER_DO_TODAY
    if impact == "MEDIUM" and urgency != "LOW":
        return TIER_WATCH
    if impact == "HIGH":
        return TIER_DO_TODAY
    return TIER_OPPORTUNITY


def from_value_and_days(value: float, days: float | None, confidence: int,
                        urgency_threshold_days: float = 7.0) -> str:
    """Convenience wrapper: derive impact + urgency, then tier."""
    return tier(impact_from_value(value), urgency_from_days(days, urgency_threshold_days), confidence)


def rank(insights: list[dict]) -> list[dict]:
    """Sort insights by priority tier (most urgent first), stable."""
    order = {TIER_DO_NOW: 0, TIER_DO_TODAY: 1, TIER_WATCH: 2, TIER_OPPORTUNITY: 3}
    return sorted(insights, key=lambda i: order.get(i.get("priority"), 9))
