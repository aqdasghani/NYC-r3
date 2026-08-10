"""Demo environment controls — isolated seed reset and demo accounts."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..deps import get_db
from ..models.database import create_all, drop_all
from ..seed import seed_if_empty

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.post("/reset")
def reset_demo_data(db: Session = Depends(get_db)):
    """Reset demo dataset back to initial clean synthetic seed state."""
    drop_all()
    create_all()
    res = seed_if_empty(seed_synthetic_data=True)
    return {"status": "ok", "message": "Demo data reset successfully", "seed_result": res}


@router.get("/accounts")
def get_demo_accounts():
    """List public demo role accounts for presentation/testing."""
    return [
        {"role": "OWNER", "name": "Rahul Sharma", "email": "rahul@greenshop.ai", "password": "demo1234"},
        {"role": "MANAGER", "name": "Priya Verma", "email": "priya@greenshop.ai", "password": "demo1234"},
        {"role": "BILLER", "name": "Neha Singh", "email": "neha@greenshop.ai", "password": "demo1234"},
        {"role": "WORKER", "name": "Amit Kumar", "email": "amit@greenshop.ai", "password": "demo1234"},
    ]
