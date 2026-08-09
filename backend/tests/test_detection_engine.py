"""Risk-detection engine tests: batch risks, product-level detectors, run_detection."""
import uuid
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from sqlalchemy import select

from app.engines.detection_engine import (
    detect_product_risks, detect_risks, run_detection,
)
from app.models.database import AIRecommendation, InventoryBatch, Product, Sale, Store


def _utc_days_ago(days: int) -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)


def _batch(**kwargs):
    base = dict(quantity=20, purchase_price=50.0, unit_cost=None,
                last_sale_date=None, days_in_store=0,
                expiry_date=date.today() + timedelta(days=30))
    base.update(kwargs)
    return SimpleNamespace(**base)


# --------------------------------------------------------------- detect_risks

def test_expiry_risk_critical_when_three_days_or_less():
    risks = detect_risks(_batch(expiry_date=date.today() + timedelta(days=2)), [])
    types = {r.risk_type for r in risks}
    assert "Expiry Risk" in types
    expiry = next(r for r in risks if r.risk_type == "Expiry Risk")
    assert expiry.severity == "CRITICAL"
    assert expiry.value_at_risk == 20 * 50.0


def test_waste_risk_when_leftover_and_within_15_days():
    # velocity 1/day over 14 days = 14 units sold; qty 40, 10 days left -> 30 leftover
    sales_history = [1] * 14
    risks = detect_risks(_batch(quantity=40, expiry_date=date.today() + timedelta(days=10)),
                         sales_history)
    waste = next((r for r in risks if r.risk_type == "Waste Risk"), None)
    assert waste is not None
    assert waste.units == pytest.approx(30.0)


def test_dead_stock_when_no_velocity_and_idle_long():
    risks = detect_risks(_batch(quantity=20, days_in_store=120), [])
    dead = next((r for r in risks if r.risk_type == "Dead Stock"), None)
    assert dead is not None
    assert dead.days_idle == 120


def test_no_risk_on_healthy_batch():
    risks = detect_risks(_batch(quantity=20, expiry_date=date.today() + timedelta(days=60),
                                last_sale_date=date.today() - timedelta(days=2)), [1] * 14)
    assert risks == []


# ------------------------------------------------------- detect_product_risks

def _product(**kwargs):
    base = dict(id=uuid.uuid4(), selling_price=60.0, purchase_price=50.0, lead_time_days=2)
    base.update(kwargs)
    return SimpleNamespace(**base)


def _batch_obj(qty=10, days=200):
    return SimpleNamespace(id=uuid.uuid4(), quantity=qty,
                           expiry_date=date.today() + timedelta(days=days))


def _sales(days_ago_qty_pairs):
    return [SimpleNamespace(sale_date=_utc_days_ago(d), quantity_sold=q)
            for d, q in days_ago_qty_pairs]


def test_demand_spike_detector():
    # prior 28 days: 30 units -> 1.07/day (>= 0.8 baseline); last 7 days: 8/day
    # (= 7.5x prior, well past the 1.5x spike threshold); low stock on hand
    sales = _sales([(1, 8), (2, 8), (3, 8), (4, 8), (5, 8), (6, 8), (7, 8),
                    (10, 2), (12, 2), (14, 2), (16, 4), (18, 4), (20, 4), (25, 4), (28, 4), (30, 4)])
    product = _product()
    batches = [_batch_obj(qty=5)]
    detections = detect_product_risks(product, sales, batches)
    assert any(d.risk_type == "Demand Spike" for d in detections)


def test_no_false_demand_spike_on_steady_seller():
    # steady 2/day both windows -> ratio ~1.0, must NOT be a spike
    sales = _sales([(d, 2) for d in range(1, 31)])
    detections = detect_product_risks(_product(), sales, [_batch_obj(qty=60)])
    assert not any(d.risk_type == "Demand Spike" for d in detections)


def test_overstock_detector_requires_real_turnover():
    # steady 2/day for 14 days -> velocity 2; 500 on hand -> 250 days of supply
    sales = _sales([(1, 2), (2, 2), (3, 2), (4, 2), (5, 2), (6, 2), (7, 2),
                    (8, 2), (9, 2), (10, 2), (11, 2), (12, 2), (13, 2), (14, 2)])
    detections = detect_product_risks(_product(), sales, [_batch_obj(qty=500)])
    assert any(d.risk_type == "Overstock" for d in detections)
    # slow mover (0.3/day) with 500 units must NOT be an overstock alert
    slow = _sales([(1, 3), (8, 3), (15, 3), (22, 3)])  # 12 units / 14d
    assert not any(d.risk_type == "Overstock" for d in detect_product_risks(_product(), slow, [_batch_obj(qty=500)]))


def test_stockout_detector():
    sales = _sales([(1, 2), (2, 2), (3, 2), (4, 2), (5, 2), (6, 2), (7, 2),
                    (8, 2), (9, 2), (10, 2), (11, 2), (12, 2), (13, 2), (14, 2)])
    detections = detect_product_risks(_product(), sales, [_batch_obj(qty=5)])
    assert any(d.risk_type == "Stockout Risk" for d in detections)


def test_margin_risk_detector():
    low_margin = _product(selling_price=105.0, purchase_price=100.0)
    detections = detect_product_risks(low_margin, [], [_batch_obj(qty=10)])
    assert any(d.risk_type == "Margin Risk" for d in detections)


# --------------------------------------------------------------- run_detection

def _seed_scenario(db):
    store = Store(name="Detect Mart", store_type="Kirana", is_active=True)
    db.add(store)
    db.flush()
    product = Product(store_id=store.id, name="Milk", category="Dairy & Bread",
                      purchase_price=50.0, selling_price=60.0, lead_time_days=2)
    db.add(product)
    db.flush()
    batch = InventoryBatch(product_id=product.id, store_id=store.id, batch_number="B1",
                           quantity=20, expiry_date=date.today() + timedelta(days=2),
                           purchase_price=50.0, received_date=date.today() - timedelta(days=5),
                           last_sale_date=date.today(), days_in_store=5)
    db.add(batch)
    db.commit()
    return store, product, batch


def test_run_detection_creates_and_dedupes(memdb):
    store, product, batch = _seed_scenario(memdb)
    first = run_detection(memdb, store.id)
    assert first["risks_detected"] >= 2  # Expiry Risk + Waste Risk
    assert first["recommendations_created"] >= 2

    rows = memdb.scalars(select(AIRecommendation).where(AIRecommendation.status == "PENDING")).all()
    by_type = {r.risk_type for r in rows}
    assert "Expiry Risk" in by_type and "Waste Risk" in by_type
    assert all(r.store_id == store.id for r in rows)

    # dedup: a second sweep finds nothing new
    second = run_detection(memdb, store.id)
    assert second["recommendations_created"] == 0
    assert len(memdb.scalars(select(AIRecommendation)).all()) == len(rows)


def test_run_detection_skips_expired_batches(memdb):
    store, product, _ = _seed_scenario(memdb)
    expired = InventoryBatch(product_id=product.id, store_id=store.id, batch_number="B-OLD",
                             quantity=10, expiry_date=date.today() - timedelta(days=1),
                             purchase_price=50.0, received_date=date.today() - timedelta(days=60),
                             last_sale_date=date.today() - timedelta(days=30), days_in_store=60)
    memdb.add(expired)
    memdb.commit()
    run_detection(memdb, store.id)
    rows = memdb.scalars(select(AIRecommendation)).all()
    assert expired.id not in {r.batch_id for r in rows}


def test_detect_risks_sales_can_be_sale_rows(memdb):
    """detect_risks accepts ORM Sale rows or plain quantities."""
    from app.models.database import Sale as SaleModel
    sales = [SaleModel(store_id=uuid.uuid4(), product_id=uuid.uuid4(), quantity_sold=1,
                       sale_price=60.0, sale_date=_utc_days_ago(i)) for i in range(14)]
    risks = detect_risks(_batch(quantity=40, expiry_date=date.today() + timedelta(days=10)), sales)
    waste = next(r for r in risks if r.risk_type == "Waste Risk")
    assert waste.units == pytest.approx(30.0)
