import uuid
from typing import List, Any
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import get_db, get_current_user, require_roles
from ..models.database import User, InventoryBatch, PurchaseOrder
from ..models.schemas import PurchaseOrderCreate, PurchaseOrderOut

router = APIRouter(prefix="/procurement", tags=["Procurement"])


@router.post("/", response_model=PurchaseOrderOut, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    po_in: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
) -> Any:
    """Create a new purchase order."""
    po = PurchaseOrder(
        store_id=po_in.store_id,
        supplier_id=po_in.supplier_id,
        status="PENDING",
        expected_date=po_in.expected_date,
        items=po_in.items
    )
    db.add(po)
    db.commit()
    db.refresh(po)
    return po


@router.get("/", response_model=List[PurchaseOrderOut])
def get_purchase_orders(
    store_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get all purchase orders for a store."""
    pos = db.query(PurchaseOrder).filter(PurchaseOrder.store_id == store_id).all()
    return pos


@router.post("/{po_id}/receive", response_model=PurchaseOrderOut)
def receive_purchase_order(
    po_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
) -> Any:
    """Mark a purchase order as received and update inventory."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase Order not found")
    if po.status == "RECEIVED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Purchase Order already received")
    
    # Assuming items is a list of dicts with product_id, quantity, etc.
    for item in po.items:
        batch = InventoryBatch(
            product_id=uuid.UUID(item["product_id"]) if isinstance(item["product_id"], str) else item["product_id"],
            store_id=po.store_id,
            batch_number=item.get("batch_number"),
            quantity=item["quantity"],
            expiry_date=date.fromisoformat(item["expiry_date"]) if item.get("expiry_date") else date.max,
            purchase_price=item.get("purchase_price"),
            received_date=date.today()
        )
        db.add(batch)
        
    po.status = "RECEIVED"
    db.commit()
    db.refresh(po)
    return po
