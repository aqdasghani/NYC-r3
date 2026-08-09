"""First-Expired, First-Out allocation for POS sales."""
from __future__ import annotations

from datetime import date
from typing import Iterable


class InsufficientStockError(ValueError):
    def __init__(self, requested: int, available: int):
        super().__init__(f"Insufficient stock: requested {requested}, available {available}")
        self.requested = requested
        self.available = available


def allocate(batches: Iterable[object], quantity: int, *, today: date | None = None) -> list[tuple[object, int]]:
    """Allocate ``quantity`` units from active, non-expired batches in FEFO order.

    ``batches`` can be ORM objects or test doubles exposing ``expiry_date`` and
    ``quantity``. The objects are not mutated; callers decrement their rows.
    """
    if quantity <= 0:
        return []
    today = today or date.today()
    ordered = sorted(
        (b for b in batches if getattr(b, "quantity", 0) > 0 and getattr(b, "expiry_date", today) >= today),
        key=lambda b: (b.expiry_date, getattr(b, "fefo_priority", 0)),
    )
    remaining = quantity
    allocations: list[tuple[object, int]] = []
    available = sum(int(getattr(b, "quantity", 0)) for b in ordered)
    for batch in ordered:
        if remaining <= 0:
            break
        units = min(remaining, int(batch.quantity))
        allocations.append((batch, units))
        remaining -= units
    if remaining:
        raise InsufficientStockError(quantity, available)
    return allocations
