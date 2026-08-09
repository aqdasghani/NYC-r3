"""P0 golden flow — the master prompt's acceptance test, end to end on a FRESH
store with zero fake data:

    Owner creates "Milk 500ml" (barcode 8901234567890) → Worker receives 48
    → Biller sells 4 → inventory = 44, Sale rows persisted, RECEIVE + SALE
    ledger rows exist, dashboard shows 4 units / ₹112 revenue, and the AI
    copilot answers "44" when asked how many milk packets are in stock.

Every store in this file is created via /register (isolated, never the
seeded demo store), so the numbers below come only from what this test does.
"""
import uuid

from sqlalchemy import func, select

from app.models.database import InventoryBatch, InventoryTransaction, Product, Sale

BARCODE = "8901234567890"
SELL_PRICE = 28.0
PURCHASE_PRICE = 24.0


def _fresh_owner(client, name: str) -> dict:
    email = f"{name.replace(' ', '').lower()}@golden.ai"
    r = client.post("/api/auth/register", json={
        "name": name, "email": email, "password": "golden1234", "store_name": f"{name}'s Store",
    })
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_milk(client, headers) -> str:
    r = client.post("/api/inventory/products", headers=headers, json={
        "name": "Milk 500ml", "barcode": BARCODE, "category": "Dairy",
        "purchase_price": PURCHASE_PRICE, "selling_price": SELL_PRICE,
        "gst_rate": 5, "lead_time_days": 2,
    })
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_golden_flow_round_trip(client, db):
    headers = _fresh_owner(client, "Golden Test")
    pid = _create_milk(client, headers)

    # Worker receives 48 units in one batch.
    r = client.post("/api/receiving/confirm", headers=headers, json={
        "items": [{"product_id": pid, "quantity": 48, "purchase_price": PURCHASE_PRICE,
                   "expiry_date": "2026-12-31", "batch_number": "MILK-001"}],
    })
    assert r.status_code == 200, r.text
    batch_ids = r.json()["created_batch_ids"]
    assert len(batch_ids) == 1

    # Stock on the shelf = 48.
    detail = client.get(f"/api/inventory/products/{pid}", headers=headers)
    assert detail.status_code == 200, detail.text
    assert detail.json()["total_stock"] == 48

    # Biller sells 4 by scanning the barcode.
    r = client.post("/api/pos/sale", headers=headers, json={
        "items": [{"barcode": BARCODE, "quantity": 4}],
        "payment_method": "CASH", "amount_paid": 120,
    })
    assert r.status_code == 200, r.text
    receipt = r.json()["receipt"]
    assert receipt["receipt_no"].startswith("INV-")
    assert receipt["lines"][0]["qty"] == 4
    assert receipt["lines"][0]["name"] == "Milk 500ml"
    assert receipt["subtotal"] == 112.0          # 4 × 28
    assert receipt["gst_total"] == 5.6           # 5% on 112
    assert receipt["grand_total"] == 117.6       # 112 + 5.6

    # 1) Inventory = 44 on the batch ledger.
    pid_uuid = uuid.UUID(pid)
    stock = db.scalar(select(func.coalesce(func.sum(InventoryBatch.quantity), 0)).where(
        InventoryBatch.product_id == pid_uuid))
    assert stock == 44, f"expected 44 units left, got {stock}"

    # 2) Sale rows persisted (analytics visibility — the P0 blind spot).
    sold = db.scalars(select(Sale).where(Sale.product_id == pid_uuid)).all()
    assert len(sold) == 1
    assert sum(s.quantity_sold for s in sold) == 4
    assert all(s.sale_price == SELL_PRICE for s in sold)

    # 3) Full ledger: a RECEIVE +48 and a SALE -4.
    txns = db.scalars(select(InventoryTransaction).where(
        InventoryTransaction.product_id == pid_uuid)).all()
    by_type = {t.tx_type: t.quantity for t in txns}
    assert by_type.get("RECEIVE") == 48, by_type
    assert by_type.get("SALE") == -4, by_type

    # 4) Dashboard analytics reflect the real 4-unit sale.
    dash = client.get("/api/analytics/dashboard", headers=headers)
    assert dash.status_code == 200, dash.text
    kpis = dash.json()["kpis"]
    assert kpis["today_units"] == 4, kpis
    assert kpis["today_revenue"] == 112.0, kpis
    assert kpis["product_count"] == 1, kpis

    # 5) The AI copilot answers with the real number — 44, not a guess.
    r = client.post("/api/ai/copilot", headers=headers, json={"question": "how many milk packets?"})
    assert r.status_code == 200, r.text
    answer = r.json()["answer"]
    assert "44" in answer, answer
    assert "Milk" in answer, answer

    # Ledger endpoint surfaces the same two movements.
    ledger = client.get("/api/inventory/transactions", headers=headers).json()
    kinds = sorted({t["tx_type"] for t in ledger if t["product_id"] == pid})
    assert kinds == ["RECEIVE", "SALE"], kinds
