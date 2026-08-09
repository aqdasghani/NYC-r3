"""FEFO batch allocation unit tests."""
from datetime import date, timedelta
from types import SimpleNamespace

import pytest

from app.utils.fefo import InsufficientStockError, allocate


def make_batch(expiry_offset, quantity, fefo_priority=0, name="b"):
    return SimpleNamespace(name=name, expiry_date=date.today() + timedelta(days=expiry_offset),
                           quantity=quantity, fefo_priority=fefo_priority)


def test_zero_quantity_returns_empty():
    assert allocate([make_batch(10, 5)], 0) == []
    assert allocate([make_batch(10, 5)], -3) == []


def test_fefo_earliest_expiry_first():
    later = make_batch(20, 10, name="later")
    soon = make_batch(2, 10, name="soon")
    allocations = allocate([later, soon], 5)
    assert allocations[0][0].name == "soon"
    assert sum(q for _, q in allocations) == 5


def test_partial_allocation_splits_batches_in_order():
    b1 = make_batch(5, 3, name="b1")
    b2 = make_batch(10, 5, name="b2")
    allocations = allocate([b1, b2], 6)
    assert allocations == [(b1, 3), (b2, 3)]


def test_skips_zero_qty_and_expired_batches():
    expired = make_batch(-1, 10, name="expired")
    empty = make_batch(30, 0, name="empty")
    good = make_batch(30, 4, name="good")
    allocations = allocate([expired, empty, good], 3)
    assert [a[0].name for a in allocations] == ["good"]


def test_insufficient_stock_raises():
    with pytest.raises(InsufficientStockError):
        allocate([make_batch(10, 2)], 5)


def test_does_not_mutate_batches():
    b = make_batch(5, 10)
    allocate([b], 4)
    assert b.quantity == 10  # callers decrement rows themselves
