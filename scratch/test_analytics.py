import requests

headers = {"Authorization": "Bearer mock-token-123"}
try:
    r = requests.get("http://localhost:8001/api/analytics/dashboard", headers=headers)
    print(f"Status: {r.status_code}")
    print(f"Response text: {r.text}")
except Exception as e:
    print(f"Error: {e}")
