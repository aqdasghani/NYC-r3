from __future__ import annotations


def test_demo_reset_is_forbidden_outside_demo_env(client):
    r = client.post("/api/demo/reset")
    assert r.status_code == 403, r.text


def test_demo_accounts_are_forbidden_outside_demo_env(client):
    r = client.get("/api/demo/accounts")
    assert r.status_code == 403, r.text
