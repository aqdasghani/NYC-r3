"""WebSocket channel for live dashboard updates."""
from __future__ import annotations

from fastapi import APIRouter, Query, WebSocket
from fastapi.websockets import WebSocketDisconnect

from ..security import decode_token
from ..ws import manager

router = APIRouter()


@router.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket, token: str = Query(default="")):
    try:
        payload = decode_token(token)
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return
    store_id = payload.get("store_id") or payload.get("sub")
    await manager.connect(websocket, str(store_id))
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, str(store_id))
