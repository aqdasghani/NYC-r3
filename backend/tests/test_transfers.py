from __future__ import annotations


def test_create_and_complete_transfer(client, owner_headers, db):
    from app.models.database import Product, Store

    source_store = db.query(Store).first()
    destination_store = db.query(Store).filter(Store.id != source_store.id).first()
    product = db.query(Product).filter(Product.store_id == source_store.id).first()

    transfer_payload = {
        "destination_store_id": str(destination_store.id),
        "items": [{"product_id": str(product.id), "quantity": 2}],
    }

    r = client.post("/api/transfers", json=transfer_payload, headers=owner_headers)
    assert r.status_code == 201, r.text
    transfer = r.json()
    assert transfer["source_store_id"] == str(source_store.id)
    assert transfer["destination_store_id"] == str(destination_store.id)
    transfer_id = transfer["id"]

    r_complete = client.post(f"/api/transfers/{transfer_id}/complete", headers=owner_headers)
    assert r_complete.status_code == 200, r_complete.text
    assert r_complete.json()["status"] == "COMPLETED"


def test_transfer_rejects_same_store(client, owner_headers):
    payload = {"destination_store_id": "00000000-0000-0000-0000-000000000000", "items": []}
    r = client.post("/api/transfers", json=payload, headers=owner_headers)
    assert r.status_code in {400, 404}
