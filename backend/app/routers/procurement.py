from __future__ import annotations

import math
import uuid
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, func

from ..models.database import (
    InventoryBatch,
    Product,
    PurchaseOrder,
    PurchaseOrderItem,
    Supplier,
    User,
)
from ..deps import get_db, get_owner_manager, _store
from ..engines.forecast_engine import calculate_velocity, stockout_eta, reorder_quantity

router = APIRouter(prefix="/api/procurement", tags=["procurement"])


# --- Custom Schemas ---

class ProcurementSummary(BaseModel):
    active_pos: int
    spend_mtd: float
    delayed_deliveries: int

class ProcurementSuggestion(BaseModel):
    id: str  # For frontend list keys (can use product_id)
    product_id: uuid.UUID
    product: str
    supplier: str
    supplier_id: Optional[uuid.UUID]
    suggestedQty: int
    confidence: int
    status: str

class PurchaseOrderListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    supplier: str
    date: str
    amount: str
    status: str

class PurchaseOrderItemRequest(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0)
    unit_price: Optional[int] = None


class PurchaseOrderCreateRequest(BaseModel):
    supplier_id: uuid.UUID
    expected_delivery: Optional[date] = None
    items: list[PurchaseOrderItemRequest] = []


VALID_PO_STATUSES = {"Pending", "Processing", "In Transit", "Received", "Delivered", "Cancelled"}


# --- Routes ---

@router.get("/summary", response_model=ProcurementSummary)
def get_summary(user: User = Depends(get_owner_manager), db=Depends(get_db)):
    store_id = _store(user)
    today = date.today()
    first_of_month = today.replace(day=1)
    
    # Active POs (Pending or Processing)
    active_pos = db.scalar(
        select(func.count(PurchaseOrder.id))
        .where(PurchaseOrder.store_id == store_id, PurchaseOrder.status.in_(["Pending", "Processing", "In Transit"]))
    ) or 0
    
    # Delayed Deliveries (Pending/Processing/In Transit where expected_delivery < today)
    delayed_deliveries = db.scalar(
        select(func.count(PurchaseOrder.id))
        .where(
            PurchaseOrder.store_id == store_id,
            PurchaseOrder.status.in_(["Pending", "Processing", "In Transit"]),
            PurchaseOrder.expected_delivery < today
        )
    ) or 0

    # Spend MTD
    po_items = db.execute(
        select(PurchaseOrderItem)
        .join(PurchaseOrder)
        .where(PurchaseOrder.store_id == store_id, PurchaseOrder.created_at >= first_of_month)
    ).scalars().all()
    
    spend_mtd = sum((item.quantity * (item.unit_price or 0)) for item in po_items)

    return ProcurementSummary(
        active_pos=active_pos,
        spend_mtd=float(spend_mtd),
        delayed_deliveries=delayed_deliveries
    )


@router.get("/orders", response_model=list[PurchaseOrderListOut])
def get_orders(user: User = Depends(get_owner_manager), db=Depends(get_db)):
    store_id = _store(user)
    
    pos = db.execute(
        select(PurchaseOrder)
        .where(PurchaseOrder.store_id == store_id)
        .order_by(PurchaseOrder.created_at.desc())
        .limit(50)
    ).scalars().all()
    
    result = []
    for po in pos:
        supplier = db.get(Supplier, po.supplier_id)
        supplier_name = supplier.name if supplier else "Unknown Supplier"
        
        items = db.execute(select(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == po.id)).scalars().all()
        amount = sum((item.quantity * (item.unit_price or 0)) for item in items)
        
        created_date = po.created_at.date()
        today = date.today()
        if created_date == today:
            date_str = "Today"
        elif (today - created_date).days == 1:
            date_str = "Yesterday"
        else:
            date_str = created_date.strftime("%b %d")
            
        result.append(PurchaseOrderListOut(
            id=f"PO-{po.created_at.year}-{str(po.id)[:6].upper()}",
            supplier=supplier_name,
            date=date_str,
            amount=f"₹{amount:,.0f}",
            status=po.status
        ))
        
    return result


@router.get("/suggestions", response_model=list[ProcurementSuggestion])
def get_suggestions(user: User = Depends(get_owner_manager), db=Depends(get_db)):
    store_id = _store(user)
    products = db.scalars(select(Product).where(Product.store_id == store_id)).all()
    
    result = []
    for p in products:
        batches = db.scalars(select(InventoryBatch).where(InventoryBatch.product_id == p.id, InventoryBatch.quantity > 0)).all()
        qty = sum(b.quantity for b in batches)
        velocity = calculate_velocity(db, store_id, p.id)
        eta = stockout_eta(qty, velocity)
        
        if eta <= max(7, p.lead_time_days + 2) or qty == 0:
            suggested_qty = reorder_quantity(qty, velocity, p.lead_time_days)
            if suggested_qty > 0:
                supplier = db.get(Supplier, p.supplier_id) if p.supplier_id else None
                supplier_name = supplier.name if supplier else "Unknown Supplier"
                
                confidence = max(50, min(99, 100 - int(eta * 3) if math.isfinite(eta) else 50))
                
                pending_po_item = db.execute(
                    select(PurchaseOrderItem)
                    .join(PurchaseOrder)
                    .where(
                        PurchaseOrderItem.product_id == p.id,
                        PurchaseOrder.store_id == store_id,
                        PurchaseOrder.status.in_(["Pending", "Processing", "In Transit"])
                    )
                ).scalars().first()
                
                status = "Approved" if pending_po_item else "Pending"
                
                result.append(ProcurementSuggestion(
                    id=str(p.id),
                    product_id=p.id,
                    product=p.name,
                    supplier=supplier_name,
                    supplier_id=supplier.id if supplier else None,
                    suggestedQty=suggested_qty,
                    confidence=confidence,
                    status=status
                ))
    
    return sorted(result, key=lambda x: x.confidence, reverse=True)


@router.post("/orders")
def create_order(payload: PurchaseOrderCreateRequest, user: User = Depends(get_owner_manager), db=Depends(get_db)):
    store_id = _store(user)

    supplier = db.get(Supplier, payload.supplier_id)
    if not supplier or supplier.store_id != store_id:
        raise HTTPException(status_code=404, detail="Supplier not found")

    po = PurchaseOrder(
        store_id=store_id,
        supplier_id=payload.supplier_id,
        status="Pending",
        expected_delivery=payload.expected_delivery
    )
    db.add(po)
    db.flush()

    for item in payload.items:
        product = db.get(Product, item.product_id)
        if not product or product.store_id != store_id:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found in this store")
        unit_price = item.unit_price if item.unit_price is not None else int(product.purchase_price or 0)
        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=unit_price
        )
        db.add(po_item)

    db.commit()
    return {"message": "Purchase order created", "id": po.id}


@router.patch("/orders/{order_id}")
def update_order_status(order_id: uuid.UUID, status: str = Query(...), user: User = Depends(get_owner_manager), db=Depends(get_db)):
    if status not in VALID_PO_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid status {status!r}. Allowed: {', '.join(sorted(VALID_PO_STATUSES))}")
    store_id = _store(user)
    po = db.get(PurchaseOrder, order_id)
    if not po or po.store_id != store_id:
        raise HTTPException(status_code=404, detail="Purchase Order not found")

    po.status = status
    db.commit()
    return {"message": f"Purchase order status updated to {status}"}
