"""
Customer analytics — every metric is gated on sample size and returns
"insufficient data" (None) when it cannot be computed reliably.

There is no Customers table: customer identity is ``Invoice.customer_id``, which
is currently unpopulated for POS walk-ins. These functions therefore honestly
report insufficient coverage instead of inventing retention/LTV percentages.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from typing import Iterable, Optional

from .metrics import SaleLine, customer_coverage, net_revenue_taxable_paise, \
    purchase_frequency_per_customer, repeat_purchase_rate, \
    revenue_per_customer_paise, transactions
from .normalize import safe_div, to_rupees

MIN_CUSTOMERS = 10     # below this, no customer metric is reported


def summarize_customers(lines: Iterable[SaleLine]) -> dict:
    """Customer summary with explicit insufficiency. Every money figure in paise
    plus a rupee display copy; every ratio None (= "Insufficient data") when
    the sample is too small."""
    sl = list(lines)
    t = transactions(sl)
    coverage = customer_coverage(sl)

    # per-customer transaction counts, limited to tagged lines
    by_customer = Counter(l.customer_id for l in sl if l.customer_id is not None)
    n_customers = len(by_customer)

    total = {
        "customers_with_id": n_customers,
        "transactions": t,
        "customer_coverage": coverage,          # fraction of txns tagged
        "insufficient": n_customers < MIN_CUSTOMERS,
        "repeat_purchase_rate": repeat_purchase_rate(sl),
        "purchase_frequency": purchase_frequency_per_customer(sl),
        "revenue_per_customer_paise": revenue_per_customer_paise(sl),
        "revenue_per_customer": to_rupees(revenue_per_customer_paise(sl)) if revenue_per_customer_paise(sl) is not None else None,
    }

    # retention: same customer active in both the first and second half of the
    # window (cohort-style, gated on ≥ 2 periods of history).
    first_dates: dict = {}
    last_dates: dict = {}
    for l in sl:
        if l.customer_id is None:
            continue
        if l.customer_id not in first_dates or l.date < first_dates[l.customer_id]:
            first_dates[l.customer_id] = l.date
        if l.customer_id not in last_dates or l.date > last_dates[l.customer_id]:
            last_dates[l.customer_id] = l.date
    if n_customers >= MIN_CUSTOMERS and first_dates and last_dates:
        min_date = min(first_dates.values())
        max_date = max(last_dates.values())
        span = (max_date - min_date).days
        if span >= 14:
            mid = min_date + (max_date - min_date) / 2
            active_first = {c for c, d in first_dates.items() if d <= mid}
            active_late = {c for c, d in last_dates.items() if d > mid}
            retained = active_first & active_late
            total["retention_rate"] = safe_div(len(retained), len(active_first))
            total["churn_rate"] = safe_div(len(active_first) - len(retained), len(active_first))
            total["new_customers"] = sum(1 for c in by_customer if first_dates[c] >= mid)
            total["returning_customers"] = sum(1 for c in by_customer if first_dates[c] < mid and last_dates[c] >= mid)
        else:
            total["retention_rate"] = None
            total["churn_rate"] = None
    else:
        total["retention_rate"] = None
        total["churn_rate"] = None

    return total
