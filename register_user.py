import requests

# Register the user with a known password
# This will create a proper entry
r = requests.post('http://localhost:8001/api/auth/register', json={
    'name': 'Admin Owner',
    'email': 'sbhrnsnk@gmail.com',
    'password': 'demo1234',
    'store_name': 'Rahul SuperMart'
})
print('Register status:', r.status_code)
print('Response:', r.text[:500])
