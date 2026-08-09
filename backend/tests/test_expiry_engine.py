"""Expiry classification, at-risk query, and timeline tests."""
from datetime import date, timedelta

import pytest

from app.engines.expiry_engine import (
    classify_batch, days_remaining, expected_leftover, expiry_timeline,
    get_at_risk_batches, tier_for,
)
from app.models.database import InventoryBatch, Product, Store


def _store(db) -> Store:
    store = Store(name="Test Mart", store_type="Kirana & Grocery", is_active=True)
    db.add(store)
    db.flush()
    return store


def _product(db, store, price=30.0) -> Product:
    product = Product(store_id=store.id, name=f"Prod {price}", category="Staples",
                      purchase_price=price, selling_price=price * 1.2, lead_time_days=2)
    db.add(product)
    db.flush()
    return product


def _batch(db, product, store, qty, expiry_offset, last_sale_offset=0, received_offset=30):
    batch = InventoryBatch(product_id=product.id, store_id=store.id, batch_number=f"B-{expiry_offset}",
                           quantity=qty, expiry_date=date.today() + timedelta(days=expiry_offset),
                           purchase_price=float(product.purchase_price),
                           received_date=date.today() - timedelta(days=received_offset),
                           last_sale_date=date.today() - timedelta(days=last_sale_offset),
                           days_in_store=received_offset)
    db.add(batch)
    db.flush()
    return batch


# ----------------------------------------------------------------- tier/classify

def test_tier_boundaries():
    assert tier_for(3) == "CRITICAL"
    assert tier_for(4) == "WARNING"
    assert tier_for(15) == "WARNING"
    assert tier_for(16) == "UPCOMING"
    assert tier_for(30) == "UPCOMING"
    assert tier_for(31) == "SAFE"
    assert tier_for(365) == "SAFE"


def test_days_remaining_and_leftover(memdb):
    store = _store(memdb)
    product = _product(memdb, store)
    batch = _batch(memdb, product, store, 40, expiry_offset=10)
    assert days_remaining(batch) == 10
    assert expected_leftover(batch, velocity=1.0) == 30.0   # 40 - 1*10
    assert expected_leftover(batch, velocity=10.0) == 0.0   # floored at 0
    info = classify_batch(batch, velocity=1.0)
    assert info["severity"] == "WARNING"
    assert info["expected_leftover"] == 30.0


# ----------------------------------------------------------------- at-risk query

def test_get_at_risk_batches_only_0_to_max_days(memdb):
    store = _store(memdb)
    product = _product(memdb, store)
    offsets = [-1, 0, 3, 15, 16, 30, 365]
    batches = [_batch(memdb, product, store, 10, off) for off in offsets]

    at_risk = get_at_risk_batches(memdb, store.id, max_days=15)
    ids = {b.id for b in at_risk}
    # expired (-1) excluded, 16/30/365 excluded, 0/3/15 included
    assert ids == {batches[1].id, batches[2].id, batches[3].id}
    assert not any(b.quantity == 0 for b in at_risk)


def test_at_risk_excludes_zero_qty(memdb):
    store = _store(memdb)
    product = _product(memdb, store)
    zero = _batch(memdb, product, store, 0, 5)
    at_risk = get_at_risk_batches(memdb, store.id)
    assert zero.id not in {b.id for b in at_risk}


# ----------------------------------------------------------------- timeline

def test_expiry_timeline_buckets(memdb):
    store = _store(memdb)
    product = _product(memdb, store, price=10.0)
    _batch(memdb, product, store, 5, 1)    # 0-3
    _batch(memdb, product, store, 5, 6)    # 4-7
    _batch(memdb, product, store, 5, 10)   # 8-15
    _batch(memdb, product, store, 5, 20)   # 16-30
    _batch(memdb, product, store, 5, 100)  # 30+

    buckets = {b.label: b for b in expiry_timeline(memdb, store.id)}
    assert list(buckets.keys()) == ["0-3", "4-7", "8-15", "16-30", "30+"]
    for label in buckets:
        assert buckets[label].items == 1
    assert buckets["0-3"].value == 50.0  # 5 units * ₹10


def test_expired_excluded_from_timeline(memdb):
    store = _store(memdb)
    product = _product(memdb, store)
    _batch(memdb, product, store, 5, -2)
    buckets = {b.label: b for b in expiry_timeline(memdb, store.id)}
    assert sum(b.items for b in buckets.values()) == 0
