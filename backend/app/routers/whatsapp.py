"""Meta WhatsApp webhook and natural-language intent assistant."""
from __future__ import annotations
import json
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import PlainTextResponse
from ..config import settings
from ..deps import get_owner_manager
from ..integrations.whatsapp_service import classify_intent, intent_response, verify_signature, verify_token
from ..models.database import User
from ..models.schemas import MessageOut, WhatsAppStatusOut, WhatsAppWebhookIn

router=APIRouter(prefix="/api/whatsapp",tags=["whatsapp"])

@router.get("/webhook",response_class=PlainTextResponse)
def verify_webhook(hub_mode:str=Query("",alias="hub.mode"),hub_verify_token:str=Query("",alias="hub.verify_token"),hub_challenge:str=Query("",alias="hub.challenge")):
    if hub_mode=="subscribe" and verify_token(hub_verify_token): return hub_challenge
    raise HTTPException(403,"Webhook verification failed")

@router.post("/webhook",response_model=MessageOut)
def inbound(payload:WhatsAppWebhookIn, x_hub_signature_256:str|None=Header(None)):
    raw=payload.model_dump_json().encode()
    if not verify_signature(raw,x_hub_signature_256): raise HTTPException(403,"Invalid webhook signature")
    text=""; sender=""
    for entry in payload.entry:
        for change in entry.get("changes",[]):
            value=change.get("value",{})
            for message in value.get("messages",[]):
                sender=message.get("from",sender); text=message.get("text",{}).get("body",text)
    intent=classify_intent(text)
    context={"important_actions":0,"est_impact":0,"at_risk_count":0,"at_risk_value":0,"waste_prevented":0,"reorder_count":0,"reorder_units":0}
    if text and sender:
        # The webhook is deliberately safe in demo mode; dashboard-authenticated context can be added later.
        pass
    return MessageOut(message=intent_response(intent,context))

@router.get("/status",response_model=WhatsAppStatusOut)
def status(user:User=Depends(get_owner_manager)): return WhatsAppStatusOut(configured=bool(settings.WHATSAPP_API_TOKEN and settings.WHATSAPP_PHONE_ID),verify_token=settings.WHATSAPP_VERIFY_TOKEN,phone_id=settings.WHATSAPP_PHONE_ID)
