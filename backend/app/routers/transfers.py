"""Stock Transfers Router"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from ..deps import get_current_user, get_db, get_owner
from ..models.database import StockTransfer, User, Product, Store
from ..models.schemas import StockTransferCreate, StockTransferOut

router = APIRouter(prefix="/api/transfers", tags=["transfers"])

def store(user):
    if not user.store_id: raise HTTPException(400, "User is not assigned to a store")
    return user.store_id

@router.post("/", response_model=StockTransferOut)
def create_transfer(payload: StockTransferCreate, user: User = Depends(get_owner), db=Depends(get_db)):
    from_store_id = store(user)
    db_product = db.scalar(select(Product).where(Product.id == payload.product_id, Product.store_id == from_store_id))
    if not db_product:
        raise HTTPException(404, "Product not found")

    # Never record a transfer to a store that doesn't exist — that would
    # silently corrupt the transfer ledger (SQLite doesn't enforce FKs here).
    if not db.get(Store, payload.to_store_id):
        raise HTTPException(404, "Destination store not found")
    if payload.to_store_id == from_store_id:
        raise HTTPException(422, "Source and destination stores must be different")

    transfer = StockTransfer(
        from_store_id=from_store_id,
        to_store_id=payload.to_store_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        status=payload.status
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)
    return transfer

@router.get("/", response_model=list[StockTransferOut])
def list_transfers(user: User = Depends(get_current_user), db=Depends(get_db)):
    return db.scalars(select(StockTransfer).where((StockTransfer.from_store_id == store(user)) | (StockTransfer.to_store_id == store(user)))).all()
