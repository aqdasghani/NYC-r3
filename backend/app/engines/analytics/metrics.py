"""
Canonical metric functions — PURE, zero database.

Every metric here consumes normalized ``SaleLine`` records (see ``loader.py``;
all money fields already integer paise) and returns a number, a ``Decimal``
rupee figure, or ``None`` — where ``None`` means "insufficient data" and is
NEVER substituted with a fabricated 0.

Definitions (single source of truth — every router/AI/frontend surface must use
these and only these):

    Gross revenue      = Σ unit_price × quantity                (pre-discount)
    Discounts          = Gross revenue − Net revenue (taxable)  (derived)
    Net revenue (tax)  = Σ taxable_amount                       (ex-GST)
    GST collected      = Σ gst_amount
    Net revenue (inv.) = Σ line_total  (= taxable + gst)
    Gross profit       = Net revenue (tax) − COGS
    COGS               = Σ batch purchase_price × quantity  (fallback product price)
    Gross margin       = Gross profit / Net revenue (tax)
    Transactions       = number of distinct invoices
    AOV                = Net revenue (tax) / Transactions

Money is paise internally; ``to_rupees`` converts at the display boundary only.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Iterable, Optional

from .normalize import growth_pct, safe_div, to_rupees

# ──────────────────────────────── input records ──────────────────────────────


@dataclass
class SaleLine:
    """One normalized line of a sale (from InvoiceItem, canonical source)."""

    date: date
    quantity: int
    unit_price_paise: int            # gross per-unit price, paise
    taxable_paise: int               # net taxable amount for the line, paise
    gst_paise: int = 0
    line_total_paise: int = 0        # taxable + gst
    gst_rate: float = 0.0
    invoice_id: Any = None
    product_id: Any = None
    product_name: str = ""
    category: str = ""
    customer_id: Any = None
    pos_session_id: Any = None
    batch_purchase_paise: int = 0    # COGS per unit, paise; 0 = unknown
    batch_purchase_known: bool = False
    ts: Optional[datetime] = None    # full timestamp for intra-day windows


@dataclass
class InventorySnapshot:
    """One on-hand inventory row (batch-level)."""

    product_id: Any = None
    product_name: str = ""
    category: str = ""
    batch_id: Any = None
    quantity: int = 0
    purchase_price_paise: int = 0    # per unit, paise
    expiry_date: Optional[date] = None
    received_date: Optional[date] = None
    last_sale_date: Optional[date] = None


# ──────────────────────────────── revenue ────────────────────────────────────

def gross_revenue_paise(lines: Iterable[SaleLine]) -> int:
    """Σ unit_price × quantity — pre-discount, pre-tax gross. 0 for empty."""
    return sum(line_gross_paise(l) for l in lines)


def line_net_paise(l: SaleLine) -> int:
    """Net (taxable) revenue of one line, paise. Falls back to gross when the
    taxable amount was not recorded — the single source for revenue everywhere
    (aggregates, daily series, charts) so no surface can drift to gross."""
    if l.taxable_paise:
        return int(l.taxable_paise)
    return int(l.unit_price_paise or 0) * int(l.quantity or 0)


def net_revenue_taxable_paise(lines: Iterable[SaleLine]) -> int:
    """Σ taxable_amount — the revenue base for profit. Falls back to
    gross − discount when a line's taxable amount was not recorded."""
    return sum(line_net_paise(l) for l in lines)


def discounts_paise(lines: Iterable[SaleLine]) -> int:
    """Σ (gross − taxable) — total discount given, derived so it is always
    consistent with the gross/net figures."""
    return gross_revenue_paise(lines) - net_revenue_taxable_paise(lines)


def line_gross_paise(l: SaleLine) -> int:
    """Gross (pre-discount) revenue of one line, paise."""
    return int(l.unit_price_paise or 0) * int(l.quantity or 0)


def gst_collected_paise(lines: Iterable[SaleLine]) -> int:
    """Σ gst_amount."""
    return sum(int(l.gst_paise or 0) for l in lines)


def net_revenue_invoiced_paise(lines: Iterable[SaleLine]) -> int:
    """Σ line_total (taxable + gst) — the amount actually billed."""
    return sum(int(l.line_total_paise or 0) for l in lines)


def units_sold(lines: Iterable[SaleLine]) -> int:
    """Σ quantity — negative lines (refunds) reduce the total."""
    return sum(int(l.quantity or 0) for l in lines)


def transactions(lines: Iterable[SaleLine]) -> int:
    """Number of distinct invoices. Falls back to line count only when no
    invoice grouping exists at all (then each line is one transaction)."""
    ids = {l.invoice_id for l in lines if l.invoice_id is not None}
    if ids:
        return len(ids)
    return sum(1 for l in lines if l.quantity != 0)


def average_order_value_paise(lines: Iterable[SaleLine]) -> Optional[int]:
    """Net revenue (tax) / transactions. None when there are no transactions."""
    t = transactions(lines)
    if t <= 0:
        return None
    return int(round(net_revenue_taxable_paise(lines) / t))


def average_basket_size(lines: Iterable[SaleLine]) -> Optional[Decimal]:
    """Units per transaction. None when there are no transactions."""
    t = transactions(lines)
    if t <= 0:
        return None
    return safe_div(units_sold(lines), t)


# ──────────────────────────────── profitability ─────────────────────────────

def cogs_paise(lines: Iterable[SaleLine]) -> int:
    """Σ batch purchase_price × quantity. Lines without a known cost contribute
    0 and are excluded (see cogs_coverage)."""
    return sum(int(l.batch_purchase_paise or 0) * int(l.quantity or 0) for l in lines)


def cogs_coverage(lines: Iterable[SaleLine]) -> Decimal:
    """Fraction of sale quantity whose cost is known (0..1). Used to decide
    whether profit figures are trustworthy."""
    total = sum(int(l.quantity or 0) for l in lines)
    known = sum(int(l.quantity or 0) for l in lines if l.batch_purchase_known)
    return safe_div(known, total) if total > 0 else Decimal("0")


def gross_profit_paise(lines: Iterable[SaleLine]) -> Optional[int]:
    """Net revenue (tax) − COGS. None when NO line has a known cost
    (profit cannot be computed, not zero)."""
    if cogs_coverage(lines) == 0:
        return None
    return net_revenue_taxable_paise(lines) - cogs_paise(lines)


def gross_margin_pct(lines: Iterable[SaleLine]) -> Optional[Decimal]:
    """Gross profit / net revenue (tax) × 100. None on zero revenue or unknown
    costs — never a fabricated 0.0."""
    gp = gross_profit_paise(lines)
    if gp is None:
        return None
    net = net_revenue_taxable_paise(lines)
    if net == 0:
        return None
    return safe_div(gp, net) * 100


def contribution_margin_pct(lines: Iterable[SaleLine], variable_cost_paise_per_unit: Optional[dict] = None) -> Optional[Decimal]:
    """Contribution margin (revenue − variable costs) / revenue.

    Only computed when per-product variable costs are supplied — the data model
    does not carry them, so this returns None ("where data permits") otherwise.
    """
    if not variable_cost_paise_per_unit:
        return None
    total_rev = net_revenue_taxable_paise(lines)
    if total_rev == 0:
        return None
    var_total = sum(
        int(l.quantity or 0) * int(variable_cost_paise_per_unit.get(l.product_id, 0))
        for l in lines
    )
    return safe_div(total_rev - var_total, total_rev) * 100


# ──────────────────────────────── growth / velocity ─────────────────────────

def revenue_growth_pct(current_paise: Optional[int], previous_paise: Optional[int]) -> Optional[Decimal]:
    """% change vs previous period. None when previous is missing or zero."""
    return growth_pct(current_paise, previous_paise)


def velocity_per_day(units: int, days: int) -> Optional[Decimal]:
    """Units per day. None when days <= 0 (no comparable window)."""
    if days <= 0:
        return None
    return safe_div(units, days)


def days_of_inventory(on_hand_units: int, daily_velocity: Optional[Decimal]) -> Optional[Decimal]:
    """Days of supply at current velocity. None when velocity is 0/unknown."""
    if not daily_velocity or daily_velocity == 0:
        return None
    return safe_div(on_hand_units, daily_velocity)


# ──────────────────────────────── inventory ─────────────────────────────────

def inventory_value_paise(snapshot: Iterable[InventorySnapshot]) -> int:
    """Σ quantity × purchase price — the at-cost value of on-hand stock."""
    return sum(int(i.quantity or 0) * int(i.purchase_price_paise or 0) for i in snapshot)


def inventory_turnover(cogs_paise_value: int, avg_inventory_paise: Optional[int]) -> Optional[Decimal]:
    """COGS / average inventory value. None when average inventory is 0/unknown."""
    if not avg_inventory_paise:
        return None
    return safe_div(cogs_paise_value, avg_inventory_paise)


def sell_through_pct(sold_units: int, on_hand_units: int) -> Optional[Decimal]:
    """Units sold / (units sold + on hand). None when the denominator is 0."""
    return safe_div(sold_units, sold_units + on_hand_units)


# ──────────────────────────────── customer (pure helpers) ───────────────────

def customer_coverage(lines: Iterable[SaleLine]) -> Decimal:
    """Fraction of transactions that carry a customer_id (0..1)."""
    t = transactions(lines)
    if t == 0:
        return Decimal("0")
    with_customer = {l.invoice_id for l in lines if l.customer_id is not None and l.invoice_id is not None}
    return safe_div(len(with_customer), t)


def repeat_purchase_rate(lines: Iterable[SaleLine]) -> Optional[Decimal]:
    """Distinct customers with ≥2 transactions / distinct customers.

    None ("insufficient data") unless at least MIN_CUSTOMERS distinct customers
    are present — never a made-up percentage from a handful of rows.
    """
    MIN_CUSTOMERS = 10
    by_customer = Counter(l.customer_id for l in lines if l.customer_id is not None)
    n_customers = len(by_customer)
    if n_customers < MIN_CUSTOMERS:
        return None
    repeaters = sum(1 for c, n in by_customer.items() if n >= 2)
    return safe_div(repeaters, n_customers)


def purchase_frequency_per_customer(lines: Iterable[SaleLine]) -> Optional[Decimal]:
    """Total customer-tagged transactions / distinct customers. Gated on count."""
    MIN_CUSTOMERS = 10
    by_customer = Counter(l.customer_id for l in lines if l.customer_id is not None)
    if len(by_customer) < MIN_CUSTOMERS:
        return None
    txns = sum(by_customer.values())
    return safe_div(txns, len(by_customer))


def revenue_per_customer_paise(lines: Iterable[SaleLine]) -> Optional[int]:
    """Net revenue (tax) from customer-tagged lines / distinct customers. Gated."""
    MIN_CUSTOMERS = 10
    cust_lines = [l for l in lines if l.customer_id is not None]
    n = len({l.customer_id for l in cust_lines})
    if n < MIN_CUSTOMERS:
        return None
    return int(round(net_revenue_taxable_paise(cust_lines) / n))


# ──────────────────────────────── display helpers ───────────────────────────

def as_rupees(paise_value: Optional[int]) -> Optional[Decimal]:
    """Boundary conversion to rupees. None passes through unchanged."""
    if paise_value is None:
        return None
    return to_rupees(paise_value)
