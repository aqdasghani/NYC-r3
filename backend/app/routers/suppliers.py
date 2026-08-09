"""Supplier catalogue and performance scorecard."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select

from ..deps import get_current_user, get_db, get_owner
from ..models.database import InventoryBatch, Product, Supplier, User
from ..models.schemas import MessageOut, SupplierCreate, SupplierOut, SupplierScorecardOut, SupplierUpdate

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])

def store(user):
    if not user.store_id: raise HTTPException(400, "User is not assigned to a store")
    return user.store_id

@router.get("", response_model=list[SupplierOut])
def list_suppliers(user: User = Depends(get_current_user), db=Depends(get_db)):
    return db.scalars(select(Supplier).where(Supplier.store_id == store(user))).all()

@router.post("", response_model=SupplierOut)
def create_supplier(payload: SupplierCreate, user: User = Depends(get_owner), db=Depends(get_db)):
    row=Supplier(store_id=store(user), **payload.model_dump()); db.add(row); db.commit(); db.refresh(row); return row

@router.patch("/{supplier_id}", response_model=SupplierOut)
def update_supplier(supplier_id: uuid.UUID, payload: SupplierUpdate, user: User = Depends(get_owner), db=Depends(get_db)):
    row=db.scalar(select(Supplier).where(Supplier.id==supplier_id, Supplier.store_id==store(user)))
    if not row: raise HTTPException(404,"Supplier not found")
    for k,v in payload.model_dump(exclude_unset=True).items(): setattr(row,k,v)
    db.commit(); db.refresh(row); return row

@router.delete("/{supplier_id}", response_model=MessageOut)
def delete_supplier(supplier_id: uuid.UUID, user: User = Depends(get_owner), db=Depends(get_db)):
    row=db.scalar(select(Supplier).where(Supplier.id==supplier_id, Supplier.store_id==store(user)))
    if not row: raise HTTPException(404,"Supplier not found")
    db.delete(row); db.commit(); return MessageOut(message="Supplier deleted")

@router.get("/{supplier_id}/scorecard", response_model=SupplierScorecardOut)
def scorecard(supplier_id: uuid.UUID, user: User = Depends(get_current_user), db=Depends(get_db)):
    row=db.scalar(select(Supplier).where(Supplier.id==supplier_id, Supplier.store_id==store(user)))
    if not row: raise HTTPException(404,"Supplier not found")
    products=db.scalars(select(Product).where(Product.supplier_id==row.id)).all(); product_ids=[p.id for p in products]
    batches=db.scalars(select(InventoryBatch).where(InventoryBatch.product_id.in_(product_ids))).all() if product_ids else []
    avg=sum((b.expiry_date-b.received_date).days for b in batches)/len(batches) if batches else None
    return SupplierScorecardOut(supplier_id=row.id,name=row.name,on_time_delivery_score=row.on_time_delivery_score,expiry_quality_score=row.expiry_quality_score,avg_shelf_life_days=avg,total_batches_received=len(batches),orders_count=len(batches))
