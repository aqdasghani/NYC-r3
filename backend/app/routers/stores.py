from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db
from ..models.database import Store, User
from ..models.schemas import StoreOut

router = APIRouter(prefix="/api/stores", tags=["stores"])


@router.get("", response_model=List[StoreOut])
@router.get("/", response_model=List[StoreOut])
def list_stores(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[StoreOut]:
    """Get active stores list for inter-store operations."""
    stores = db.scalars(select(Store).where(Store.is_active == True)).all()
    return stores


@router.get("/{store_id}", response_model=StoreOut)
def get_store(
    store_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> StoreOut:
    """Get store details by ID."""
    store = db.scalar(select(Store).where(Store.id == store_id))
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
    return store
