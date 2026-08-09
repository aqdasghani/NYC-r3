"""Barcode lookup seam. Camera decoding runs in the frontend; this service
resolves the scanned value against the store catalogue and leaves a clean seam
for an external product database later."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.database import Product


def lookup_barcode(db: Session, store_id, barcode: str) -> Product | None:
    return db.scalar(select(Product).where(Product.store_id == store_id, Product.barcode == barcode))
