"""
Money Precision Layer — Single Source of Truth for Financial Arithmetic

IRON LAW: No binary floating point for money. Ever.
All amounts stored and computed as integer minor units (paise).
Display converts at the boundary only.

Rounding: ROUND_HALF_UP at final boundary only.
Intermediate precision: 28 decimal places (Decimal default).
"""

from __future__ import annotations

from decimal import Decimal, getcontext, ROUND_HALF_UP
from typing import Union

# Configure Decimal context once at module load
getcontext().prec = 28
getcontext().rounding = ROUND_HALF_UP

PAISE_PER_RUPEE = 100

# Type alias for clarity
Paise = int
Rupees = Decimal


class InsufficientData(Exception):
    """Raised when a calculation cannot proceed due to missing/zero denominator."""
    pass


class DivisionByZero(InsufficientData):
    """Raised when dividing by zero — distinct from other insufficient data."""
    pass


# ─────────────────────────────── Conversion ────────────────────────────────────

def to_paise(value: Union[Decimal, float, str, int]) -> Paise:
    """
    Convert any numeric input to integer paise.

    Args:
        value: Decimal, float, str, or int representing rupees (e.g., 10.50)

    Returns:
        Integer paise (e.g., 1050)

    Examples:
        to_paise("10.50") → 1050
        to_paise(10.5) → 1050
        to_paise(Decimal("10.50")) → 1050
        to_paise(1050) → 1050  (already paise)
    """
    if isinstance(value, int):
        # Heuristic: if value >= 10000 assume it's already paise
        # Otherwise treat as rupees
        if value >= 10000:
            return value
        return int(Decimal(value) * PAISE_PER_RUPEE)

    if isinstance(value, (float, str)):
        d = Decimal(str(value))
    elif isinstance(value, Decimal):
        d = value
    else:
        raise TypeError(f"Cannot convert {type(value)} to paise")

    # Quantize to 2 decimal places (paise precision) then convert
    return int((d * PAISE_PER_RUPEE).quantize(Decimal('1')))


def from_paise(paise: Paise) -> Rupees:
    """Convert integer paise to Decimal rupees (e.g., 1050 → Decimal('10.50'))."""
    return (Decimal(paise) / PAISE_PER_RUPEE).quantize(Decimal('0.01'))


def to_rupees_str(paise: Paise) -> str:
    """Format paise as rupee string (e.g., 1050 → '₹10.50')."""
    return f"₹{from_paise(paise):.2f}"


def paise_to_float(paise: Paise) -> float:
    """Convert paise to float for legacy APIs that require float. Use sparingly."""
    return float(from_paise(paise))


# ─────────────────────────────── Core Arithmetic ──────────────────────────────

def add_paise(*amounts: Paise) -> Paise:
    """Exact integer addition of paise amounts."""
    return sum(amounts)


def sub_paise(minuend: Paise, subtrahend: Paise) -> Paise:
    """Exact integer subtraction of paise amounts."""
    return minuend - subtrahend


def mul_qty_price(qty: int, price_paise: Paise) -> Paise:
    """Exact integer multiplication: quantity × unit price (both integers)."""
    return qty * price_paise


def div_paise(num: Paise, den: Paise) -> Rupees:
    """
    Divide two paise amounts, return Decimal rupees with 2 decimal places.
    Raises DivisionByZero if denominator is zero.
    """
    if den == 0:
        raise DivisionByZero("Denominator is zero")
    return (Decimal(num) / Decimal(den)).quantize(Decimal('0.01'))


def safe_div(num: Paise, den: Paise, *, default: Rupees | None = None) -> Rupees | None:
    """
    Safe division with explicit handling of zero denominator.

    Args:
        num: Numerator in paise
        den: Denominator in paise
        default: Return value if denominator is zero (default: raise DivisionByZero)

    Returns:
        Decimal rupees or default

    Raises:
        DivisionByZero: If den == 0 and no default provided
    """
    if den == 0:
        if default is not None:
            return default
        raise DivisionByZero("Denominator is zero — INSUFFICIENT_DATA")
    return div_paise(num, den)


# ─────────────────────────────── Percentage / Margin / Markup ─────────────────

def pct_of(part: Paise, whole: Paise) -> Rupees:
    """Calculate (part / whole) * 100 as Decimal percentage."""
    if whole == 0:
        raise DivisionByZero("Whole is zero")
    return ((Decimal(part) / Decimal(whole)) * 100).quantize(Decimal('0.01'))


def margin_pct(selling_price_paise: Paise, cost_paise: Paise) -> Rupees:
    """
    Margin = (selling_price - cost) / selling_price * 100
    Margin is profit as % of REVENUE (selling price).
    """
    if selling_price_paise == 0:
        raise DivisionByZero("Selling price is zero")
    profit = selling_price_paise - cost_paise
    return pct_of(profit, selling_price_paise)


def markup_pct(selling_price_paise: Paise, cost_paise: Paise) -> Rupees:
    """
    Markup = (selling_price - cost) / cost * 100
    Markup is profit as % of COST.
    """
    if cost_paise == 0:
        raise DivisionByZero("Cost is zero")
    profit = selling_price_paise - cost_paise
    return pct_of(profit, cost_paise)


def apply_margin(cost_paise: Paise, margin_pct: Rupees) -> Paise:
    """
    Calculate selling price from cost and desired margin.
    selling_price = cost / (1 - margin/100)
    """
    margin_decimal = margin_pct / 100
    if margin_decimal >= 1:
        raise ValueError("Margin cannot be >= 100%")
    divisor = (Decimal('1') - margin_decimal).quantize(Decimal('0.0001'))
    return to_paise(Decimal(cost_paise) / divisor)


def apply_markup(cost_paise: Paise, markup_pct: Rupees) -> Paise:
    """
    Calculate selling price from cost and desired markup.
    selling_price = cost * (1 + markup/100)
    """
    markup_decimal = markup_pct / 100
    multiplier = (Decimal('1') + markup_decimal).quantize(Decimal('0.0001'))
    return to_paise(Decimal(cost_paise) * multiplier)


# ─────────────────────────────── Tax (GST) ────────────────────────────────────

def calculate_gst(taxable_paise: Paise, gst_rate_pct: Union[Decimal, float, int, str]) -> Paise:
    """
    Calculate GST amount from taxable value and rate.
    GST = taxable * (rate / 100), rounded to paise.
    """
    rate = Decimal(str(gst_rate_pct))
    gst = (Decimal(taxable_paise) * (rate / Decimal('100'))).quantize(Decimal('1'))
    return int(gst)


def calculate_taxable_and_gst(gross_paise: Paise, gst_rate_pct: Union[Decimal, float, int, str]) -> tuple[Paise, Paise]:
    """
    Split gross (tax-inclusive) into taxable + GST.
    taxable = gross / (1 + rate/100)
    GST = gross - taxable
    """
    rate = Decimal(str(gst_rate_pct))
    rate_decimal = rate / Decimal('100')
    divisor = (Decimal('1') + rate_decimal).quantize(Decimal('0.0001'))
    taxable = (Decimal(gross_paise) / divisor).quantize(Decimal('1'))
    taxable_paise = int(taxable)
    gst_paise = gross_paise - taxable_paise
    return taxable_paise, gst_paise


# ─────────────────────────────── Discounts ────────────────────────────────────

def calculate_discount(subtotal_paise: Paise, discount_pct: Union[Decimal, float, int, str]) -> Paise:
    """Discount amount = subtotal * (discount_pct / 100), rounded to paise."""
    rate = Decimal(str(discount_pct))
    if rate == 0:
        return 0
    disc = (Decimal(subtotal_paise) * (rate / Decimal('100'))).quantize(Decimal('1'))
    return int(disc)


def apply_discount(subtotal_paise: Paise, discount_paise: Paise) -> Paise:
    """Apply a flat discount amount to subtotal."""
    return subtotal_paise - discount_paise


# ─────────────────────────────── Rounding Policy ──────────────────────────────

ROUNDING_POLICY = {
    "precision": 2,  # paise
    "rounding_mode": "ROUND_HALF_UP",
    "intermediate_precision": 28,
    "round_at": "boundary",  # only at final output, never intermediate
    "currency": "INR",
    "minor_unit": "paise",
    "minor_per_major": 100,
}

def get_rounding_policy() -> dict:
    """Return the declared rounding policy for audit/explainability."""
    return ROUNDING_POLICY.copy()


# ─────────────────────────────── Legacy Float Compatibility ───────────────────

def to_float_rupees(paise: Paise) -> float:
    """Convert paise to float rupees for legacy APIs. Use sparingly."""
    return float(from_paise(paise))


def from_float_rupees(rupees: float) -> Paise:
    """Convert float rupees to paise. Use sparingly — prefer Decimal input."""
    return to_paise(rupees)