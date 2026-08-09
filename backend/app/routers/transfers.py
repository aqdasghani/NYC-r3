from __future__ import annotations

import uuid
from datetime import date
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..deps import get_current_user, get_db, require_roles
from ..models.database import InventoryBatch, Product, StockTransfer, StockTransferItem, Store, User
from ..models.schemas import StockTransferCreate, StockTransferOut

router = APIRouter(prefix="/api/transfers", tags=["Transfers"])


def _get_store(user: User) -> uuid.UUID:
    if not user.store_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not assigned to a store")
    return user.store_id


@router.post("/", response_model=StockTransferOut, status_code=status.HTTP_201_CREATED)
def create_transfer(
    transfer_in: StockTransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
) -> Any:
    """Create a new stock transfer from current user's store to destination store."""
    source_store_id = _get_store(current_user)

    if source_store_id == transfer_in.destination_store_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Source and destination store cannot be the same")

    destination_store = db.scalar(select(Store).where(Store.id == transfer_in.destination_store_id))
    if not destination_store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination store not found")

    if not transfer_in.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transfer must contain at least one item")

    transfer = StockTransfer(
        source_store_id=source_store_id,
        destination_store_id=transfer_in.destination_store_id,
        status="PENDING",
    )
    db.add(transfer)
    db.flush()

    for item in transfer_in.items:
        if item.batch_id:
            batch = db.scalar(select(InventoryBatch).where(InventoryBatch.id == item.batch_id, InventoryBatch.store_id == source_store_id))
            if not batch:
                db.rollback()
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Batch {item.batch_id} not found in source store")
            if batch.quantity < item.quantity:
                db.rollback()
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Insufficient stock for batch {batch.id}")
            batch.quantity -= item.quantity
        else:
            product = db.scalar(select(Product).where(Product.id == item.product_id, Product.store_id == source_store_id))
            if not product:
                db.rollback()
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item.product_id} not found in source store")

        tf_item = StockTransferItem(
            transfer_id=transfer.id,
            product_id=item.product_id,
            batch_id=item.batch_id,
            quantity=item.quantity,
        )
        db.add(tf_item)

    db.commit()
    db.refresh(transfer)
    return transfer


@router.get("/", response_model=List[StockTransferOut])
def get_transfers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get all transfers involving current user's store (inbound or outbound)."""
    store_id = _get_store(current_user)
    transfers = db.scalars(
        select(StockTransfer)
        .options(joinedload(StockTransfer.items))
        .where((StockTransfer.source_store_id == store_id) | (StockTransfer.destination_store_id == store_id))
        .order_by(StockTransfer.created_at.desc())
    ).unique().all()
    return transfers


@router.post("/{transfer_id}/complete", response_model=StockTransferOut)
def complete_transfer(
    transfer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
) -> Any:
    """Complete a stock transfer and add inventory to destination store."""
    store_id = _get_store(current_user)
    transfer = db.scalar(
        select(StockTransfer)
        .options(joinedload(StockTransfer.items))
        .where(StockTransfer.id == transfer_id)
    )
    if not transfer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found")
    
    if transfer.destination_store_id != store_id and transfer.source_store_id != store_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this transfer")

    if transfer.status == "COMPLETED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transfer already completed")

    for item in transfer.items:
        orig_batch = db.scalar(select(InventoryBatch).where(InventoryBatch.id == item.batch_id)) if item.batch_id else None
        
        # Verify or create destination product record if needed
        dest_product = db.scalar(select(Product).where(Product.id == item.product_id, Product.store_id == transfer.destination_store_id))
        if not dest_product:
            src_product = db.scalar(select(Product).where(Product.id == item.product_id))
            if src_product:
                dest_product = Product(
                    id=uuid.uuid4(),
                    store_id=transfer.destination_store_id,
                    name=src_product.name,
                    sku=src_product.sku,
                    barcode=src_product.barcode,
                    category=src_product.category,
                    purchase_price=src_product.purchase_price,
                    selling_price=src_product.selling_price,
                    gst_rate=src_product.gst_rate,
                )
                db.add(dest_product)
                db.flush()

        product_id = dest_product.id if dest_product else item.product_id

        new_batch = InventoryBatch(
            product_id=product_id,
            store_id=transfer.destination_store_id,
            batch_number=orig_batch.batch_number if orig_batch else "TRANSFERRED",
            quantity=item.quantity,
            expiry_date=orig_batch.expiry_date if orig_batch else date.today(),
            purchase_price=orig_batch.purchase_price if orig_batch else 0.0,
            received_date=date.today(),
        )
        db.add(new_batch)

    transfer.status = "COMPLETED"
    db.commit()
    db.refresh(transfer)
    return transfer
