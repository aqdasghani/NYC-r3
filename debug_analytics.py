import requests

BASE = 'http://localhost:8001'
r = requests.post(f'{BASE}/api/auth/login', json={'email': 'rahul@greenshop.ai', 'password': 'demo1234'})
token = r.json()['access_token']
h = {'Authorization': f'Bearer {token}'}

# Get sales transactions to see if today's sale is there
r2 = requests.get(f'{BASE}/api/sales/transactions?limit=5', headers=h)
print('Sales transactions:', r2.status_code)
if r2.ok:
    for s in r2.json():
        print(' ', s)

# Get detailed dashboard
r3 = requests.get(f'{BASE}/api/analytics/dashboard', headers=h)
d = r3.json()
print('today_revenue:', d.get('kpis', {}).get('today_revenue'))
print('today_orders:', d.get('kpis', {}).get('today_orders'))
print('today_units:', d.get('kpis', {}).get('today_units'))
