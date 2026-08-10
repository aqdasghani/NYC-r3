import requests

# Test the old JWT token  
old_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5MDY1OTYyZC05NzY2LTRlOWQtODMzMi1hMzk3ODE4Zjg2NGQiLCJyb2xlIjoiT1dORVIiLCJzdG9yZV9pZCI6IjZjMTJkMzlmLTRiNmYtNDQwNi05OTE1LWJlMGJhZGYyZTAxMyIsImVtYWlsIjoic2Jocm5zbmtAZ21haWwuY29tIiwiaWF0IjoxNzg2MzUyMzIyLCJleHAiOjE3ODY0Mzg3MjJ9.OrXwDl-xT1btScUDgqUbY2RaKaKkTvvSsGWuUEjuCZ8'

headers = {'Authorization': f'Bearer {old_token}'}
r = requests.get('http://localhost:8001/api/analytics/dashboard', headers=headers)
print('Old token status:', r.status_code)
if r.status_code == 401:
    print('Response:', r.text)
elif r.ok:
    d = r.json()
    print('Products:', d.get('kpis', {}).get('product_count'))
    print('WORKS!')
