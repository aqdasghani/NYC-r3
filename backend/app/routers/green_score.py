"""Green Score current value, history, and recalculation."""
from __future__ import annotations
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select
from ..deps import get_current_user, get_db, get_owner_manager
from ..engines.score_engine import calculate_green_score, persist_history
from ..models.database import GreenScoreHistory, User
from ..models.schemas import GreenScoreHistoryPoint, GreenScoreOut, ScoreComponent

router=APIRouter(prefix="/api/green-score",tags=["green-score"])

def output(values):
    return GreenScoreOut(**values,breakdown=[ScoreComponent(name="Expiry Prevention",weight=.30,value=values["expiry_score"],note="At-risk stock cleared before expiry"),ScoreComponent(name="Inventory Efficiency",weight=.30,value=values["inventory_score"],note="Healthy stock turnover"),ScoreComponent(name="Dead Stock Control",weight=.20,value=values["dead_stock_score"],note="Capital not locked in stale stock"),ScoreComponent(name="Waste Reduction",weight=.20,value=values["waste_score"],note="Potential waste prevented")])

@router.get("/current",response_model=GreenScoreOut)
def current(user:User=Depends(get_current_user),db=Depends(get_db)): return output(calculate_green_score(db,user.store_id))
@router.get("/history",response_model=list[GreenScoreHistoryPoint])
def history(days:int=30,user:User=Depends(get_current_user),db=Depends(get_db)):
    rows=db.scalars(select(GreenScoreHistory).where(GreenScoreHistory.store_id==user.store_id).order_by(GreenScoreHistory.period_date.desc()).limit(days)).all(); return [GreenScoreHistoryPoint(period_date=r.period_date,score=float(r.score)) for r in reversed(rows)]
@router.post("/recalculate",response_model=GreenScoreOut)
def recalculate(user:User=Depends(get_owner_manager),db=Depends(get_db)): return output(persist_history(db,user.store_id))
