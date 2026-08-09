"""Store catalogue — real stores a user can see and transfer stock between.

The SaaS is single-tenant-per-store, but an OWNER can own multiple stores
(``stores.owner_id``). This endpoint returns real destinations so the transfers
UI never fabricates branches that don't exist in the database.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select

from ..deps import get_current_user, get_owner_manager, get_db
from ..models.database import Store, User
from ..models.schemas import StoreOut, StoreUpdate

router = APIRouter(prefix="/api/stores", tags=["stores"])


@router.get("")
def list_stores(user: User = Depends(get_current_user), db=Depends(get_db)):
    """Stores visible to this user: their own store plus any store they own."""
    q = select(Store).where(
        or_(Store.id == user.store_id, Store.owner_id == user.id)
    )
    return [
        {
            "id": str(s.id),
            "name": s.name,
            "address": s.address,
            "city": s.city,
            "phone": getattr(s, "phone", None),
            "gst_number": getattr(s, "gst_number", None),
            "store_type": s.store_type,
            "is_active": s.is_active,
        }
        for s in db.scalars(q).all()
    ]


@router.get("/current", response_model=StoreOut)
def get_current_store(user: User = Depends(get_current_user), db=Depends(get_db)):
    if not user.store_id:
        raise HTTPException(400, "User is not assigned to a store")
    store = db.get(Store, user.store_id)
    if not store:
        raise HTTPException(404, "Store not found")
    return store


@router.put("/current", response_model=StoreOut)
def update_current_store(payload: StoreUpdate, user: User = Depends(get_owner_manager), db=Depends(get_db)):
    if not user.store_id:
        raise HTTPException(400, "User is not assigned to a store")
    store = db.get(Store, user.store_id)
    if not store:
        raise HTTPException(404, "Store not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(store, field, val)

    db.commit()
    db.refresh(store)
    return store
