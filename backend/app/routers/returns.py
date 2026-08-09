from __future__ import annotations

import uuid
from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..deps import get_current_user, get_db, require_roles
from ..models.database import InventoryBatch, Product, Return, ReturnItem, Sale, User
from ..models.schemas import ReturnCreate, ReturnOut

router = APIRouter(prefix="/api/returns", tags=["returns"])


def _get_store(user: User) -> uuid.UUID:
    if not user.store_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not assigned to a store")
    return user.store_id


@router.post("", response_model=ReturnOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ReturnOut, status_code=status.HTTP_201_CREATED)
def create_return(
    payload: ReturnCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER", "BILLER", "BILL"))
) -> ReturnOut:
    """Create a product return and adjust inventory accordingly."""
    store_id = _get_store(current_user)

    if payload.sale_id:
        sale = db.scalar(select(Sale).where(Sale.id == payload.sale_id, Sale.store_id == store_id))
        if not sale:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated sale record not found in your store")

    ret = Return(
        store_id=store_id,
        customer_id=payload.customer_id,
        sale_id=payload.sale_id,
        total_refund=payload.total_refund,
        reason=payload.reason,
    )
    db.add(ret)
    db.flush()

    total_refund_calc = 0.0

    for item in payload.items:
        product = db.scalar(select(Product).where(Product.id == item.product_id, Product.store_id == store_id))
        if not product:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item.product_id} not found in store")

        refund_amt = item.refund_amount if item.refund_amount is not None else float(product.selling_price or 0.0) * item.quantity
        total_refund_calc += float(refund_amt)

        ret_item = ReturnItem(
            return_id=ret.id,
            product_id=item.product_id,
            batch_id=item.batch_id,
            quantity=item.quantity,
            refund_amount=refund_amt,
            condition=item.condition or "SELLABLE",
        )
        db.add(ret_item)

        # Restock inventory if condition is SELLABLE
        if (item.condition or "SELLABLE") == "SELLABLE":
            if item.batch_id:
                batch = db.scalar(select(InventoryBatch).where(InventoryBatch.id == item.batch_id))
                if batch:
                    batch.quantity += item.quantity
            else:
                batch = InventoryBatch(
                    product_id=item.product_id,
                    store_id=store_id,
                    batch_number=f"RET-{ret.id.hex[:6].upper()}",
                    quantity=item.quantity,
                    expiry_date=date.today(),
                    purchase_price=product.purchase_price or 0.0,
                    received_date=date.today(),
                )
                db.add(batch)

    if not payload.total_refund:
        ret.total_refund = total_refund_calc

    db.commit()
    db.refresh(ret)
    return ret


@router.get("", response_model=List[ReturnOut])
@router.get("/", response_model=List[ReturnOut])
def get_returns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[ReturnOut]:
    """List all customer returns for current store."""
    store_id = _get_store(current_user)
    returns = db.scalars(
        select(Return)
        .options(joinedload(Return.items))
        .where(Return.store_id == store_id)
        .order_by(Return.return_date.desc())
    ).unique().all()
    return returns


@router.get("/{return_id}", response_model=ReturnOut)
def get_return(
    return_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ReturnOut:
    """Get single return by ID."""
    store_id = _get_store(current_user)
    ret = db.scalar(
        select(Return)
        .options(joinedload(Return.items))
        .where(Return.id == return_id, Return.store_id == store_id)
    )
    if not ret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return record not found")
    return ret
