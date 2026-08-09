"""Product catalogue, batches, expiry intelligence and stock views."""
from __future__ import annotations

import math
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select

from ..deps import get_current_user, get_db, get_owner, get_owner_manager
from ..engines.expiry_engine import classify_batch, expiry_timeline, get_at_risk_batches, stock_health
from ..engines.forecast_engine import calculate_velocity, days_of_supply, reorder_quantity, stockout_eta
from ..models.database import (
    InventoryBatch,
    InventoryTransaction,
    Product,
    PurchaseOrderItem,
    Return,
    Sale,
    StockTransfer,
    Supplier,
    User,
)
from ..models.schemas import (
    AtRiskItem, BatchCreate, BatchOut, DeadStockItem, ExpiryTimelineBucket, MessageOut,
    Page, ProductCreate, ProductDetailOut, ProductOut, ProductUpdate, ReorderSuggestion, StockHealthSegment,
    TransactionOut,
)
from ..integrations.barcode_service import lookup_barcode

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


def _store(user: User):
    if user.store_id is None:
        raise HTTPException(400, "User is not assigned to a store")
    return user.store_id


def _batch_out(batch: InventoryBatch) -> BatchOut:
    values = classify_batch(batch)
    return BatchOut.model_validate({**batch.__dict__, **values})


@router.get("/products", response_model=Page)
def list_products(page: int = 1, page_size: int = Query(50, le=200), search: str | None = None, category: str | None = None,
                  user: User = Depends(get_current_user), db=Depends(get_db)):
    store_id = _store(user)
    q = select(Product).where(Product.store_id == store_id)
    if search:
        q = q.where(or_(Product.name.ilike(f"%{search}%"), Product.sku.ilike(f"%{search}%"), Product.barcode.ilike(f"%{search}%")))
    if category:
        q = q.where(Product.category == category)
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    rows = db.scalars(q.offset((page - 1) * page_size).limit(page_size)).all()
    return Page(items=[ProductOut.model_validate(row) for row in rows], total=total, page=page, page_size=page_size)


@router.post("/products", response_model=ProductOut)
def create_product(payload: ProductCreate, user: User = Depends(get_owner_manager), db=Depends(get_db)):
    product = Product(store_id=_store(user), **payload.model_dump())
    db.add(product); db.commit(); db.refresh(product)
    return product


@router.get("/products/{product_id}", response_model=ProductDetailOut)
def get_product(product_id: uuid.UUID, user: User = Depends(get_current_user), db=Depends(get_db)):
    product = db.scalar(select(Product).where(Product.id == product_id, Product.store_id == _store(user)))
    if not product: raise HTTPException(404, "Product not found")
    batches = db.scalars(select(InventoryBatch).where(InventoryBatch.product_id == product.id, InventoryBatch.store_id == _store(user))).all()
    result = ProductOut.model_validate(product).model_dump()
    result.update(total_stock=sum(b.quantity for b in batches), batches=[_batch_out(b) for b in batches])
    return ProductDetailOut.model_validate(result)


@router.get("/barcode/{code}", response_model=ProductOut)
def get_product_by_barcode(code: str, user: User = Depends(get_current_user), db=Depends(get_db)):
    store_id = _store(user)
    result = lookup_barcode(db, store_id, code)
    if not result:
        raise HTTPException(404, f"No product found for barcode {code}")
    
    product_model = ProductOut.model_validate(result["product"])
    product_model.is_new = result["is_new"]
    return product_model


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: uuid.UUID, payload: ProductUpdate, user: User = Depends(get_owner_manager), db=Depends(get_db)):
    product = db.scalar(select(Product).where(Product.id == product_id, Product.store_id == _store(user)))
    if not product: raise HTTPException(404, "Product not found")
    for key, value in payload.model_dump(exclude_unset=True).items(): setattr(product, key, value)
    db.commit(); db.refresh(product); return product


@router.delete("/products/{product_id}", response_model=MessageOut)
def delete_product(product_id: uuid.UUID, user: User = Depends(get_owner), db=Depends(get_db)):
    product = db.scalar(select(Product).where(Product.id == product_id, Product.store_id == _store(user)))
    if not product: raise HTTPException(404, "Product not found")
    # SQLite doesn't enforce foreign keys here, so a bare delete would orphan
    # batches/sales/ledger rows and silently corrupt stock history. Refuse while
    # dependent records exist — the caller must clear them (or the data stays).
    dependents = {
        "batches": db.scalar(select(func.count()).select_from(InventoryBatch).where(InventoryBatch.product_id == product.id)) or 0,
        "sales": db.scalar(select(func.count()).select_from(Sale).where(Sale.product_id == product.id)) or 0,
        "transactions": db.scalar(select(func.count()).select_from(InventoryTransaction).where(InventoryTransaction.product_id == product.id)) or 0,
        "purchase order lines": db.scalar(select(func.count()).select_from(PurchaseOrderItem).where(PurchaseOrderItem.product_id == product.id)) or 0,
        "transfers": db.scalar(select(func.count()).select_from(StockTransfer).where(StockTransfer.product_id == product.id)) or 0,
        "returns": db.scalar(select(func.count()).select_from(Return).where(Return.product_id == product.id)) or 0,
    }
    active = {k: v for k, v in dependents.items() if v}
    if active:
        detail = ", ".join(f"{v} {k}" for k, v in active.items())
        raise HTTPException(409, f"Cannot delete product: it has {detail}. Clear these records first.")
    db.delete(product); db.commit(); return MessageOut(message="Product deleted")


@router.get("/batches", response_model=list[BatchOut])
def list_batches(severity: str | None = None, expiring: bool = False, user: User = Depends(get_current_user), db=Depends(get_db)):
    rows = db.scalars(select(InventoryBatch).where(InventoryBatch.store_id == _store(user)).order_by(InventoryBatch.expiry_date)).all()
    if expiring: rows = [b for b in rows if (b.expiry_date - date.today()).days <= 15]
    result = [_batch_out(b) for b in rows]
    return [b for b in result if severity is None or b.severity == severity]


@router.post("/batches", response_model=BatchOut)
def create_batch(payload: BatchCreate, user: User = Depends(get_owner_manager), db=Depends(get_db)):
    store_id = _store(user)
    product = db.scalar(select(Product).where(Product.id == payload.product_id, Product.store_id == store_id))
    if not product: raise HTTPException(404, "Product not found")
    values = payload.model_dump(); values["store_id"] = store_id
    batch = InventoryBatch(**values); db.add(batch); db.commit(); db.refresh(batch); return _batch_out(batch)


@router.get("/at-risk", response_model=list[AtRiskItem])
def at_risk(tier: str | None = None, user: User = Depends(get_current_user), db=Depends(get_db)):
    rows = get_at_risk_batches(db, _store(user))
    output = []
    for batch in rows:
        severity = classify_batch(batch)["severity"]
        if tier and severity != tier: continue
        product = db.get(Product, batch.product_id)
        if product is None:
            continue  # orphaned batch (product deleted) — nothing actionable to report
        velocity = calculate_velocity(db, batch.store_id, batch.product_id)
        output.append(AtRiskItem(batch_id=batch.id, product_id=batch.product_id, product_name=product.name,
                                 batch_number=batch.batch_number, quantity=batch.quantity, expiry_date=batch.expiry_date,
                                 days_remaining=(batch.expiry_date - date.today()).days, severity=severity,
                                 value_at_risk=float(batch.quantity * (batch.purchase_price or 0)),
                                 expected_leftover=max(0, batch.quantity - velocity * max(0, (batch.expiry_date-date.today()).days)), velocity=velocity))
    return output


@router.get("/expiry-timeline", response_model=list[ExpiryTimelineBucket])
def timeline(user: User = Depends(get_current_user), db=Depends(get_db)): return expiry_timeline(db, _store(user))


@router.get("/stock-health", response_model=list[StockHealthSegment])
def health(user: User = Depends(get_current_user), db=Depends(get_db)): return stock_health(db, _store(user))


@router.get("/dead-stock", response_model=list[DeadStockItem])
def dead_stock(user: User = Depends(get_owner_manager), db=Depends(get_db)):
    rows = db.scalars(select(InventoryBatch).where(InventoryBatch.store_id == _store(user), InventoryBatch.quantity > 0)).all()
    result=[]
    for b in rows:
        days_idle=(date.today()-(b.last_sale_date or b.received_date)).days
        if days_idle > 60:
            p=db.get(Product,b.product_id)
            if p is None:
                continue  # orphaned batch (product deleted) — nothing to report on
            result.append(DeadStockItem(batch_id=b.id,product_id=p.id,product_name=p.name,batch_number=b.batch_number,quantity=b.quantity,days_idle=days_idle,value_locked=float(b.quantity*(b.purchase_price or 0))))
    return result


@router.get("/reorder-suggestions", response_model=list[ReorderSuggestion])
def reorder_suggestions(user: User = Depends(get_owner_manager), db=Depends(get_db)):
    store_id=_store(user); products=db.scalars(select(Product).where(Product.store_id==store_id)).all(); result=[]
    for p in products:
        batches=db.scalars(select(InventoryBatch).where(InventoryBatch.product_id==p.id,InventoryBatch.quantity>0)).all(); qty=sum(b.quantity for b in batches); velocity=calculate_velocity(db,store_id,p.id); eta=stockout_eta(qty,velocity)
        if eta <= max(7,p.lead_time_days+2) or qty == 0:
            suggested_qty = reorder_quantity(qty, velocity, p.lead_time_days)
            if suggested_qty <= 0:
                continue  # no demand history → nothing worth ordering
            result.append(ReorderSuggestion(product_id=p.id,name=p.name,current_qty=qty,velocity=velocity,lead_time_days=p.lead_time_days,suggested_qty=suggested_qty,stockout_eta=eta if math.isfinite(eta) else None))
    return result


@router.get("/transactions", response_model=list[TransactionOut])
def list_transactions(tx_type: str | None = None, product_id: uuid.UUID | None = None,
                       limit: int = Query(100, le=500), offset: int = 0,
                       user: User = Depends(get_current_user), db=Depends(get_db)):
    """Auditable inventory ledger — every stock movement, newest first."""
    store_id = _store(user)
    q = select(InventoryTransaction).where(InventoryTransaction.store_id == store_id)
    if tx_type:
        q = q.where(InventoryTransaction.tx_type == tx_type)
    if product_id:
        q = q.where(InventoryTransaction.product_id == product_id)
    q = q.order_by(InventoryTransaction.created_at.desc()).limit(limit).offset(offset)
    rows = db.scalars(q).all()
    out = []
    for t in rows:
        product = db.get(Product, t.product_id)
        out.append(TransactionOut(
            id=t.id, product_id=t.product_id, product_name=product.name if product else None,
            batch_id=t.batch_id, tx_type=t.tx_type, quantity=t.quantity, note=t.note,
            performed_by=t.performed_by, created_at=t.created_at,
        ))
    return out
