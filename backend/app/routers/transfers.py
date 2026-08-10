import uuid
from typing import List, Any
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import get_db, get_current_user, require_roles
from ..models.database import User, InventoryBatch, StockTransfer
from ..models.schemas import StockTransferCreate, StockTransferOut

router = APIRouter(prefix="/transfers", tags=["Transfers"])


@router.post("/", response_model=StockTransferOut, status_code=status.HTTP_201_CREATED)
def create_transfer(
    transfer_in: StockTransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
) -> Any:
    """Create a new stock transfer and deduct from the source store."""
    for item in transfer_in.items:
        batch_id = uuid.UUID(item["batch_id"]) if isinstance(item["batch_id"], str) else item["batch_id"]
        batch = db.query(InventoryBatch).filter(InventoryBatch.id == batch_id).first()
        if not batch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Batch {batch_id} not found")
        if batch.store_id != transfer_in.from_store_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Batch {batch_id} not in source store")
        if batch.quantity < item["quantity"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Insufficient stock for batch {batch_id}")
            
        # Deduct quantity immediately since it's in transit
        batch.quantity -= item["quantity"]

    transfer = StockTransfer(
        from_store_id=transfer_in.from_store_id,
        to_store_id=transfer_in.to_store_id,
        status="PENDING",
        items=transfer_in.items
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)
    return transfer


@router.get("/", response_model=List[StockTransferOut])
def get_transfers(
    store_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get all transfers involving the given store (inbound or outbound)."""
    transfers = db.query(StockTransfer).filter(
        (StockTransfer.from_store_id == store_id) | (StockTransfer.to_store_id == store_id)
    ).all()
    return transfers


@router.post("/{transfer_id}/complete", response_model=StockTransferOut)
def complete_transfer(
    transfer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
) -> Any:
    """Complete a stock transfer and add inventory to the destination store."""
    transfer = db.query(StockTransfer).filter(StockTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found")
    if transfer.status == "COMPLETED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transfer already completed")
    
    for item in transfer.items:
        batch_id = uuid.UUID(item["batch_id"]) if isinstance(item["batch_id"], str) else item["batch_id"]
        orig_batch = db.query(InventoryBatch).filter(InventoryBatch.id == batch_id).first()
        
        product_id = orig_batch.product_id if orig_batch else uuid.UUID(item["product_id"]) if "product_id" in item else None
        
        if not product_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot determine product ID for transferred item")

        new_batch = InventoryBatch(
            product_id=product_id,
            store_id=transfer.to_store_id,
            batch_number=orig_batch.batch_number if orig_batch else "TRANSFERRED",
            quantity=item["quantity"],
            expiry_date=orig_batch.expiry_date if orig_batch else date.max,
            purchase_price=orig_batch.purchase_price if orig_batch else 0.0,
            received_date=date.today()
        )
        db.add(new_batch)
        
    transfer.status = "COMPLETED"
    db.commit()
    db.refresh(transfer)
    return transfer
