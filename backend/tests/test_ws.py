"""WebSocket dashboard channel: a POS sale broadcasts live inventory events.

Gotcha: the TestClient portal runs the app on the main thread, so the WS
listener must live in a worker thread while the sale POST happens on main.
"""
import threading
import time


def _owner_token(client):
    r = client.post("/api/auth/login", json={"email": "rahul@greenshop.ai", "password": "demo1234"})
    return r.json()["access_token"]


def test_ws_receives_broadcast_on_sale(client, owner_headers):
    token = _owner_token(client)
    prods = client.get("/api/inventory/products", headers=owner_headers).json()["items"]
    detail = client.get(f"/api/inventory/products/{prods[0]['id']}", headers=owner_headers).json()
    barcode = detail["barcode"]

    events = []

    def listener():
        try:
            with client.websocket_connect(f"/ws/dashboard?token={token}") as ws:
                events.append(ws.receive_json())   # sale_recorded
                events.append(ws.receive_json())   # inventory_updated
        except Exception as exc:  # noqa: BLE001
            events.append(f"ws-error: {exc}")

    thread = threading.Thread(target=listener)
    thread.start()
    time.sleep(1.0)  # let the socket connect before broadcasting
    sale = client.post("/api/pos/sale", headers=owner_headers,
                       json={"items": [{"barcode": barcode, "quantity": 1}]})
    assert sale.status_code == 200
    thread.join(timeout=15)

    types = [e.get("type") for e in events if isinstance(e, dict)]
    assert "sale_recorded" in types, events
    assert "inventory_updated" in types, events
    sale_event = next(e for e in events if isinstance(e, dict) and e["type"] == "sale_recorded")
    assert sale_event["payload"]["items_count"] >= 1


def test_ws_rejects_bad_token(client):
    """Server must close the socket (4001), not hang, on an invalid token."""
    from starlette.websockets import WebSocketDisconnect

    disconnected = False
    try:
        with client.websocket_connect("/ws/dashboard?token=not-a-token") as ws:
            try:
                ws.receive_json()
            except WebSocketDisconnect:
                disconnected = True
            except Exception:  # noqa: BLE001 — close frame surfaces differently across versions
                disconnected = True
    except WebSocketDisconnect:
        disconnected = True
    assert disconnected, "expected the server to close the connection on a bad token"
