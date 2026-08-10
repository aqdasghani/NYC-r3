import requests, json

# Test: do we get a fresh token for sbhrnsnk?
# NOTE: sbhrnsnk is not in the system with a known password
# The user was injected with rahul's hashed_password which is hash of 'demo1234'
# So we should test with rahul's creds first
r = requests.post('http://localhost:8001/api/auth/login', json={'email': 'rahul@greenshop.ai', 'password': 'demo1234'})
print('Rahul login status:', r.status_code)
if r.ok:
    data = r.json()
    token = data['access_token']
    print('Token:', token[:40])
    
    # Now test dashboard
    headers = {'Authorization': f'Bearer {token}'}
    r2 = requests.get('http://localhost:8001/api/analytics/dashboard', headers=headers)
    print('Dashboard status:', r2.status_code)
    if r2.ok:
        d = r2.json()
        kpis = d.get('kpis', {})
        print('Products:', kpis.get('product_count'))
        print('Inv value:', kpis.get('inventory_value'))
