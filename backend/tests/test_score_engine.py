"""Green Score engine tests — sub-scores, weighted formula, history persistence."""
from datetime import date, timedelta

from sqlalchemy import select

from app.engines.score_engine import (
    calculate_green_score, persist_history, score_dead_stock,
    score_inventory_efficiency, score_waste_reduction,
)
from app.models.database import (
    GreenScoreHistory, InventoryBatch, Product, Store, WasteEvent,
)


def _store(db) -> Store:
    store = Store(name="Score Mart", store_type="Kirana & Grocery", is_active=True)
    db.add(store)
    db.flush()
    return store


def _product(db, store, price=20.0) -> Product:
    product = Product(store_id=store.id, name=f"P{price}", category="Staples",
                      purchase_price=price, selling_price=price * 1.2, lead_time_days=2)
    db.add(product)
    db.flush()
    return product


def _batch(db, product, store, qty, expiry_offset, last_sale_offset=0):
    batch = InventoryBatch(product_id=product.id, store_id=store.id, batch_number="B",
                           quantity=qty, expiry_date=date.today() + timedelta(days=expiry_offset),
                           purchase_price=float(product.purchase_price),
                           received_date=date.today() - timedelta(days=30),
                           last_sale_date=date.today() - timedelta(days=last_sale_offset),
                           days_in_store=30)
    db.add(batch)
    db.flush()
    return batch


def test_calculate_returns_weighted_dict(memdb):
    store = _store(memdb)
    product = _product(memdb, store)
    _batch(memdb, product, store, 20, 200)  # healthy stock, far expiry
    gs = calculate_green_score(memdb, store.id)
    assert {"score", "expiry_score", "inventory_score", "dead_stock_score", "waste_score"}.issubset(gs)
    expected = round(gs["expiry_score"] * .30 + gs["inventory_score"] * .30
                     + gs["dead_stock_score"] * .20 + gs["waste_score"] * .20, 2)
    assert gs["score"] == expected
    for key in ("score", "expiry_score", "inventory_score", "dead_stock_score", "waste_score"):
        assert 0 <= gs[key] <= 100


def test_empty_store_scores_100(memdb):
    store = _store(memdb)
    gs = calculate_green_score(memdb, store.id)
    assert gs["score"] == 100.0
    assert gs["inventory_score"] == 100.0


def test_stale_stock_lowers_inventory_and_dead_stock_scores(memdb):
    store = _store(memdb)
    product = _product(memdb, store, price=100.0)
    _batch(memdb, product, store, 10, 100, last_sale_offset=90)  # idle 90 days
    _batch(memdb, product, store, 10, 100, last_sale_offset=0)   # fresh
    # exactly half the value is stale
    assert score_inventory_efficiency(memdb, store.id) == pytest.approx(50.0)
    assert score_dead_stock(memdb, store.id) == pytest.approx(50.0)


def test_waste_score_rises_with_prevented_waste(memdb):
    store = _store(memdb)
    product = _product(memdb, store)
    base = score_waste_reduction(memdb, store.id)
    assert base == 0.0  # nothing prevented, nothing wasted
    db = memdb
    db.add(WasteEvent(store_id=store.id, product_id=product.id, potential_value=1000,
                      intervention_type="DISCOUNT", value_prevented=800, actual_waste=0))
    db.flush()
    improved = score_waste_reduction(memdb, store.id)
    assert improved > base


def test_persist_history_upserts(memdb):
    store = _store(memdb)
    first = persist_history(memdb, store.id)
    rows = memdb.scalars(select(GreenScoreHistory)).all()
    assert len(rows) == 1
    assert rows[0].score == first["score"]
    # second call updates the same day's row, no duplicate
    persist_history(memdb, store.id)
    assert len(memdb.scalars(select(GreenScoreHistory)).all()) == 1
