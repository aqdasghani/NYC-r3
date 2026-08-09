"""
Canonical analytics — DB-backed engine tests on the in-memory ``memdb`` fixture.

No seed, no HTTP client → immune to the known SQLite lock contention. The core
regression here: a **rupee-scale** row and a **paise-scale** row in the same
columns must normalize to the SAME integer-paise values, so the live-DB 100×
inflation bug can never reappear through this layer.
"""
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal

import pytest

from app.models.database import (
    InventoryBatch, Invoice, InvoiceItem, Product, Return, Store,
)
from app.engines.analytics import (
    calculate_growth, calculate_inventory_value, calculate_revenue,
    calculate_sell_through, detect_anomalies, generate_forecast,
    load_inventory, load_returns, load_sales,
)

TODAY = date(2026, 8, 12)
NOW = datetime(2026, 8, 12, 15, 0)


# ──────────────────────────── model builder helpers ──────────────────────────

def _store(memdb) -> Store:
    s = Store(name="Canonical Store")
    memdb.add(s)
    memdb.flush()
    return s


def _product(memdb, store, name="Milk", selling=62.27, purchase=40.0, gst=5.0) -> Product:
    p = Product(store_id=store.id, name=name, selling_price=selling,
                purchase_price=purchase, gst_rate=gst)
    memdb.add(p)
    memdb.flush()
    return p


def _batch(memdb, store, product, qty=100, price=40.0) -> InventoryBatch:
    b = InventoryBatch(store_id=store.id, product_id=product.id, quantity=qty,
                       purchase_price=price,
                       expiry_date=TODAY + timedelta(days=30),
                       received_date=TODAY - timedelta(days=10),
                       last_sale_date=TODAY - timedelta(days=1))
    memdb.add(b)
    memdb.flush()
    return b


def _invoice(memdb, store, created, number=None, cust=None) -> Invoice:
    inv = Invoice(invoice_number=number or f"INV-{uuid.uuid4().hex[:8]}",
                  store_id=store.id, created_at=created, customer_id=cust)
    memdb.add(inv)
    memdb.flush()
    return inv


def _item(memdb, invoice, product, batch, qty, unit, taxable, gst_amt, line_total,
          gst_rate=5.0, discount=0) -> InvoiceItem:
    it = InvoiceItem(invoice_id=invoice.id, product_id=product.id, batch_id=batch.id,
                     quantity=qty, unit_price=unit, discount_amount=discount,
                     taxable_amount=taxable, gst_rate=gst_rate, gst_amount=gst_amt,
                     line_total=line_total)
    memdb.add(it)
    memdb.flush()
    return it


# ═══════════════ the money-scale regression (the headline bug) ═══════════════

class TestScaleRegression:
    def test_rupee_and_paise_rows_normalize_identically(self, memdb):
        store = _store(memdb)
        milk = _product(memdb, store)                       # selling 62.27
        batch = _batch(memdb, store, milk)                  # cost 40.0 rupees

        # RUPEE-scale row (what the seed writes): 62.27, 124.54, ...
        inv_r = _invoice(memdb, store, datetime(2026, 8, 12, 10, 0))
        _item(memdb, inv_r, milk, batch, qty=2, unit=62.27, taxable=124.54,
              gst_amt=7.47, line_total=132.01)

        # PAISE-scale row (what the live POS writes): 6227, 6227, ...
        inv_p = _invoice(memdb, store, datetime(2026, 8, 12, 11, 0))
        _item(memdb, inv_p, milk, batch, qty=1, unit=6227, taxable=6227,
              gst_amt=373, line_total=6600)

        lines = load_sales(memdb, store.id)
        assert len(lines) == 2
        rupee_row = next(l for l in lines if l.invoice_id == inv_r.id)
        paise_row = next(l for l in lines if l.invoice_id == inv_p.id)

        # BOTH rows land on 6227 paise — never 100× apart.
        assert rupee_row.unit_price_paise == 6227
        assert paise_row.unit_price_paise == 6227
        assert rupee_row.taxable_paise == 12454
        assert paise_row.taxable_paise == 6227
        assert rupee_row.gst_paise == 747
        assert paise_row.gst_paise == 373
        assert rupee_row.line_total_paise == 13201
        assert paise_row.line_total_paise == 6600

        # COGS resolves from batch cost (40.0 rupees → 4000 paise) on both.
        assert rupee_row.batch_purchase_paise == 4000
        assert paise_row.batch_purchase_paise == 4000
        assert rupee_row.batch_purchase_known and paise_row.batch_purchase_known

    def test_small_price_scale(self, memdb):
        """A ₹9.49 product (small price) must not confuse the scale detector."""
        store = _store(memdb)
        item = _product(memdb, store, name="Tofu", selling=9.49, purchase=6.0)
        batch = _batch(memdb, store, item)
        inv = _invoice(memdb, store, datetime(2026, 8, 12, 10, 0))
        _item(memdb, inv, item, batch, qty=1, unit=949, taxable=949, gst_amt=0,
              line_total=949)
        lines = load_sales(memdb, store.id)
        assert lines[0].unit_price_paise == 949            # ₹9.49, not 100× larger


# ═══════════════════════════ engine function tests ═══════════════════════════

class TestCalculateRevenue:
    def test_full_block(self, memdb):
        store = _store(memdb)
        milk = _product(memdb, store)
        batch = _batch(memdb, store, milk)
        inv1 = _invoice(memdb, store, datetime(2026, 8, 12, 10, 0))
        _item(memdb, inv1, milk, batch, qty=2, unit=62.27, taxable=124.54,
              gst_amt=7.47, line_total=132.01)
        inv2 = _invoice(memdb, store, datetime(2026, 8, 11, 10, 0))
        _item(memdb, inv2, milk, batch, qty=1, unit=6227, taxable=6227,
              gst_amt=373, line_total=6600)

        r = calculate_revenue(memdb, store.id)
        # gross = 2×6227 + 1×6227 ; taxable = 12454 + 6227
        assert r["gross_revenue_paise"] == 3 * 6227
        assert r["net_revenue_paise"] == 12454 + 6227
        assert r["discounts_paise"] == 0
        assert r["gst_collected_paise"] == 747 + 373
        assert r["invoiced_paise"] == 13201 + 6600
        assert r["cogs_paise"] == 2 * 4000 + 1 * 4000
        assert r["gross_profit_paise"] == (12454 + 6227) - 12000
        assert r["transactions"] == 2
        assert r["aov_paise"] == (12454 + 6227) // 2
        assert r["net_revenue"] == Decimal("186.81")

    def test_empty_store_is_insufficient_not_zero(self, memdb):
        store = _store(memdb)
        r = calculate_revenue(memdb, store.id)
        assert r["transactions"] == 0
        assert r["gross_profit_paise"] is None
        assert r["gross_margin_pct"] is None
        assert r["aov_paise"] is None


class TestWindowFiltering:
    def test_load_sales_start_end(self, memdb):
        store = _store(memdb)
        milk = _product(memdb, store)
        batch = _batch(memdb, store, milk)
        inv_early = _invoice(memdb, store, datetime(2026, 8, 1, 9, 0))
        _item(memdb, inv_early, milk, batch, qty=1, unit=62.27, taxable=62.27,
              gst_amt=3.11, line_total=65.38)
        inv_late = _invoice(memdb, store, datetime(2026, 8, 12, 9, 0))
        _item(memdb, inv_late, milk, batch, qty=1, unit=6227, taxable=6227,
              gst_amt=311, line_total=6538)

        window = load_sales(memdb, store.id,
                            start=datetime(2026, 8, 10), end=datetime(2026, 8, 13))
        assert [l.invoice_id for l in window] == [inv_late.id]

    def test_other_store_isolated(self, memdb):
        s1, s2 = _store(memdb), _store(memdb)
        p1 = _product(memdb, s1)
        p2 = _product(memdb, s2, name="Other")
        b1 = _batch(memdb, s1, p1)
        b2 = _batch(memdb, s2, p2)
        inv1 = _invoice(memdb, s1, datetime(2026, 8, 12, 9, 0))
        _item(memdb, inv1, p1, b1, qty=1, unit=6227, taxable=6227, gst_amt=0, line_total=6227)
        inv2 = _invoice(memdb, s2, datetime(2026, 8, 12, 9, 0))
        _item(memdb, inv2, p2, b2, qty=5, unit=5000, taxable=5000, gst_amt=0, line_total=5000)
        assert len(load_sales(memdb, s1.id)) == 1
        assert len(load_sales(memdb, s2.id)) == 1


class TestCalculateGrowth:
    def test_today_vs_yesterday_same_clock_window(self, memdb):
        store = _store(memdb)
        milk = _product(memdb, store)
        batch = _batch(memdb, store, milk)
        # today 10:00 → inside today window (now 15:00)
        inv_today = _invoice(memdb, store, datetime(2026, 8, 12, 10, 0))
        _item(memdb, inv_today, milk, batch, qty=2, unit=6227, taxable=12454,
              gst_amt=747, line_total=13201)
        # yesterday 10:00 → inside yesterday's same-clock window
        inv_prev = _invoice(memdb, store, datetime(2026, 8, 11, 10, 0))
        _item(memdb, inv_prev, milk, batch, qty=1, unit=6227, taxable=6227,
              gst_amt=373, line_total=6600)

        g = calculate_growth(memdb, store.id, kind="today", today=TODAY, now=NOW)
        assert g["current"]["net_revenue_paise"] == 12454
        assert g["previous"]["net_revenue_paise"] == 6227
        assert float(g["net_revenue_growth_pct"]) == pytest.approx(100.0)

    def test_zero_previous_growth_is_none(self, memdb):
        store = _store(memdb)
        milk = _product(memdb, store)
        batch = _batch(memdb, store, milk)
        inv_today = _invoice(memdb, store, datetime(2026, 8, 12, 10, 0))
        _item(memdb, inv_today, milk, batch, qty=1, unit=6227, taxable=6227,
              gst_amt=373, line_total=6600)
        g = calculate_growth(memdb, store.id, kind="today", today=TODAY, now=NOW)
        assert g["current"]["net_revenue_paise"] == 6227
        assert g["previous"]["net_revenue_paise"] == 0
        assert g["net_revenue_growth_pct"] is None          # never fabricated 0.0


class TestInventory:
    def test_inventory_value_from_batches(self, memdb):
        store = _store(memdb)
        p1 = _product(memdb, store, name="Milk")
        p2 = _product(memdb, store, name="Cheese", selling=200.0, purchase=150.0)
        _batch(memdb, store, p1, qty=100, price=40.0)        # 100×4000
        _batch(memdb, store, p2, qty=10, price=150.0)        # 10×15000
        v = calculate_inventory_value(memdb, store.id)
        assert v["inventory_value_paise"] == 100 * 4000 + 10 * 15000
        assert v["inventory_value"] == Decimal("5500.00")    # 550000 paise = ₹5500.00

    def test_zero_quantity_batch_excluded(self, memdb):
        store = _store(memdb)
        p = _product(memdb, store)
        _batch(memdb, store, p, qty=0)
        assert load_inventory(memdb, store.id) == []
        assert calculate_inventory_value(memdb, store.id)["inventory_value_paise"] == 0

    def test_sell_through(self, memdb):
        store = _store(memdb)
        milk = _product(memdb, store)
        batch = _batch(memdb, store, milk, qty=100)
        inv = _invoice(memdb, store, datetime(2026, 8, 12, 10, 0))
        _item(memdb, inv, milk, batch, qty=2, unit=6227, taxable=12454,
              gst_amt=747, line_total=13201)
        st = calculate_sell_through(memdb, store.id)
        assert float(st) == pytest.approx(2 / (2 + 100))

    def test_sell_through_insufficient(self, memdb):
        store = _store(memdb)
        assert calculate_sell_through(memdb, store.id) is None


class TestAnomaliesForecast:
    def test_detect_anomalies_no_crash_small_data(self, memdb):
        store = _store(memdb)
        milk = _product(memdb, store)
        batch = _batch(memdb, store, milk)
        for i in range(3):
            inv = _invoice(memdb, store, datetime(2026, 8, 10 + i, 10, 0))
            _item(memdb, inv, milk, batch, qty=1, unit=6227, taxable=6227,
                  gst_amt=373, line_total=6600)
        a = detect_anomalies(memdb, store.id, today=TODAY)
        assert a["daily_anomalies"] == []
        assert a["has_enough_data"] is False

    def test_generate_forecast_insufficient_small_data(self, memdb):
        store = _store(memdb)
        milk = _product(memdb, store)
        batch = _batch(memdb, store, milk)
        for i in range(3):
            inv = _invoice(memdb, store, datetime(2026, 8, 10 + i, 10, 0))
            _item(memdb, inv, milk, batch, qty=1, unit=6227, taxable=6227,
                  gst_amt=373, line_total=6600)
        f = generate_forecast(memdb, store.id)
        assert f["kind"] == "insufficient"


class TestReturns:
    def test_load_returns_traceable_when_price_known(self, memdb):
        store = _store(memdb)
        milk = _product(memdb, store, selling=62.27)
        r = Return(store_id=store.id, product_id=milk.id, quantity=2,
                   reason="expired", status="PENDING",
                   created_at=datetime(2026, 8, 12, 10, 0))
        memdb.add(r)
        memdb.flush()
        returns = load_returns(memdb, store.id)
        assert len(returns) == 1
        assert returns[0].traceable is True
        assert returns[0].unit_price_paise == 6227          # ₹62.27 × 1
        assert returns[0].quantity == 2

    def test_load_returns_untraceable_without_price(self, memdb):
        store = _store(memdb)
        p = Product(store_id=store.id, name="NoPrice", selling_price=None)
        memdb.add(p)
        memdb.flush()
        r = Return(store_id=store.id, product_id=p.id, quantity=1,
                   reason="damaged", status="PENDING",
                   created_at=datetime(2026, 8, 12, 10, 0))
        memdb.add(r)
        memdb.flush()
        returns = load_returns(memdb, store.id)
        assert returns[0].traceable is False
        assert returns[0].unit_price_paise == 0
