"""Barcode lookup seam. Camera decoding runs in the frontend; this service
resolves the scanned value against the store catalogue and leaves a clean seam
for an external product database later."""
from __future__ import annotations

import requests
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.database import Product


def lookup_barcode(db: Session, store_id, barcode: str) -> Product | None:
    # 1. Local Database Lookup
    product = db.scalar(select(Product).where(Product.store_id == store_id, Product.barcode == barcode))
    if product:
        return product

    # 2. External API Fallback (Open Food Facts)
    try:
        url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1:
                p_data = data.get("product", {})
                name = p_data.get("product_name") or p_data.get("product_name_en") or "Unknown Product"
                category = p_data.get("categories", "General").split(",")[0].strip()
                
                # Auto-create the product in our local store catalogue
                new_product = Product(
                    store_id=store_id,
                    name=name,
                    category=category,
                    barcode=barcode,
                    purchase_price=0.0,
                    selling_price=0.0,
                    lead_time_days=7
                )
                db.add(new_product)
                db.commit()
                db.refresh(new_product)
                return new_product
    except Exception as e:
        # Silently fail if external API is down or takes too long
        pass

    return None
