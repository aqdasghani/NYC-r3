import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db
from ..models.database import User
from ..models.schemas_sales import PosSaleRequest, PosSaleResponse
from ..engines.billing_engine import process_sale
from ..ws import manager, make_event

router = APIRouter(tags=["Sales"])

def _store(user: User) -> uuid.UUID:
    """Resolve the user's store. A null store_id is an isolation error, not a
    signal to fall back to the first store in the database."""
    if user.store_id:
        return user.store_id
    raise HTTPException(status_code=403, detail="User is not assigned to a store")

@router.post("/api/pos/sale", response_model=PosSaleResponse)
async def create_sale(payload: PosSaleRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Atomic POS Sale with FEFO inventory deduction."""
    try:
        store_id = _store(user)
        receipt = process_sale(db, store_id, user.id, payload)
        db.commit()
        items_count = sum(i.quantity for i in payload.items)
        await manager.broadcast(str(store_id), make_event("sale_recorded", {"items_count": items_count, "grand_total": receipt.grand_total, "receipt_no": receipt.receipt_no}))
        await manager.broadcast(str(store_id), make_event("inventory_updated", {"items_count": items_count}))
        return PosSaleResponse(receipt=receipt)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
