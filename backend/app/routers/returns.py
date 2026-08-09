"""Returns Router"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from ..deps import get_current_user, get_db, get_owner
from ..models.database import Return, User, Product
from ..models.schemas import ReturnCreate, ReturnOut

router = APIRouter(prefix="/api/returns", tags=["returns"])

def store(user):
    if not user.store_id: raise HTTPException(400, "User is not assigned to a store")
    return user.store_id

@router.post("/", response_model=ReturnOut)
def create_return(payload: ReturnCreate, user: User = Depends(get_owner), db=Depends(get_db)):
    db_product = db.scalar(select(Product).where(Product.id == payload.product_id, Product.store_id == store(user)))
    if not db_product:
        raise HTTPException(404, "Product not found")
        
    ret = Return(
        store_id=store(user),
        pos_session_id=payload.pos_session_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        reason=payload.reason,
        status=payload.status
    )
    db.add(ret)
    db.commit()
    db.refresh(ret)
    return ret

@router.get("/", response_model=list[ReturnOut])
def list_returns(user: User = Depends(get_current_user), db=Depends(get_db)):
    return db.scalars(select(Return).where(Return.store_id == store(user))).all()
