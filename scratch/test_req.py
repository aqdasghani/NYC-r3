import urllib.request
import urllib.error

try:
    req = urllib.request.Request('http://127.0.0.1:8000/api/analytics/dashboard')
    req.add_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZmQyZjQ5My0xZmVlLTRkNDMtODU4OC1iYjEwYWQ2NTc5MjAiLCJyb2xlIjoiT1dORVIiLCJzdG9yZV9pZCI6IjBjMTNlNTU5LTdhNGYtNDRkOS1iNDgxLTA0OGUzY2E2YzFjOSIsImVtYWlsIjoic3ViaHJhbnN1Lm5heWFrLjQxOEBnbWFpbC5jb20iLCJpYXQiOjE3ODY0Mzc2MzMsImV4cCI6MTc4NjUyNDAzM30.v57uK4HrEDiqtfdWTiGJQAljpfEGwdokAW1W6MNi8Vw')
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f'HTTP Error {e.code}: {e.read().decode("utf-8")}')
except Exception as e:
    print(f'Error: {e}')
