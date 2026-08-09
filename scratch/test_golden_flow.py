import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_golden_flow():
    # 1. Login owner to get token
    print("1. Logging in owner...")
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "rahul@greenshop.ai", "password": "demo1234"})
    if login_res.status_code != 200:
        print("Login failed:", login_res.text)
        return
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Owner logged in successfully.")

    # 2. Check / Create product 'Amul Milk 500ml' with barcode '8901234567890'
    barcode = "8901234567890"
    print(f"2. Looking up barcode {barcode}...")
    lookup_res = requests.get(f"{BASE_URL}/api/inventory/barcode/{barcode}", headers=headers)
    
    if lookup_res.status_code == 200:
        product = lookup_res.json()
        print(f"Product already exists: {product['name']} (ID: {product['id']})")
    else:
        print("Product not found. Registering Amul Milk 500ml...")
        create_res = requests.post(f"{BASE_URL}/api/inventory/products", headers=headers, json={
            "name": "Amul Milk 500ml",
            "barcode": barcode,
            "mrp": 30.0,
            "selling_price": 28.0,
            "purchase_price": 24.0,
            "gst_rate": 5.0,
            "unit": "pcs",
            "reorder_level": 10,
            "reorder_quantity": 48
        })
        product = create_res.json()
        print(f"Registered product: {product['name']} (ID: {product['id']})")

    product_id = product["id"]

    # 3. Worker receives 2 boxes (1 box = 24 packets -> 48 units)
    print("3. Receiving 48 units (2 boxes x 24)...")
    receipt_res = requests.post(f"{BASE_URL}/api/receiving/confirm", headers=headers, json={"items": [{
        "product_id": product_id,
        "quantity": 48,
        "purchase_price": 24.0,
        "expiry_date": "2026-09-01",
        "batch_number": "MILK-BATCH-01"
    }]})
    print("Receipt response:", receipt_res.status_code, receipt_res.json())

    # 4. Biller scans SAME barcode and sells 4 packets
    print("4. POS Biller selling 4 packets via barcode POS checkout...")
    pos_res = requests.post(f"{BASE_URL}/api/pos/sale", headers=headers, json={
        "items": [{
            "barcode": barcode,
            "quantity": 4
        }]
    })
    print("POS sale response:", pos_res.status_code, pos_res.text)
    if pos_res.status_code != 200:
        return
    receipt = pos_res.json()["receipt"]
    print(f"Receipt Total: Rs {receipt['grand_total']/100:.2f} for {receipt['lines'][0]['qty']} units of {receipt['lines'][0]['name']}")

    # 5. Check Product stock in DB
    prod_check = requests.get(f"{BASE_URL}/api/inventory/products/{product_id}", headers=headers).json()
    print(f"Current DB Stock for {prod_check['name']}: {prod_check.get('total_stock', 'N/A')}")

    # 6. Ask Copilot Chatbot: "How many milk packets do I have?"
    print("6. Asking Copilot Chatbot: 'How many milk packets do I have?'...")
    chat_res = requests.post(f"{BASE_URL}/api/ai/copilot", headers=headers, json={
        "question": "How many milk packets do I have?"
    }).json()
    print("Chatbot Answer:\n", chat_res.get("answer"))

if __name__ == "__main__":
    test_golden_flow()
