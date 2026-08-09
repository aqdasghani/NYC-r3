from __future__ import annotations

import uuid
import pytest
from app.models.database import Product, Supplier, PurchaseOrder, InventoryBatch


def test_procurement_flow(client, owner_headers, db):
    # 1. Fetch products and suppliers to create a PO
    supplier = db.scalars(Supplier).first()
    product = db.scalars(Product).first()
    assert supplier is not None
    assert product is not None

    # 2. Create Purchase Order
    po_payload = {
        "supplier_id": str(supplier.id),
        "status": "DRAFT",
        "expected_delivery_date": "2026-09-01",
        "items": [
            {
                "product_id": str(product.id),
                "quantity": 50,
                "unit_price": 25.0
            }
        ]
    }
    r = client.post("/api/procurement/orders", json=po_payload, headers=owner_headers)
    assert r.status_code == 201, r.text
    po_data = r.json()
    assert po_data["status"] == "DRAFT"
    assert len(po_data["items"]) == 1
    assert po_data["items"][0]["quantity"] == 50
    po_id = po_data["id"]

    # 3. List Purchase Orders
    r_list = client.get("/api/procurement/orders", headers=owner_headers)
    assert r_list.status_code == 200
    pos = r_list.json()
    assert any(p["id"] == po_id for p in pos)

    # 4. Get Single Purchase Order
    r_single = client.get(f"/api/procurement/orders/{po_id}", headers=owner_headers)
    assert r_single.status_code == 200
    assert r_single.json()["id"] == po_id

    # 5. Receive Purchase Order
    r_receive = client.post(f"/api/procurement/orders/{po_id}/receive", headers=owner_headers)
    assert r_receive.status_code == 200
    assert r_receive.json()["status"] == "RECEIVED"

    # 6. Verify inventory batch created
    batch = db.query(InventoryBatch).filter(InventoryBatch.batch_number == f"PO-{uuid.UUID(po_id).hex[:6].upper()}").first()
    assert batch is not None
    assert batch.quantity == 50


def test_procurement_suggestions(client, owner_headers):
    r = client.get("/api/procurement/suggestions", headers=owner_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
