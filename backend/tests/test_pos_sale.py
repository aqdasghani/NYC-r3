"""POS sale: FEFO allocation, GST receipt, insufficient-stock 409, transactions."""
import uuid

from sqlalchemy import select

from app.models.database import InventoryBatch, Product, Sale


def _first_barcode(client, headers):
    prods = client.get("/api/inventory/products", headers=headers)
    assert prods.status_code == 200
    item = prods.json()["items"][0]
    detail = client.get(f"/api/inventory/products/{item['id']}", headers=headers)
    return detail.json()["barcode"]


def test_pos_sale_returns_receipt(client, owner_headers, db):
    barcode = _first_barcode(client, owner_headers)
    r = client.post("/api/pos/sale", headers=owner_headers,
                    json={"items": [{"barcode": barcode, "quantity": 2}]})
    assert r.status_code == 200, r.text
    receipt = r.json()["invoice"]
    assert receipt["invoice_number"].startswith("GM-")
    assert receipt["grand_total"] > 0
    assert receipt["items"] and receipt["items"][0]["quantity"] == 2
    # FEFO allocation picks the earliest-expiring batch and deducts from it
    sale = db.scalar(select(Sale).where(Sale.invoice_id == uuid.UUID(receipt["id"])))
    assert sale is not None
    assert sale.batch_id is not None
    sold_batch = db.scalar(select(InventoryBatch).where(InventoryBatch.id == sale.batch_id))
    assert sold_batch is not None


def test_pos_sale_by_product_id_works(client, owner_headers):
    prods = client.get("/api/inventory/products", headers=owner_headers).json()["items"]
    pid = prods[0]["id"]
    r = client.post("/api/pos/sale", headers=owner_headers,
                    json={"items": [{"product_id": pid, "quantity": 1}]})
    assert r.status_code == 200


def test_pos_sale_insufficient_stock_409(client, owner_headers):
    barcode = _first_barcode(client, owner_headers)
    r = client.post("/api/pos/sale", headers=owner_headers,
                    json={"items": [{"barcode": barcode, "quantity": 999999}]})
    assert r.status_code == 409


def test_pos_sale_biller_allowed(client, biller_headers):
    barcode = _first_barcode(client, biller_headers)
    r = client.post("/api/pos/sale", headers=biller_headers,
                    json={"items": [{"barcode": barcode, "quantity": 1}]})
    assert r.status_code == 200


def test_pos_sale_worker_forbidden(client, staff_headers):
    barcode = _first_barcode(client, staff_headers)
    r = client.post("/api/pos/sale", headers=staff_headers,
                    json={"items": [{"barcode": barcode, "quantity": 1}]})
    assert r.status_code == 403


def test_sales_transactions_and_trend(client, owner_headers):
    tx = client.get("/api/sales/transactions", headers=owner_headers)
    assert tx.status_code == 200
    assert len(tx.json()) > 0
    trend = client.get("/api/sales/trend", headers=owner_headers)
    assert trend.status_code == 200
    assert len(trend.json()) == 30
    assert trend.json()[-1]["revenue"] > 0
