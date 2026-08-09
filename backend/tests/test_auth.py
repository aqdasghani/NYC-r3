"""Auth: login, register, /me, token validation, RBAC role claims."""
import uuid

import jwt

from app.deps import redact_financials
from app.security import hash_password, verify_password


# ------------------------------------------------------------ unit: security

def test_password_hash_verify_roundtrip():
    hashed = hash_password("demo1234")
    assert hashed != "demo1234"
    assert verify_password("demo1234", hashed)
    assert not verify_password("wrong", hashed)


def test_verify_password_tolerates_garbage():
    assert not verify_password("x", "not-a-hash")


def test_redact_financials_nulls_financial_keys():
    data = {"value_at_risk": 1000, "purchase_price": 50.0, "name": "Milk",
            "recommendations": [{"action_type": "DISCOUNT", "confidence": 82}],
            "sale_price": 60.0}
    out = redact_financials(data)
    assert out["value_at_risk"] is None
    assert out["purchase_price"] is None
    assert out["sale_price"] is None
    assert out["name"] == "Milk"
    assert out["recommendations"][0]["confidence"] == 82


# ---------------------------------------------------------------- api: login

def test_login_success_returns_token_and_owner_role(client):
    r = client.post("/api/auth/login", json={"email": "rahul@greenshop.ai", "password": "demo1234"})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["user"]["role"] == "OWNER"
    assert body["user"]["email"] == "rahul@greenshop.ai"


def test_login_wrong_password_401(client):
    r = client.post("/api/auth/login", json={"email": "rahul@greenshop.ai", "password": "nope"})
    assert r.status_code == 401


def test_login_unknown_user_401(client):
    r = client.post("/api/auth/login", json={"email": "ghost@greenshop.ai", "password": "demo1234"})
    assert r.status_code == 401


def test_staff_login_has_staff_role(client):
    r = client.post("/api/auth/login", json={"email": "amit@greenshop.ai", "password": "demo1234"})
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "STAFF"


def test_me_requires_and_returns_user(client, owner_headers):
    me = client.get("/api/auth/me", headers=owner_headers)
    assert me.status_code == 200
    assert me.json()["email"] == "rahul@greenshop.ai"


def test_me_rejects_tampered_token(client):
    r = client.post("/api/auth/login", json={"email": "rahul@greenshop.ai", "password": "demo1234"})
    token = r.json()["access_token"]
    # flip a char in the signature-ish region and expect 401, not 500
    bad = token[:-2] + ("AA" if token[-2:] != "AA" else "BB")
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {bad}"})
    assert me.status_code == 401


def test_me_rejects_missing_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_register_provisions_store_and_owner(client):
    email = f"new-{uuid.uuid4().hex[:8]}@greenshop.ai"
    r = client.post("/api/auth/register", json={
        "name": "New User", "email": email, "password": "pass1234",
        "store_name": "New Bazaar"})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["user"]["email"] == email
    # A fresh account owns its own store so the dashboard and AI have scope.
    assert body["user"]["role"] == "OWNER"
    assert body["user"]["store_id"]


def test_register_rejects_duplicate_email(client):
    r = client.post("/api/auth/register", json={
        "name": "Dup", "email": "rahul@greenshop.ai", "password": "pass1234"})
    assert r.status_code == 409
