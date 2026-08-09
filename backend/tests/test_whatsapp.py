"""WhatsApp webhook: verification handshake, inbound intent reply, status."""
import json


def test_webhook_verify_challenge(client):
    r = client.get("/api/whatsapp/webhook", params={
        "hub.mode": "subscribe",
        "hub.verify_token": "greenshop-demo",
        "hub.challenge": "987654",
    })
    assert r.status_code == 200
    assert r.text.strip() == "987654"


def test_webhook_verify_rejects_bad_token(client):
    r = client.get("/api/whatsapp/webhook", params={
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong", "hub.challenge": "123",
    })
    assert r.status_code in (400, 403)


def test_inbound_intent_gets_reply(client):
    payload = {
        "object": "whatsapp_business_account",
        "entry": [{"id": "1", "changes": [{
            "value": {"messaging_product": "whatsapp",
                      "messages": [{"from": "919876543210",
                                    "text": {"body": "kya waste hua?"}}]},
        }]}],
    }
    r = client.post("/api/whatsapp/webhook", json=payload)
    assert r.status_code == 200
    assert "message" in r.json()
    assert isinstance(r.json()["message"], str)


def test_inbound_status_check(client):
    payload = {
        "object": "whatsapp_business_account",
        "entry": [{"id": "1", "changes": [{"value": {"statuses": [{"id": "1"}]}}]}],
    }
    r = client.post("/api/whatsapp/webhook", json=payload)
    assert r.status_code == 200


def test_status_endpoint(client, owner_headers):
    r = client.get("/api/whatsapp/status", headers=owner_headers)
    assert r.status_code == 200
    body = r.json()
    assert "configured" in body and "verify_token" in body
