"""Supplier catalogue, onboarding, and performance scorecard."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select

from ..deps import get_current_user, get_db, get_owner
from ..models.database import InventoryBatch, Product, PurchaseOrder, PurchaseOrderItem, Supplier, User
from ..models.schemas import (
    MessageOut,
    PurchaseOrderCreate,
    PurchaseOrderOut,
    SupplierCreate,
    SupplierOut,
    SupplierScorecardOut,
    SupplierSummaryOut,
    SupplierUpdate,
)

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


def store(user: User):
    if not user.store_id:
        raise HTTPException(400, "User is not assigned to a store")
    return user.store_id


@router.get("", response_model=list[SupplierOut])
def list_suppliers(user: User = Depends(get_current_user), db=Depends(get_db)):
    return db.scalars(
        select(Supplier)
        .where(Supplier.store_id == store(user))
        .order_by(Supplier.created_at.desc())
    ).all()


@router.get("/summary", response_model=SupplierSummaryOut)
def supplier_summary(user: User = Depends(get_current_user), db=Depends(get_db)):
    sid = store(user)
    suppliers = db.scalars(select(Supplier).where(Supplier.store_id == sid)).all()
    total_active = len(suppliers)
    
    # Calculate new suppliers added in the current month (last 30 days)
    now = datetime.now()
    first_of_month = datetime(now.year, now.month, 1)
    new_this_month = sum(1 for s in suppliers if s.created_at and s.created_at >= first_of_month)
    
    # Calculate average fulfillment / on-time delivery score
    scores = [s.on_time_delivery_score for s in suppliers if s.on_time_delivery_score is not None]
    avg_fulfillment = float(round(sum(scores) / len(scores), 1)) if scores else 95.0
    
    # Fetch real Purchase Orders from DB
    pos = db.scalars(select(PurchaseOrder).where(PurchaseOrder.store_id == sid)).all()
    pending_pos = [p for p in pos if p.status.lower() in ("pending", "open", "ordered")]
    pending_orders_count = len(pending_pos)
    pending_suppliers = len(set(p.supplier_id for p in pending_pos))
    
    # Issues / Delays: count delayed POs or suppliers with score < 80
    low_score_suppliers = sum(1 for s in suppliers if (s.on_time_delivery_score or 100) < 80)
    issues_count = low_score_suppliers + sum(1 for p in pending_pos if p.expected_delivery and p.expected_delivery < now.date())

    return SupplierSummaryOut(
        total_active=total_active,
        new_this_month=new_this_month,
        avg_fulfillment=avg_fulfillment,
        pending_orders_count=pending_orders_count,
        pending_orders_supplier_count=pending_suppliers,
        issues_delays_count=issues_count,
    )


@router.post("", response_model=SupplierOut)
def create_supplier(payload: SupplierCreate, user: User = Depends(get_owner), db=Depends(get_db)):
    sid = store(user)
    data = payload.model_dump()
    row = Supplier(
        store_id=sid,
        on_time_delivery_score=95.0,
        expiry_quality_score=98.0,
        **data,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/pos", response_model=list[PurchaseOrderOut])
def list_purchase_orders(user: User = Depends(get_current_user), db=Depends(get_db)):
    return db.scalars(select(PurchaseOrder).where(PurchaseOrder.store_id == store(user))).all()


@router.post("/pos", response_model=PurchaseOrderOut)
def create_purchase_order(payload: PurchaseOrderCreate, user: User = Depends(get_owner), db=Depends(get_db)):
    db_supplier = db.scalar(select(Supplier).where(Supplier.id == payload.supplier_id, Supplier.store_id == store(user)))
    if not db_supplier:
        raise HTTPException(404, "Supplier not found")
    po = PurchaseOrder(
        store_id=store(user),
        supplier_id=payload.supplier_id,
        status=payload.status,
        expected_delivery=payload.expected_delivery,
    )
    db.add(po)
    for item in payload.items:
        db_item = PurchaseOrderItem(
            purchase_order=po,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
        )
        db.add(db_item)
    db.commit()
    db.refresh(po)
    return po


@router.get("/{supplier_id}", response_model=SupplierOut)
def get_supplier(supplier_id: uuid.UUID, user: User = Depends(get_current_user), db=Depends(get_db)):
    row = db.scalar(select(Supplier).where(Supplier.id == supplier_id, Supplier.store_id == store(user)))
    if not row:
        raise HTTPException(404, "Supplier not found")
    return row


@router.patch("/{supplier_id}", response_model=SupplierOut)
def update_supplier(supplier_id: uuid.UUID, payload: SupplierUpdate, user: User = Depends(get_owner), db=Depends(get_db)):
    row = db.scalar(select(Supplier).where(Supplier.id == supplier_id, Supplier.store_id == store(user)))
    if not row:
        raise HTTPException(404, "Supplier not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{supplier_id}", response_model=MessageOut)
def delete_supplier(supplier_id: uuid.UUID, user: User = Depends(get_owner), db=Depends(get_db)):
    row = db.scalar(select(Supplier).where(Supplier.id == supplier_id, Supplier.store_id == store(user)))
    if not row:
        raise HTTPException(404, "Supplier not found")
    db.delete(row)
    db.commit()
    return MessageOut(message="Supplier deleted successfully")


@router.get("/{supplier_id}/scorecard", response_model=SupplierScorecardOut)
def scorecard(supplier_id: uuid.UUID, user: User = Depends(get_current_user), db=Depends(get_db)):
    row = db.scalar(select(Supplier).where(Supplier.id == supplier_id, Supplier.store_id == store(user)))
    if not row:
        raise HTTPException(404, "Supplier not found")
    products = db.scalars(select(Product).where(Product.supplier_id == row.id)).all()
    product_ids = [p.id for p in products]
    batches = db.scalars(select(InventoryBatch).where(InventoryBatch.product_id.in_(product_ids))).all() if product_ids else []
    avg = sum((b.expiry_date - b.received_date).days for b in batches) / len(batches) if batches else None
    orders_count = db.scalar(
        select(func.count()).select_from(PurchaseOrder).where(PurchaseOrder.supplier_id == row.id)
    ) or 0
    return SupplierScorecardOut(
        supplier_id=row.id,
        name=row.name,
        on_time_delivery_score=row.on_time_delivery_score,
        expiry_quality_score=row.expiry_quality_score,
        avg_shelf_life_days=avg,
        total_batches_received=len(batches),
        orders_count=orders_count,
    )
