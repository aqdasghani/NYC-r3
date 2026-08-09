"""
Canonical analytics — PURE unit tests (no DB), every expectation hand-computed.

Covers: money-unit normalization (the paise/rupees boundary matrix), core metric
functions, comparable-period time-series windows, anomalies, forecast gating and
chart payloads. The iron rules tested here:

  * ``None`` == "insufficient data" — NEVER a fabricated 0 / 0.0%.
  * equal-length comparison windows (a partial week vs the SAME days last week).
  * forecasts are gated on history quality and labeled ``kind``.
"""
import pytest
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from app.engines.analytics import metrics, normalize, timeseries
from app.engines.analytics.anomalies import detect_daily_anomalies, discount_share_anomaly
from app.engines.analytics.chart import category_performance, peak_hours, product_performance, weekday_breakdown
from app.engines.analytics.customer import summarize_customers
from app.engines.analytics.forecast import generate_forecast
from app.engines.analytics.inventory import stock_status, summary as inventory_summary
from app.engines.analytics.metrics import InventorySnapshot, SaleLine
from app.engines.analytics.normalize import (
    detect_scale, growth_pct, normalize_unit, round2, safe_div, scale_paise, to_rupees,
)


# ──────────────────────────── fixture: SaleLine builder ───────────────────────

def L(d="2026-08-01", qty=1, unit=1000, taxable=None, gst=0, line_total=None,
      gst_rate=0.0, inv=1, pid=1, name="P", cat="C", cust=None,
      batch=0, batch_known=False, ts=None):
    """Build a normalized SaleLine (money already paise)."""
    taxable = qty * unit if taxable is None else taxable
    line_total = taxable + gst if line_total is None else line_total
    return SaleLine(
        date=date.fromisoformat(d), quantity=qty, unit_price_paise=unit,
        taxable_paise=taxable, gst_paise=gst, line_total_paise=line_total,
        gst_rate=gst_rate, invoice_id=inv, product_id=pid, product_name=name,
        category=cat, customer_id=cust, batch_purchase_paise=batch,
        batch_purchase_known=batch_known, ts=ts,
    )


def INV(d="2026-08-01", qty=10, price=1000, pid=1, name="P", cat="C", expiry=None,
        last_sale=None, received=None):
    return InventorySnapshot(product_id=pid, product_name=name, category=cat,
                             batch_id=pid, quantity=qty, purchase_price_paise=price,
                             expiry_date=expiry, received_date=received,
                             last_sale_date=last_sale)


# ═══════════════════════════ normalize: boundary matrix ══════════════════════

class TestDetectScale:
    def test_rupee_scale_value(self):
        assert detect_scale(62.27, 62.27) == "rupees"      # ratio 1.0
        assert detect_scale(9.49, 9.49) == "rupees"
        assert detect_scale(99.0, 100.0) == "rupees"        # ratio 0.99

    def test_paise_scale_value(self):
        assert detect_scale(6227, 62.27) == "paise"         # ratio 100
        assert detect_scale(949, 9.49) == "paise"
        assert detect_scale(3050, 100.0) == "paise"         # ratio 30.5 ≥ 30

    def test_gray_zone_is_unknown(self):
        assert detect_scale(1000, 100.0) == "unknown"       # ratio 10 in [3, 30)
        assert detect_scale(500, 100.0) == "unknown"        # ratio 5

    def test_missing_reference(self):
        assert detect_scale(None, 100.0) == "unknown"
        assert detect_scale(100.0, None) == "unknown"
        assert detect_scale(100.0, 0) == "unknown"          # non-positive ref
        assert detect_scale(100.0, -5) == "unknown"

    def test_zero_value(self):
        assert detect_scale(0, 100.0) == "rupees"           # ratio 0 → rupees


class TestScalePaise:
    def test_rupee_to_paise(self):
        assert scale_paise(62.27, "rupees") == 6227
        assert scale_paise(0.05, "rupees") == 5

    def test_paise_stays_paise(self):
        assert scale_paise(6227, "paise") == 6227
        assert scale_paise(5, "paise") == 5

    def test_unknown_defaults_to_rupees(self):
        assert scale_paise(62.27, "unknown") == 6227

    def test_none_and_zero(self):
        assert scale_paise(None, "rupees") == 0
        assert scale_paise(0, "rupees") == 0

    def test_string_input(self):
        assert scale_paise("62.27", "rupees") == 6227

    def test_rounding(self):
        assert scale_paise(1.005, "rupees") == 101          # ROUND_HALF_UP
        assert scale_paise(1.004, "rupees") == 100


class TestNormalizeUnit:
    def test_both_scales_land_on_same_paise(self):
        # Rupee-scale 62.27 and paise-scale 6227 must normalize identically.
        assert normalize_unit(62.27, 62.27) == (6227, "high")
        assert normalize_unit(6227, 62.27) == (6227, "high")

    def test_missing_ref_falls_back_with_low_confidence(self):
        assert normalize_unit(1000, None) == (100000, "low")


class TestToRupees:
    def test_conversions(self):
        assert to_rupees(51487) == Decimal("514.87")
        assert to_rupees(949) == Decimal("9.49")
        assert to_rupees(5) == Decimal("0.05")
        assert to_rupees(0) == Decimal("0.00")

    def test_round_half_up(self):
        assert to_rupees(1) == Decimal("0.01")
        assert to_rupees(99) == Decimal("0.99")
        assert to_rupees(100) == Decimal("1.00")


class TestArithmetic:
    def test_safe_div(self):
        assert safe_div(10, 2) == Decimal("5")
        assert safe_div(1, 3) == Decimal("0.3333333333333333333333333333")
        assert safe_div(10, 0) is None                       # zero denom → None
        assert safe_div(None, 2) is None
        assert safe_div(10, None) is None

    def test_growth_pct(self):
        assert float(growth_pct(120, 100)) == pytest.approx(20.0)
        assert float(growth_pct(0, 100)) == pytest.approx(-100.0)
        assert growth_pct(100, 0) is None                    # zero baseline → None
        assert growth_pct(0, 0) is None
        assert growth_pct(None, 100) is None
        assert growth_pct(120, None) is None

    def test_round2(self):
        assert round2("1.2345") == Decimal("1.23")
        assert round2("1.235") == Decimal("1.24")            # half up


# ═══════════════════════════ metrics: hand-computed ══════════════════════════

class TestRevenue:
    def test_gross_revenue(self):
        lines = [L(qty=2, unit=1000), L(qty=3, unit=500)]
        assert metrics.gross_revenue_paise(lines) == 2000 + 1500

    def test_gross_revenue_empty(self):
        assert metrics.gross_revenue_paise([]) == 0

    def test_discounts_derived(self):
        lines = [L(qty=2, unit=1000, taxable=1800)]          # gross 2000, net 1800
        assert metrics.gross_revenue_paise(lines) == 2000
        assert metrics.net_revenue_taxable_paise(lines) == 1800
        assert metrics.discounts_paise(lines) == 200

    def test_gst_collected(self):
        assert metrics.gst_collected_paise([L(qty=1, unit=1000, gst=180)]) == 180

    def test_invoiced_net(self):
        lines = [L(qty=1, unit=1000, gst=180)]               # line_total = 1180
        assert metrics.net_revenue_invoiced_paise(lines) == 1180

    def test_net_taxable_falls_back_to_gross(self):
        # taxable not recorded → falls back to qty × unit.
        line = SaleLine(date=date(2026, 8, 1), quantity=2, unit_price_paise=1000,
                        taxable_paise=0, gst_paise=0, line_total_paise=2000)
        assert metrics.net_revenue_taxable_paise([line]) == 2000


class TestUnitsAndTransactions:
    def test_units_sold(self):
        lines = [L(qty=2), L(qty=3)]
        assert metrics.units_sold(lines) == 5

    def test_refund_line_reduces_units(self):
        lines = [L(qty=2, inv=1), L(qty=-1, inv=2)]
        assert metrics.units_sold(lines) == 1

    def test_transactions_distinct_invoices(self):
        lines = [L(qty=1, inv="a"), L(qty=1, inv="a"), L(qty=1, inv="b")]
        assert metrics.transactions(lines) == 2

    def test_transactions_empty(self):
        assert metrics.transactions([]) == 0

    def test_transactions_fallback_without_invoice_ids(self):
        lines = [L(qty=1, inv=None), L(qty=1, inv=None)]
        assert metrics.transactions(lines) == 2

    def test_refund_line_with_invoice_does_not_add_transaction(self):
        lines = [L(qty=1, inv="a"), L(qty=-1, inv="b")]
        assert metrics.transactions(lines) == 2              # both invoices exist


class TestAovBasket:
    def test_aov(self):
        lines = [L(qty=2, unit=1000, taxable=2000, inv=1),
                 L(qty=3, unit=1000, taxable=3000, inv=2)]
        assert metrics.average_order_value_paise(lines) == 2500   # 5000 / 2

    def test_aov_insufficient(self):
        assert metrics.average_order_value_paise([]) is None

    def test_basket_size(self):
        lines = [L(qty=2, inv=1), L(qty=3, inv=2)]
        assert float(metrics.average_basket_size(lines)) == pytest.approx(2.5)

    def test_basket_insufficient(self):
        assert metrics.average_basket_size([]) is None


class TestProfit:
    def test_cogs_from_batch(self):
        lines = [L(qty=2, batch=400, batch_known=True)]
        assert metrics.cogs_paise(lines) == 800
        assert metrics.cogs_coverage(lines) == Decimal("1")

    def test_gross_profit_and_margin(self):
        lines = [L(qty=2, unit=1000, taxable=2000, batch=600, batch_known=True)]
        assert metrics.gross_profit_paise(lines) == 2000 - 1200
        assert float(metrics.gross_margin_pct(lines)) == pytest.approx(40.0)

    def test_margin_missing_costs_is_none(self):
        lines = [L(qty=2, taxable=2000)]                     # no cost known
        assert metrics.gross_profit_paise(lines) is None
        assert metrics.gross_margin_pct(lines) is None
        assert metrics.cogs_coverage(lines) == Decimal("0")

    def test_margin_zero_revenue_is_none(self):
        lines = [L(qty=0, taxable=0, batch=100, batch_known=True)]
        assert metrics.gross_margin_pct(lines) is None

    def test_partial_cost_coverage(self):
        lines = [L(qty=2, taxable=2000, batch=500, batch_known=True),
                 L(qty=2, taxable=2000)]                     # second line unknown cost
        assert float(metrics.cogs_coverage(lines)) == pytest.approx(0.5)
        # profit = net − known cogs only (unknown contributes 0)
        assert metrics.gross_profit_paise(lines) == 4000 - 1000

    def test_contribution_margin(self):
        lines = [L(qty=2, taxable=2000, pid=1)]
        # no variable-cost data → None ("where data permits")
        assert metrics.contribution_margin_pct(lines) is None
        with_var = {1: 300}
        assert float(metrics.contribution_margin_pct(lines, with_var)) == pytest.approx(70.0)
        # 2000 − 2×300 = 1400 ; 1400/2000 = 70%

    def test_contribution_margin_zero_revenue(self):
        assert metrics.contribution_margin_pct([], {1: 100}) is None

    def test_negative_profit_is_legitimate(self):
        lines = [L(qty=2, taxable=1000, batch=800, batch_known=True)]
        assert metrics.gross_profit_paise(lines) == 1000 - 1600   # −600, not None
        assert float(metrics.gross_margin_pct(lines)) == pytest.approx(-60.0)


class TestGrowthVelocity:
    def test_revenue_growth(self):
        assert float(metrics.revenue_growth_pct(1200, 1000)) == pytest.approx(20.0)
        assert metrics.revenue_growth_pct(1200, 0) is None
        assert metrics.revenue_growth_pct(1200, None) is None

    def test_velocity_per_day(self):
        assert float(metrics.velocity_per_day(140, 7)) == pytest.approx(20.0)
        assert metrics.velocity_per_day(10, 0) is None

    def test_days_of_inventory(self):
        assert float(metrics.days_of_inventory(100, Decimal("20"))) == pytest.approx(5.0)
        assert metrics.days_of_inventory(100, None) is None
        assert metrics.days_of_inventory(100, Decimal("0")) is None


class TestInventoryMetrics:
    def test_value(self):
        snap = [INV(qty=10, price=1000), INV(qty=5, price=500)]
        assert metrics.inventory_value_paise(snap) == 12500

    def test_turnover(self):
        assert float(metrics.inventory_turnover(100000, 25000)) == pytest.approx(4.0)
        assert metrics.inventory_turnover(100000, 0) is None
        assert metrics.inventory_turnover(100000, None) is None

    def test_sell_through(self):
        assert float(metrics.sell_through_pct(30, 70)) == pytest.approx(0.3)
        assert metrics.sell_through_pct(0, 0) is None        # zero denom


class TestCustomerMetrics:
    def test_coverage(self):
        lines = [L(qty=1, inv=1, cust="c1"), L(qty=1, inv=2)]
        assert float(metrics.customer_coverage(lines)) == pytest.approx(0.5)

    def test_repeat_rate_gated(self):
        # fewer than 10 customers → None, never a fabricated %
        lines = [L(qty=1, inv=i, cust=f"c{i}") for i in range(5)]
        assert metrics.repeat_purchase_rate(lines) is None

    def test_repeat_rate_hand_computed(self):
        # 12 tagged transactions; distinct customers = {c1, c2, c4..c11} = 10.
        # c1 and c2 each shop twice → repeat rate = 2/10, gated at >= 10 customers.
        lines = [L(qty=1, inv=i, cust="c1" if i < 2 else "c2" if i < 4 else f"c{i}")
                 for i in range(12)]
        assert float(metrics.repeat_purchase_rate(lines)) == pytest.approx(2 / 10)

    def test_revenue_per_customer_gated(self):
        lines = [L(qty=1, inv=i, cust=f"c{i}") for i in range(5)]
        assert metrics.revenue_per_customer_paise(lines) is None

    def test_as_rupees_none_passthrough(self):
        assert metrics.as_rupees(None) is None
        assert metrics.as_rupees(949) == Decimal("9.49")


# ═══════════════════════ timeseries: comparable windows ══════════════════════

class TestComparablePeriods:
    def test_week_equal_length(self):
        # Wed 2026-08-12 → N=3 elapsed days this week (Mon 10, Tue 11, Wed 12)
        cur, prev = timeseries.comparable_periods("week", today=date(2026, 8, 12))
        assert cur.start == date(2026, 8, 10)
        assert cur.end == date(2026, 8, 12)
        assert cur.elapsed_days == 3
        assert prev.start == date(2026, 8, 3)
        assert prev.end == date(2026, 8, 5)
        assert prev.elapsed_days == 3                       # SAME length, not 7
        assert cur.is_partial and not prev.is_partial

    def test_month_equal_length(self):
        # Aug 12 → MTD 12 days vs Jul 1..12 (12 days)
        cur, prev = timeseries.comparable_periods("month", today=date(2026, 8, 12))
        assert cur.start == date(2026, 8, 1)
        assert cur.end == date(2026, 8, 12)
        assert prev.start == date(2026, 7, 1)
        assert prev.end == date(2026, 7, 12)
        assert cur.elapsed_days == prev.elapsed_days == 12

    def test_month_short_month_clamps(self):
        # Feb 10 → prev Jan 1..10; Jan always has ≥10 days
        cur, prev = timeseries.comparable_periods("month", today=date(2026, 2, 10))
        assert prev.end == date(2026, 1, 10)
        # March 31 → prev Feb 1..28 (clamped to Feb's last day)
        cur, prev = timeseries.comparable_periods("month", today=date(2026, 3, 31))
        assert prev.end == date(2026, 2, 28)
        assert prev.elapsed_days == 31 == cur.elapsed_days

    def test_rolling7_complete_windows(self):
        cur, prev = timeseries.comparable_periods("rolling7", today=date(2026, 8, 12))
        assert cur.end == date(2026, 8, 11)                 # yesterday, not today
        assert cur.start == date(2026, 8, 5)
        assert prev.end == date(2026, 8, 4)
        assert prev.start == date(2026, 7, 29)
        assert not cur.is_partial and not prev.is_partial

    def test_today_intraday_windows(self):
        now = datetime(2026, 8, 12, 14, 30)
        cur, prev = timeseries.comparable_periods("today", today=date(2026, 8, 12), now=now)
        assert cur.start_ts == datetime(2026, 8, 12, 0, 0)
        assert cur.end_ts == now
        assert prev.start_ts == datetime(2026, 8, 11, 0, 0)
        assert prev.end_ts == datetime(2026, 8, 11, 14, 30)  # same clock time

    def test_unknown_kind_raises(self):
        with pytest.raises(ValueError):
            timeseries.comparable_periods("fortnight")


class TestDailySeries:
    def test_zero_filled_and_ordered(self):
        lines = [L(d="2026-08-02", qty=2, unit=1000, inv=1),
                 L(d="2026-08-02", qty=1, unit=500, inv=1),
                 L(d="2026-08-04", qty=1, unit=700, inv=2)]
        series = timeseries.daily_series(lines, days=5, end_date=date(2026, 8, 5))
        assert len(series) == 5
        assert series[0]["date"] == "2026-08-01"
        assert series[0]["revenue_paise"] == 0              # zero-filled day
        assert series[1]["date"] == "2026-08-02"
        assert series[1]["revenue_paise"] == 2500           # 2000 + 500
        assert series[1]["units"] == 3
        assert series[1]["orders"] == 1                     # one invoice that day
        assert series[3]["revenue_paise"] == 700
        assert series[4]["revenue_paise"] == 0

    def test_out_of_window_excluded(self):
        lines = [L(d="2026-08-01", qty=1), L(d="2026-08-10", qty=1)]
        series = timeseries.daily_series(lines, days=7, end_date=date(2026, 8, 7))
        assert sum(p["units"] for p in series) == 1


class TestAggregateBlock:
    def test_full_block_hand_computed(self):
        lines = [
            L(qty=2, unit=1000, taxable=1800, gst=162, inv=1, batch=400, batch_known=True),
            L(qty=1, unit=500, taxable=500, gst=45, inv=2, batch=200, batch_known=True),
        ]
        agg = timeseries.aggregate_lines(lines)
        assert agg["gross_revenue_paise"] == 2500
        assert agg["net_revenue_paise"] == 2300
        assert agg["discounts_paise"] == 200
        assert agg["gst_collected_paise"] == 207
        assert agg["invoiced_paise"] == 2300 + 207
        assert agg["cogs_paise"] == 2 * 400 + 1 * 200
        assert agg["gross_profit_paise"] == 2300 - 1000
        assert float(agg["gross_margin_pct"]) == pytest.approx(1300 / 2300 * 100)
        assert agg["units"] == 3
        assert agg["transactions"] == 2
        assert agg["aov_paise"] == 1150
        assert float(agg["basket_size"]) == pytest.approx(1.5)
        assert agg["net_revenue"] == Decimal("23.00")

    def test_empty_block_insufficient_not_zero(self):
        agg = timeseries.aggregate_lines([])
        assert agg["gross_profit_paise"] is None
        assert agg["gross_margin_pct"] is None
        assert agg["aov_paise"] is None
        assert agg["basket_size"] is None
        assert agg["transactions"] == 0


class TestComparePeriods:
    def test_growth_equal_length_windows(self):
        today = date(2026, 8, 12)
        cur, prev = timeseries.comparable_periods("week", today=today)
        lines = [
            L(d="2026-08-10", qty=1, unit=1000, taxable=1000, inv=1),   # this week
            L(d="2026-08-03", qty=1, unit=500, taxable=500, inv=2),     # last week
            L(d="2026-08-02", qty=1, unit=1000, taxable=1000, inv=3),   # outside both
        ]
        cmp = timeseries.compare_periods(cur, prev, lines)
        assert cmp["current"]["net_revenue_paise"] == 1000
        assert cmp["previous"]["net_revenue_paise"] == 500
        assert float(cmp["net_revenue_growth_pct"]) == pytest.approx(100.0)

    def test_growth_zero_baseline_is_none(self):
        today = date(2026, 8, 12)
        cur, prev = timeseries.comparable_periods("week", today=today)
        lines = [L(d="2026-08-10", qty=1, unit=1000, taxable=1000, inv=1)]
        cmp = timeseries.compare_periods(cur, prev, lines)
        assert cmp["net_revenue_growth_pct"] is None       # prev revenue 0
        assert cmp["current"]["net_revenue_paise"] == 1000
        assert cmp["previous"]["net_revenue_paise"] == 0


class TestTrendDirection:
    def test_insufficient_under_7_points(self):
        r = timeseries.trend_direction([1.0, 2.0, 3.0])
        assert r["direction"] == "insufficient"

    def test_increasing(self):
        r = timeseries.trend_direction([10.0] * 4 + [15.0] * 4)
        assert r["direction"] == "INCREASING"

    def test_decreasing(self):
        r = timeseries.trend_direction([15.0] * 4 + [10.0] * 4)
        assert r["direction"] == "DECREASING"

    def test_stable(self):
        r = timeseries.trend_direction([10.0] * 8)
        assert r["direction"] == "STABLE"

    def test_spike(self):
        r = timeseries.trend_direction([10.0] * 4 + [20.0] * 4)
        assert r["direction"] == "SPIKE"


# ═══════════════════════ anomalies: gated, evidence-backed ═══════════════════

class TestAnomalies:
    def _daily(self, values, start="2026-08-01"):
        days = []
        for i, v in enumerate(values):
            d = (date.fromisoformat(start) + timedelta(days=i)).isoformat()
            days.append({"date": d, "revenue_paise": v, "units": v // 100})
        return days

    def test_flat_series_no_anomalies(self):
        points = self._daily([5000] * 14)
        assert detect_daily_anomalies(points, today=date(2026, 8, 14)) == []

    def test_spike_is_flagged_with_evidence(self):
        # 56-day window (8 Mondays), baseline ₹10/day, one 100× Monday spike.
        # The spike is the MAX possible z for an 8-sample group (sqrt(7)~2.65),
        # so it clears Z_THRESHOLD=2.5 even though it dilutes its own baseline.
        start = date(2026, 6, 16)
        points = []
        for i in range(56):
            d = start + timedelta(days=i)
            v = 100000 if d == date(2026, 8, 10) else 1000
            points.append({"date": d.isoformat(), "revenue_paise": v, "units": v // 100})
        out = detect_daily_anomalies(points, today=date(2026, 8, 10))
        spike = next(a for a in out if a["metric"] == "revenue" and a["direction"] == "SPIKE")
        assert spike["z"] >= 2.5
        assert spike["actual"] == 100000
        assert spike["date"] == "2026-08-10"

    def test_short_series_insufficient(self):
        assert detect_daily_anomalies(self._daily([5000] * 5), today=date(2026, 8, 5)) == []

    def test_discount_anomaly_none_for_short_window(self):
        assert discount_share_anomaly([L(d="2026-08-01", qty=1) for _ in range(5)]) is None


# ═══════════════════════ forecast: data-quality gated ════════════════════════

class TestForecast:
    def test_insufficient_when_no_data(self):
        r = generate_forecast([0.0] * 60)
        assert r["kind"] == "insufficient"
        assert "Insufficient data" in r["reason"]

    def test_insufficient_when_history_short(self):
        r = generate_forecast([10.0] * 10)
        assert r["kind"] == "insufficient"

    def test_forecast_shape_and_band(self):
        series = [50.0 + (i % 5) * 3 for i in range(60)]     # 60 nonzero points
        r = generate_forecast(series, horizon=7)
        assert r["kind"] == "forecast"
        assert r["method"].startswith("SES")
        assert len(r["forecast"]) == 7
        assert len(r["actual"]) == 60
        for pt in r["forecast"]:
            assert pt["day"] >= 1
            assert pt["units"] >= 0
            assert 0 <= pt["lo"] <= pt["units"] <= pt["hi"]  # band brackets the point
            assert pt["hi"] >= pt["lo"]

    def test_persistence_flat_level(self):
        series = [100.0] * 60
        r = generate_forecast(series, horizon=3)
        assert r["forecast"][0]["units"] == pytest.approx(100.0, abs=0.5)
        assert r["residual_std"] == pytest.approx(0.0, abs=1e-9)


# ═══════════════════════ chart: labels/units/shares ══════════════════════════

class TestChart:
    def test_category_performance(self):
        lines = [
            L(qty=2, unit=1000, pid=1, name="Milk", cat="Dairy"),
            L(qty=1, unit=500, pid=2, name="Paneer", cat="Dairy"),
            L(qty=3, unit=400, pid=3, name="Chips", cat="Snacks"),
        ]
        cats = category_performance(lines)
        assert {c["category"] for c in cats} == {"Dairy", "Snacks"}
        dairy = next(c for c in cats if c["category"] == "Dairy")
        assert dairy["revenue_paise"] == 2000 + 500
        assert dairy["revenue"] == Decimal("25.00")
        assert dairy["units"] == 3
        assert float(dairy["share_pct"]) == pytest.approx(2500 / 3700 * 100, abs=0.1)

    def test_category_performance_sorted_desc(self):
        lines = [L(qty=1, unit=100, cat="Low"), L(qty=1, unit=900, cat="High")]
        cats = category_performance(lines)
        assert [c["category"] for c in cats] == ["High", "Low"]

    def test_category_share_none_on_zero_total(self):
        cats = category_performance([])
        assert cats == []

    def test_product_performance(self):
        lines = [L(qty=1, unit=1000, inv=1, pid=1, name="A"),
                 L(qty=1, unit=1000, inv=2, pid=1, name="A"),
                 L(qty=1, unit=500, inv=3, pid=2, name="B")]
        prods = product_performance(lines)
        a = next(p for p in prods if p["name"] == "A")
        assert a["transactions"] == 2
        assert a["revenue_paise"] == 2000
        assert [p["name"] for p in prods] == ["A", "B"]

    def test_peak_hours_labels(self):
        ts1 = datetime(2026, 8, 1, 18, 30)
        ts2 = datetime(2026, 8, 2, 18, 5)
        lines = [L(qty=1, unit=1000, inv=1, ts=ts1), L(qty=1, unit=1000, inv=2, ts=ts2)]
        hours = peak_hours(lines)
        assert hours[18]["orders"] == 2
        assert hours[18]["revenue_paise"] == 2000
        assert hours[18]["label"] == "18:00"
        assert hours[0]["orders"] == 0
        assert hours[0]["label"] == "00:00"

    def test_weekday_breakdown(self):
        lines = [L(d="2026-08-03", qty=1, unit=1000)]        # Monday
        wd = weekday_breakdown(lines)
        assert wd[0]["day_name"] == "Monday"
        assert wd[0]["revenue_paise"] == 1000
        assert sum(x["revenue_paise"] for x in wd) == 1000


# ═══════════════════════ customer summary: gated ═════════════════════════════

class TestCustomerSummary:
    def test_insufficient_small_sample(self):
        lines = [L(qty=1, inv=i, cust=f"c{i}") for i in range(5)]
        s = summarize_customers(lines)
        assert s["insufficient"] is True
        assert s["repeat_purchase_rate"] is None
        assert s["revenue_per_customer_paise"] is None
        assert s["retention_rate"] is None

    def test_insufficient_no_customer_ids(self):
        lines = [L(qty=1, inv=i) for i in range(20)]         # no customer tags
        s = summarize_customers(lines)
        assert s["customers_with_id"] == 0
        assert s["customer_coverage"] == Decimal("0")
        assert s["repeat_purchase_rate"] is None
        assert s["revenue_per_customer_paise"] is None

    def test_coverage_reported(self):
        lines = [L(qty=1, inv=1, cust="c1"), L(qty=1, inv=2)]
        s = summarize_customers(lines)
        assert float(s["customer_coverage"]) == pytest.approx(0.5)


# ═══════════════════════ inventory stock status ══════════════════════════════

class TestStockStatus:
    def test_dead_stock(self):
        today = date(2026, 8, 12)
        snap = [INV(qty=10, last_sale=date(2026, 5, 1))]      # 103 days idle
        rows = stock_status(snap, [], today=today)
        assert rows[0]["status"] == "DEAD"

    def test_fast_mover(self):
        today = date(2026, 8, 12)
        snap = [INV(qty=40, last_sale=date(2026, 8, 10), pid=1)]
        sales = [L(d="2026-08-11", qty=10, pid=1, inv=1),
                 L(d="2026-08-10", qty=10, pid=1, inv=2)]     # 20 units / 14 days
        rows = stock_status(snap, sales, today=today)
        row = next(r for r in rows if r["product_id"] == 1)
        assert row["status"] == "FAST"                        # cover 40/1.43 ≈ 28 ≤ 30

    def test_expiry_risk(self):
        today = date(2026, 8, 12)
        snap = [INV(qty=10, expiry=date(2026, 8, 18), last_sale=date(2026, 8, 10), pid=1)]
        rows = stock_status(snap, [], today=today)
        assert rows[0]["status"] == "EXPIRY_RISK"

    def test_summary_counts(self):
        today = date(2026, 8, 12)
        snap = [INV(qty=10, last_sale=date(2026, 5, 1), pid=1)]       # dead
        snap += [INV(qty=10, last_sale=date(2026, 8, 10), pid=2)]      # no velocity → NORMAL
        s = inventory_summary(snap, [], today=today)
        assert s["products_on_hand"] == 2
        assert s["stock_health"]["dead"] == 1
        assert s["stock_health"]["normal"] == 1
