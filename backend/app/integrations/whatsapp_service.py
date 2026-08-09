"""WhatsApp Business API helpers, signature verification, and five intents."""
from __future__ import annotations

import hashlib
import hmac
import re
from typing import Any

from ..config import settings

INTENTS = ("daily_brief", "reorder_query", "expiry_check", "stock_check", "waste_report")


def verify_token(token: str) -> bool:
    return hmac.compare_digest(token or "", settings.WHATSAPP_VERIFY_TOKEN)


def verify_signature(body: bytes, signature: str | None) -> bool:
    if not settings.WHATSAPP_API_TOKEN:
        # Local/demo mode: accept unsigned payloads; production always sets the API token.
        return True
    if not signature or not signature.startswith("sha256="):
        return False
    expected = hmac.new(settings.WHATSAPP_API_TOKEN.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature[7:], expected)


def classify_intent(text: str) -> str:
    normalized = text.lower().strip()
    if any(k in normalized for k in ("aaj kya", "today", "brief", "priority", "करना")):
        return "daily_brief"
    if any(k in normalized for k in ("order", "reorder", "खरीद", "mangwana")):
        return "reorder_query"
    if any(k in normalized for k in ("expire", "expiry", "expiry", "खराब", "समाप्त")):
        return "expiry_check"
    if any(k in normalized for k in ("stock", "kitna", "कितना", "inventory", "bacha")):
        return "stock_check"
    if any(k in normalized for k in ("waste", "loss", "bachaya", "बर्बाद", "नुकसान")):
        return "waste_report"
    return "daily_brief"


def intent_response(intent: str, context: dict[str, Any]) -> str:
    if intent == "stock_check":
        product = context.get("product_name", "your products")
        return f"📦 {product}: {context.get('quantity', 0)} units in stock. Sales velocity {context.get('velocity', 0):.1f}/day."
    if intent == "expiry_check":
        return f"🔴 {context.get('at_risk_count', 0)} batches need attention. Value at risk: ₹{context.get('at_risk_value', 0):,.0f}."
    if intent == "reorder_query":
        return f"🔵 {context.get('reorder_count', 0)} reorder suggestions. Estimated units: {context.get('reorder_units', 0)}."
    if intent == "waste_report":
        return f"♻️ You prevented ₹{context.get('waste_prevented', 0):,.0f} of potential waste this month."
    return f"☀️ Today's brief: {context.get('important_actions', 0)} priority actions, estimated impact ₹{context.get('est_impact', 0):,.0f}."


def send_message(to: str, text: str) -> dict:
    """Send through Meta when configured; otherwise return a deterministic mock."""
    if not (settings.WHATSAPP_API_TOKEN and settings.WHATSAPP_PHONE_ID):
        return {"sent": False, "mode": "mock", "to": to, "text": text}
    import httpx
    response = httpx.post(
        f"https://graph.facebook.com/v19.0/{settings.WHATSAPP_PHONE_ID}/messages",
        headers={"Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}"},
        json={"messaging_product": "whatsapp", "to": to, "type": "text", "text": {"body": text}},
        timeout=8,
    )
    response.raise_for_status()
    return {"sent": True, **response.json()}
