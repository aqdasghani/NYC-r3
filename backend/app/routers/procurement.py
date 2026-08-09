from __future__ import annotations

import uuid
from datetime import date, timedelta
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..deps import get_current_user, get_db, require_roles
from ..engines.forecast_engine import calculate_velocity, reorder_quantity, days_of_supply
from ..models.database import InventoryBatch, Product, PurchaseOrder, PurchaseOrderItem, Sale, Supplier, User
from ..models.schemas import PurchaseOrderCreate, PurchaseOrderOut, ReorderSuggestion

router = APIRouter(prefix="/api/procurement", tags=["Procurement"])


def _get_store(user: User) -> uuid.UUID:
    if not user.store_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not assigned to a store")
    return user.store_id


@router.post("/orders", response_model=PurchaseOrderOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PurchaseOrderOut, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    po_in: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
) -> Any:
    """Create a new purchase order for the current user's store."""
    store_id = _get_store(current_user)

    # Validate supplier exists and belongs to store
    supplier = db.scalar(select(Supplier).where(Supplier.id == po_in.supplier_id, Supplier.store_id == store_id))
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found in your store")

    total_amount = po_in.total_amount or 0.0

    po = PurchaseOrder(
        store_id=store_id,
        supplier_id=po_in.supplier_id,
        status=po_in.status or "DRAFT",
        total_amount=total_amount,
        expected_delivery_date=po_in.expected_delivery_date,
    )
    db.add(po)
    db.flush()

    computed_total = 0.0
    for item in po_in.items:
        product = db.scalar(select(Product).where(Product.id == item.product_id, Product.store_id == store_id))
        if not product:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item.product_id} not found in store")
        
        unit_price = item.unit_price if item.unit_price is not None else (product.purchase_price or 0.0)
        computed_total += float(unit_price) * item.quantity

        po_item = PurchaseOrderItem(
            po_id=po.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=unit_price,
            received_quantity=item.received_quantity or 0,
        )
        db.add(po_item)

    if not po_in.total_amount:
        po.total_amount = computed_total

    db.commit()
    db.refresh(po)
    return po


@router.get("/orders", response_model=List[PurchaseOrderOut])
@router.get("/", response_model=List[PurchaseOrderOut])
def get_purchase_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get all purchase orders for current user's store."""
    store_id = _get_store(current_user)
    pos = db.scalars(
        select(PurchaseOrder)
        .options(joinedload(PurchaseOrder.items))
        .where(PurchaseOrder.store_id == store_id)
        .order_by(PurchaseOrder.created_at.desc())
    ).unique().all()
    return pos


@router.get("/orders/{po_id}", response_model=PurchaseOrderOut)
def get_purchase_order(
    po_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get a single purchase order by ID."""
    store_id = _get_store(current_user)
    po = db.scalar(
        select(PurchaseOrder)
        .options(joinedload(PurchaseOrder.items))
        .where(PurchaseOrder.id == po_id, PurchaseOrder.store_id == store_id)
    )
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    return po


@router.get("/suggestions", response_model=List[ReorderSuggestion])
def get_reorder_suggestions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Calculate low-stock reorder suggestions for store products."""
    store_id = _get_store(current_user)
    products = db.scalars(select(Product).where(Product.store_id == store_id)).all()
    
    cutoff = date.today() - timedelta(days=30)
    sales = db.scalars(
        select(Sale).where(Sale.store_id == store_id, Sale.sale_date >= cutoff)
    ).all()

    batches = db.scalars(
        select(InventoryBatch).where(InventoryBatch.store_id == store_id)
    ).all()

    stock_map: dict[uuid.UUID, int] = {}
    for b in batches:
        stock_map[b.product_id] = stock_map.get(b.product_id, 0) + b.quantity

    suggestions = []
    for p in products:
        current_qty = stock_map.get(p.id, 0)
        p_sales = [s for s in sales if s.product_id == p.id]
        velocity = calculate_velocity(p_sales, days=30)
        
        # Check stockout condition or low inventory
        days_left = days_of_supply(current_qty, velocity)
        if current_qty < (velocity * p.lead_time_days * 1.5) or days_left < p.lead_time_days * 2 or current_qty == 0:
            suggested_qty = reorder_quantity(velocity, p.lead_time_days, current_qty)
            if suggested_qty > 0 or current_qty == 0:
                suggestions.append(
                    ReorderSuggestion(
                        product_id=p.id,
                        name=p.name,
                        current_qty=current_qty,
                        velocity=round(velocity, 2),
                        lead_time_days=p.lead_time_days,
                        suggested_qty=max(10, suggested_qty),
                        stockout_eta=round(days_left, 1) if days_left < 999 else None,
                    )
                )

    return suggestions


@router.post("/orders/{po_id}/receive", response_model=PurchaseOrderOut)
def receive_purchase_order(
    po_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
) -> Any:
    """Mark a purchase order as received and update inventory atomically."""
    store_id = _get_store(current_user)
    po = db.scalar(
        select(PurchaseOrder)
        .options(joinedload(PurchaseOrder.items))
        .where(PurchaseOrder.id == po_id, PurchaseOrder.store_id == store_id)
    )
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase Order not found")
    if po.status == "RECEIVED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Purchase Order already received")

    for item in po.items:
        product = db.scalar(select(Product).where(Product.id == item.product_id))
        item.received_quantity = item.quantity
        
        batch = InventoryBatch(
            product_id=item.product_id,
            store_id=store_id,
            batch_number=f"PO-{po.id.hex[:6].upper()}",
            quantity=item.quantity,
            expiry_date=date.today() + timedelta(days=180),
            purchase_price=item.unit_price or (product.purchase_price if product else 0.0),
            received_date=date.today(),
        )
        db.add(batch)

    po.status = "RECEIVED"
    db.commit()
    db.refresh(po)
    return po
