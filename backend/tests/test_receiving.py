"""Smart receiving: invoice OCR scan, then confirm (batch creation + detection)."""
import uuid
from datetime import date, timedelta

from sqlalchemy import select

from app.models.database import InventoryBatch


def _scan(client, headers):
    return client.post("/api/receiving/scan-invoice", headers=headers,
                       files={"file": ("invoice.jpg", b"demo invoice bytes", "image/jpeg")})


def test_scan_invoice_returns_parsed_items(client, owner_headers):
    r = _scan(client, owner_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "mock_parser"
    assert len(body["extracted_items"]) >= 3
    matched = [e for e in body["extracted_items"] if e.get("matched_product_id")]
    assert matched, "mock parser should fuzzy-match catalog products"
    assert all(0 < e["confidence"] <= 1.0 for e in matched)


def test_confirm_creates_batch_and_runs_detection(client, owner_headers, db):
    scan = _scan(client, owner_headers).json()
    matched = [e for e in scan["extracted_items"] if e.get("matched_product_id")][0]
    r = client.post("/api/receiving/confirm", headers=owner_headers, json={"items": [{
        "product_id": matched["matched_product_id"], "quantity": matched["quantity"],
        "expiry_date": str(date.today() + timedelta(days=60)),
        "batch_number": "B-TEST-RCV", "purchase_price": 20.0,
    }]})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created_batch_ids"]
    batch = db.get(InventoryBatch, uuid.UUID(body["created_batch_ids"][0]))
    assert batch is not None
    assert batch.quantity == matched["quantity"]
    assert batch.expiry_date == date.today() + timedelta(days=60)
    # detection sweep ran and returned a summary
    assert "risks_detected" in body["detection_summary"]
    assert "recommendations_created" in body["detection_summary"]
    assert body["alerts_triggered"] == body["detection_summary"]["recommendations_created"]


def test_confirm_rejects_unknown_product(client, owner_headers):
    r = client.post("/api/receiving/confirm", headers=owner_headers, json={"items": [{
        "product_id": str(uuid.uuid4()), "quantity": 5,
        "expiry_date": str(date.today() + timedelta(days=30)),
    }]})
    assert r.status_code == 404


def test_scan_requires_owner_manager(client, staff_headers):
    r = _scan(client, staff_headers)
    assert r.status_code == 403
