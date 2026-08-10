import requests

BASE = 'http://localhost:8001'

r = requests.post(f'{BASE}/api/auth/login', json={'email': 'rahul@greenshop.ai', 'password': 'demo1234'})
token = r.json()['access_token']
h = {'Authorization': f'Bearer {token}'}

# Find Amul product
r2 = requests.get(f'{BASE}/api/inventory/products?search=Amul+Milk+500ml', headers=h)
items = r2.json().get('items', [])
amul = next((p for p in items if '8901234567890' in str(p.get('barcode', ''))), None)
print('Product:', amul['id'] if amul else 'NOT FOUND')

if amul:
    product_id = amul['id']
    r3 = requests.post(f'{BASE}/api/pos/sale', headers=h, json={
        'items': [{'product_id': product_id, 'quantity': 4}],
        'payment_method': 'CASH',
        'amount_paid': 120.0
    })
    print('Sale status:', r3.status_code)
    print('Sale response:', r3.json())
