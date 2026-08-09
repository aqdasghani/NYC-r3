"""Barcode lookup seam. Camera decoding runs in the frontend; this service
resolves the scanned value against the store catalogue and leaves a clean seam
for an external product database later."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.database import Product

import json
import urllib.request

def lookup_barcode(db: Session, store_id, barcode: str) -> dict | None:
    # 1. Check local DB
    local_product = db.scalar(select(Product).where(Product.store_id == store_id, Product.barcode == barcode))
    if local_product:
        return {"product": local_product, "is_new": False}
        
    # 2. If not found, lookup via OpenFoodFacts
    url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'GreenQuantAI/1.0'})
        with urllib.request.urlopen(req, timeout=5.0) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                if data.get("status") == 1:
                    p_data = data.get("product", {})
                    name = p_data.get("product_name") or p_data.get("product_name_en")
                    if name:
                        brand = p_data.get("brands", "")
                        category = p_data.get("categories", "").split(",")[0].strip() if p_data.get("categories") else None
                        
                        full_name = f"{brand} {name}".strip() if brand else name
                        
                        # Create the product in our DB automatically
                        new_product = Product(
                            store_id=store_id,
                            name=full_name,
                            barcode=barcode,
                            category=category,
                            purchase_price=0.0,
                            selling_price=0.0,
                            lead_time_days=2
                        )
                        db.add(new_product)
                        db.commit()
                        db.refresh(new_product)
                        
                        return {"product": new_product, "is_new": True}
    except Exception as e:
        print(f"Error looking up barcode {barcode}: {e}")
        
    return None
