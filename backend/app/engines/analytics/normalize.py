"""
Money-unit normalization — the boundary that makes mixed-unit data readable.

KNOWN DATA DEFECT (verified against the live DB):
``Sale.sale_price``, ``Sale.gst_amount``, ``InvoiceItem.{unit_price,taxable_amount,
gst_amount,line_total}`` and ``Invoice.{subtotal,total_gst,grand_total}`` store a
MIX of two scales in the same column:

  * the demo seed writes RUPEES  (e.g. ``62.27`` for a ₹62.27 item), and
  * the runtime POS ``billing_engine`` writes PAISE (e.g. ``6227``).

Any consumer that reads these columns as rupees is 100× wrong for live POS data.
This module is the ONLY place that resolves the ambiguity. Every analytic and AI
surface goes through ``detect_scale`` / ``scale_paise`` so a single convention
(integer paise) is used internally and money is converted to rupees only at the
display boundary.

The scale is established per ROW from the per-unit price, which is the cleanest
signal available: a rupee-scale per-unit price sits within ~3× of the product's
authoritative ``selling_price``, while a paise-scale per-unit price sits ~100×
away (≥30×). All money fields in the same row share the same writer, so the
detected scale is then applied uniformly to every column of that row.

Never call ``money.to_paise`` from here — it contains a ``value >= 10000``
heuristic that double-converts values in 1000..9999 (used by the in-flight POS
refactor; out of scope to change).
"""
from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Optional, Union

PAISE_PER_RUPEE = 100

# A rupee-scale per-unit value is < 3× the reference price; a paise-scale value
# is >= 30× (100× nominal). The gap (3×..30×) is "unknown" and defaults to the
# seed (rupee) convention — the dominant scale in the live database.
_RUPEE_MAX_RATIO = 3.0
_PAISE_MIN_RATIO = 30.0


def to_rupees(paise: Union[int, Decimal]) -> Decimal:
    """Convert integer paise to a Decimal rupee amount (ROUND_HALF_UP, 2dp)."""
    return (Decimal(int(paise)) / Decimal(PAISE_PER_RUPEE)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def detect_scale(unit_value: Optional[Union[float, Decimal, int]], ref_rupees: Optional[Union[float, Decimal, int]]) -> str:
    """Classify a per-unit money value as ``"rupees"``, ``"paise"`` or ``"unknown"``.

    Args:
        unit_value: the per-unit amount from a mixed-unit column.
        ref_rupees: the product's authoritative price in rupees
            (``Product.selling_price``), or ``None`` when unavailable.

    Returns:
        ``"rupees"`` | ``"paise"`` | ``"unknown"``
    """
    if unit_value is None:
        return "unknown"
    if ref_rupees is None:
        return "unknown"
    ref = float(ref_rupees)
    if ref <= 0:
        return "unknown"
    ratio = abs(float(unit_value)) / ref
    if ratio < _RUPEE_MAX_RATIO:
        return "rupees"
    if ratio >= _PAISE_MIN_RATIO:
        return "paise"
    return "unknown"


def scale_paise(value: Optional[Union[float, Decimal, int]], scale: str) -> int:
    """Convert a money value to integer paise using a detected row scale.

    ``scale`` is one of ``"paise"`` | ``"rupees"`` | ``"unknown"``; the latter
    two are treated as rupees (the seed/demo convention). ``None`` → 0.
    """
    if value is None:
        return 0
    try:
        d = Decimal(str(value))
    except Exception:
        return 0
    scaled = d * PAISE_PER_RUPEE if scale != "paise" else d
    return int(scaled.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def normalize_unit(unit_value: Optional[Union[float, Decimal, int]],
                   ref_rupees: Optional[Union[float, Decimal, int]]) -> tuple[int, str]:
    """Normalize a per-unit price to paise. Returns ``(paise, confidence)``.

    confidence is ``"high"`` when the scale was unambiguous, ``"low"`` when it
    fell back to the rupee convention (missing reference or gray-zone ratio).
    """
    scale = detect_scale(unit_value, ref_rupees)
    confidence = "high" if scale != "unknown" else "low"
    if scale == "unknown":
        scale = "rupees"
    return scale_paise(unit_value, scale), confidence


# ──────────────────────────────── arithmetic ─────────────────────────────────

def safe_div(num: Any, den: Any) -> Optional[Decimal]:
    """num/den as Decimal, or ``None`` when the denominator is zero/missing.

    ``None`` is the canonical "insufficient data" signal — callers must surface
    it as such rather than substituting 0.
    """
    if num is None or den is None:
        return None
    try:
        n = Decimal(str(num))
        d = Decimal(str(den))
    except Exception:
        return None
    if d == 0:
        return None
    return n / d


def growth_pct(current: Any, previous: Any) -> Optional[Decimal]:
    """Percent change vs the previous period, or ``None`` when incomparable.

    Never fabricates a 0.0% — a missing/zero baseline is insufficient data.
    """
    if current is None or previous is None:
        return None
    try:
        c = Decimal(str(current))
        p = Decimal(str(previous))
    except Exception:
        return None
    if p == 0:
        return None
    return (c - p) / p * 100


def round2(value: Any) -> Decimal:
    """Round a number to 2dp (ROUND_HALF_UP) for display."""
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
