"""AI recommendation inbox and approval/execution endpoints."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from ..deps import get_db, get_owner_manager
from ..engines.action_engine import execute_action
from ..engines.detection_engine import run_detection
from ..models.database import AIRecommendation, Product, User
from ..models.schemas import ActionOut, DetectionRunSummary, ExecuteActionRequest, ExecuteActionResponse, MessageOut, Recommendation
from ..ws import manager, make_event

router = APIRouter(prefix="/api/actions", tags=["ai-actions"])

def _action(row, db) -> ActionOut:
    product=db.get(Product,row.product_id)
    recs=[Recommendation.model_validate(r) for r in (row.recommendation_json or [])]
    return ActionOut(id=row.id,product_id=row.product_id,product_name=product.name if product else "Unknown",batch_id=row.batch_id,batch_number=None,risk_type=row.risk_type,severity=row.severity,value_at_risk=float(row.value_at_risk or 0),recommendations=recs,status=row.status,created_at=row.created_at)

@router.get("/", response_model=list[ActionOut])
def list_actions(status: str = "PENDING", user: User = Depends(get_owner_manager), db=Depends(get_db)):
    rows=db.scalars(select(AIRecommendation).where(AIRecommendation.store_id==user.store_id, AIRecommendation.status==status).order_by(AIRecommendation.created_at.desc())).all()
    return [_action(r,db) for r in rows]

@router.get("/{action_id}", response_model=ActionOut)
def get_action(action_id: uuid.UUID, user: User = Depends(get_owner_manager), db=Depends(get_db)):
    row=db.scalar(select(AIRecommendation).where(AIRecommendation.id==action_id,AIRecommendation.store_id==user.store_id))
    if not row: raise HTTPException(404,"Action not found")
    return _action(row,db)

@router.post("/{action_id}/execute", response_model=ExecuteActionResponse)
async def execute(action_id: uuid.UUID, payload: ExecuteActionRequest, user: User = Depends(get_owner_manager), db=Depends(get_db)):
    row=db.scalar(select(AIRecommendation).where(AIRecommendation.id==action_id,AIRecommendation.store_id==user.store_id))
    if not row: raise HTTPException(404,"Action not found")
    try: result=execute_action(db,row,payload.selected,user)
    except ValueError as exc: raise HTTPException(409,str(exc))
    await manager.broadcast(str(user.store_id),make_event("inventory_updated",{})); await manager.broadcast(str(user.store_id),make_event("recommendation_updated",{"id":action_id,"status":"EXECUTED"}))
    return result

@router.post("/{action_id}/dismiss", response_model=MessageOut)
def dismiss(action_id: uuid.UUID, user: User = Depends(get_owner_manager), db=Depends(get_db)):
    row=db.scalar(select(AIRecommendation).where(AIRecommendation.id==action_id,AIRecommendation.store_id==user.store_id))
    if not row: raise HTTPException(404,"Action not found")
    row.status="DISMISSED"; db.commit(); return MessageOut(message="Recommendation dismissed")

@router.post("/generate", response_model=DetectionRunSummary)
def generate(user: User = Depends(get_owner_manager), db=Depends(get_db)):
    return DetectionRunSummary(**run_detection(db,user.store_id))
