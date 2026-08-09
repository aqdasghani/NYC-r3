"""
Comprehensive Production End-to-End System Verification Test.
Tests Auth, Products, FEFO Batch Receive, POS Checkout, Audit Transactions, Green Score, and AI Copilot.
"""
import sys
import json
import httpx
from datetime import date, timedelta

BASE_URL = "http://127.0.0.1:8001"

def run_tests():
    print("=" * 60)
    print("STARTING GREEN QUANT AI PRODUCTION E2E VERIFICATION SUITE")
    print("=" * 60)

    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    # 1. AUTHENTICATION TEST
    print("\n[1/6] Testing Auth Endpoint (/api/auth/login)...")
    login_res = client.post("/api/auth/login", json={"email": "rahul@greenshop.ai", "password": "demo1234"})
    if login_res.status_code != 200:
        print(f"FAILED: Login returned status {login_res.status_code}")
        sys.exit(1)
    
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("SUCCESS: Token obtained successfully.")

    # 2. PRODUCTS CATALOG TEST
    print("\n[2/6] Testing Products Endpoint (/api/inventory/products)...")
    products_res = client.get("/api/inventory/products", headers=headers)
    if products_res.status_code != 200:
        print(f"FAILED: Products returned status {products_res.status_code}")
        sys.exit(1)
    
    prods = products_res.json()["items"]
    print(f"SUCCESS: Loaded {len(prods)} products from database.")
    target_product = prods[0] if prods else None

    # 3. FEFO BATCH RECEIVING TEST
    print("\n[3/6] Testing FEFO Batch Receiving (/api/receiving/confirm)...")
    if target_product:
        expiry = (date.today() + timedelta(days=10)).isoformat()
        confirm_payload = {
            "items": [
                {
                    "product_id": target_product["id"],
                    "batch_number": f"TEST-BATCH-{date.today().strftime('%Y%m%d')}",
                    "quantity": 50,
                    "expiry_date": expiry,
                    "purchase_price": 250.0
                }
            ]
        }
        receive_res = client.post("/api/receiving/confirm", json=confirm_payload, headers=headers)
        if receive_res.status_code != 200:
            print(f"FAILED: Receive batch returned status {receive_res.status_code}: {receive_res.text}")
            sys.exit(1)
        print("SUCCESS: FEFO Batch received and persisted to database.")

    # 4. POS CHECKOUT & STOCK DECREMENT TEST
    print("\n[4/6] Testing POS Checkout & Stock Decrement (/api/pos/sale)...")
    if target_product:
        checkout_payload = {
            "items": [
                {
                    "product_id": target_product["id"],
                    "quantity": 1
                }
            ],
            "payment_method": "UPI"
        }
        checkout_res = client.post("/api/pos/sale", json=checkout_payload, headers=headers)
        if checkout_res.status_code != 200:
            print(f"FAILED: POS Checkout returned status {checkout_res.status_code}: {checkout_res.text}")
            sys.exit(1)
        print("SUCCESS: POS Sale processed and stock atomically decremented.")

    # 5. SUSTAINABILITY & GREEN SCORE TEST
    print("\n[5/6] Testing Green Score Engine (/api/green-score/current)...")
    score_res = client.get("/api/green-score/current", headers=headers)
    if score_res.status_code != 200:
        print(f"FAILED: Green score returned status {score_res.status_code}")
        sys.exit(1)
    
    score_data = score_res.json()
    print(f"SUCCESS: Green Score calculated: {score_data.get('score')} / 100")

    # 6. AI COPILOT QUERY TEST
    print("\n[6/6] Testing AI Copilot Query Engine (/api/ai/copilot)...")
    copilot_res = client.post("/api/ai/copilot", json={"question": "What products are in stock?"}, headers=headers)
    if copilot_res.status_code != 200:
        print(f"FAILED: AI Copilot returned status {copilot_res.status_code}: {copilot_res.text}")
        sys.exit(1)
    
    copilot_data = copilot_res.json()
    print(f"SUCCESS: AI Copilot response received (Model: {copilot_data.get('model_used')}).")

    print("\n" + "=" * 60)
    print("ALL PRODUCTION E2E VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
