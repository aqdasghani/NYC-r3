import requests

# 1. Login to get token
login_res = requests.post("http://localhost:8001/api/auth/login", json={"email": "rahul@greenshop.ai", "password": "demo1234"})
print("Login status:", login_res.status_code)

token = None
if login_res.status_code == 200:
    data = login_res.json()
    token = data.get("access_token")
    print("Token obtained:", token[:20] + "...")

# 2. Hit analytics dashboard
headers = {}
if token:
    headers["Authorization"] = f"Bearer {token}"

res = requests.get("http://localhost:8001/api/analytics/dashboard", headers=headers)
print("Analytics status:", res.status_code)
print("Analytics body:", res.text)
