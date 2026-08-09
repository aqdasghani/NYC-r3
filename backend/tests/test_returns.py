from __future__ import annotations


def test_create_return_and_list_it(client, owner_headers, db):
    from app.models.database import Product

    product = db.query(Product).first()
    payload = {
        "reason": "Customer changed mind",
        "items": [{
            "product_id": str(product.id),
            "quantity": 1,
            "refund_amount": 99.0,
            "condition": "SELLABLE",
        }],
    }

    r = client.post("/api/returns", json=payload, headers=owner_headers)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["total_refund"] == 99.0
    assert len(body["items"]) == 1

    r_list = client.get("/api/returns", headers=owner_headers)
    assert r_list.status_code == 200, r_list.text
    assert any(item["id"] == body["id"] for item in r_list.json())
