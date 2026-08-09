"""Store-scoped WebSocket connection manager."""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.channels: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, websocket: WebSocket, store_id: str) -> None:
        await websocket.accept()
        self.channels[str(store_id)].add(websocket)

    def disconnect(self, websocket: WebSocket, store_id: str) -> None:
        self.channels[str(store_id)].discard(websocket)
        if not self.channels[str(store_id)]:
            self.channels.pop(str(store_id), None)

    async def broadcast(self, store_id: str, event: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for websocket in list(self.channels.get(str(store_id), set())):
            try:
                await websocket.send_json(event)
            except Exception:
                dead.append(websocket)
        for websocket in dead:
            self.disconnect(websocket, str(store_id))

    async def send_personal(self, websocket: WebSocket, event: dict[str, Any]) -> None:
        await websocket.send_json(event)


manager = ConnectionManager()


def make_event(event_type: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"type": event_type, "payload": payload or {}}
