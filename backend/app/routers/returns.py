from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/returns", tags=["returns"])

class Return(BaseModel):
    id: str | None = None
    item_id: str
    quantity: int
    reason: str

@router.post("/")
def create_return(return_data: Return):
    return {"status": "success", "data": return_data}

@router.get("/")
def get_returns():
    return {"status": "success", "data": []}
