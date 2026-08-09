import requests

tests = [
    ("No Auth Header", {}),
    ("Mock Bearer Token", {"Authorization": "Bearer mock-token-123"}),
    ("Invalid Bearer", {"Authorization": "Bearer invalid"}),
    ("Malformed Auth Header", {"Authorization": "invalid"}),
]

for label, headers in tests:
    try:
        r = requests.get("http://localhost:8001/api/analytics/dashboard", headers=headers)
        print(f"[{label}] -> Status: {r.status_code}, Body: {r.text[:100]}")
    except Exception as e:
        print(f"[{label}] -> Exception: {e}")
