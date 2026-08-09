import requests

BASE_URL = "http://localhost:8000"

def get_token():
    res = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": "testprocurement@greenshop.ai", "password": "password123", "name": "Test User"}
    )
    if res.status_code == 200:
        return res.json()["access_token"]
    
    # Try login if exists
    res = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "testprocurement@greenshop.ai", "password": "password123"}
    )
    return res.json()["access_token"]

def main():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Testing /api/procurement/summary")
    res = requests.get(f"{BASE_URL}/api/procurement/summary", headers=headers)
    print(f"Status: {res.status_code}")
    print(res.json())
    
    print("\nTesting /api/procurement/suggestions")
    res = requests.get(f"{BASE_URL}/api/procurement/suggestions", headers=headers)
    print(f"Status: {res.status_code}")
    print(res.json())
    
    print("\nTesting /api/procurement/orders")
    res = requests.get(f"{BASE_URL}/api/procurement/orders", headers=headers)
    print(f"Status: {res.status_code}")
    print(res.json())

if __name__ == "__main__":
    main()
