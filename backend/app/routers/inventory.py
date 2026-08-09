"""Product catalogue, batches, expiry intelligence and stock views."""
from __future__ import annotations

import math
import uuid
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select

from ..deps import get_current_user, get_db, get_owner, get_owner_manager, get_manager_up, get_worker_up
from ..engines.expiry_engine import classify_batch, expiry_timeline, get_at_risk_batches, stock_health
from ..engines.forecast_engine import calculate_velocity, days_of_supply, reorder_quantity, stockout_eta
from ..models.database import InventoryBatch, Product, Sale, Supplier, User
from ..models.schemas import (
    AtRiskItem, BatchCreate, BatchOut, DeadStockItem, ExpiryTimelineBucket, MessageOut,
    Page, ProductCreate, ProductDetailOut, ProductOut, ProductUpdate, ReorderSuggestion, StockHealthSegment,
)
from ..integrations.barcode_service import lookup_barcode
from ..engines.inventory_engine import stock_intelligence, slow_movers as _slow_movers, fast_movers as _fast_movers

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
def create_product(payload: ProductCreate, user: User = Depends(get_manager_up), db=Depends(get_db)):
    product = Product(store_id=_store(user), **payload.model_dump())
    db.add(product); db.commit(); db.refresh(product)
    return product


@router.get("/products/{product_id}", response_model=ProductDetailOut)
def get_product(product_id: uuid.UUID, user: User = Depends(get_current_user), db=Depends(get_db)):
    product = db.scalar(select(Product).where(Product.id == product_id, Product.store_id == _store(user)))
    if not product: raise HTTPException(404, "Product not found")
    batches = db.scalars(select(InventoryBatch).where(InventoryBatch.product_id == product.id)).all()
    result = ProductOut.model_validate(product).model_dump()
    result.update(total_stock=sum(b.quantity for b in batches), batches=[_batch_out(b) for b in batches])
    return ProductDetailOut.model_validate(result)


@router.get("/products/{product_id}/demand")
def product_demand(product_id: uuid.UUID, days: int = 30, user: User = Depends(get_current_user), db=Depends(get_db)):
    """Demand analytics for one product: totals, velocity, daily/hourly/weekday
    patterns — all computed from the last ``days`` of Sale records."""
    from collections import defaultdict
    from datetime import time as dtime

    store_id = _store(user)
    if not db.scalar(select(Product).where(Product.id == product_id, Product.store_id == store_id)):
        raise HTTPException(404, "Product not found")

    since = date.today() - timedelta(days=days - 1)
    start = datetime.combine(since, dtime.min)
    rows = db.scalars(
        select(Sale).where(
            Sale.store_id == store_id,
            Sale.product_id == product_id,
            Sale.sale_date >= start,
        )
    ).all()

    daily: dict[date, int] = defaultdict(int)
    hourly: dict[int, int] = defaultdict(int)
    dow: dict[int, int] = defaultdict(int)
    dow_days: dict[int, set[date]] = defaultdict(set)
    total_units = 0
    total_revenue = 0.0
    for sale in rows:
        total_units += int(sale.quantity_sold or 0)
        total_revenue += float(sale.sale_price or 0) * int(sale.quantity_sold or 0)
        d = sale.sale_date.date()
        daily[d] += int(sale.quantity_sold or 0)
        hourly[sale.sale_date.hour] += int(sale.quantity_sold or 0)
        dow[d.weekday()] += int(sale.quantity_sold or 0)
        dow_days[d.weekday()].add(d)

    days_count = max(1, (date.today() - since).days + 1)
    dow_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    daily_series = [
        {"date": (since + timedelta(days=i)).isoformat(), "units": daily.get(since + timedelta(days=i), 0)}
        for i in range(days)
    ]
    hourly_pattern = [
        {"hour": h, "units": round(hourly.get(h, 0) / days_count, 1)} for h in range(6, 23)
    ]
    dow_pattern = [
        {"day": dow_names[w], "units": round(dow.get(w, 0) / max(1, len(dow_days.get(w, []))), 1)}
        for w in range(7)
    ]

    return {
        "total_revenue_30d": round(total_revenue, 2),
        "total_units_30d": total_units,
        "velocity_per_day": round(total_units / days_count, 2),
        "daily_series": daily_series,
        "hourly_pattern": hourly_pattern,
        "dow_pattern": dow_pattern,
    }


@router.get("/barcode/{code}", response_model=ProductOut)
def get_product_by_barcode(code: str, user: User = Depends(get_current_user), db=Depends(get_db)):
    store_id = _store(user)
    product = lookup_barcode(db, store_id, code)
    if not product: raise HTTPException(404, f"No product found for barcode {code}")
    return product


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: uuid.UUID, payload: ProductUpdate, user: User = Depends(get_manager_up), db=Depends(get_db)):
    product = db.scalar(select(Product).where(Product.id == product_id, Product.store_id == _store(user)))
    if not product: raise HTTPException(404, "Product not found")
    for key, value in payload.model_dump(exclude_unset=True).items(): setattr(product, key, value)
    db.commit(); db.refresh(product); return product


@router.delete("/products/{product_id}", response_model=MessageOut)
def delete_product(product_id: uuid.UUID, user: User = Depends(get_owner), db=Depends(get_db)):
    product = db.scalar(select(Product).where(Product.id == product_id, Product.store_id == _store(user)))
    if not product: raise HTTPException(404, "Product not found")
    db.delete(product); db.commit(); return MessageOut(message="Product deleted")


@router.get("/batches", response_model=list[BatchOut])
def list_batches(severity: str | None = None, expiring: bool = False, user: User = Depends(get_current_user), db=Depends(get_db)):
    rows = db.scalars(select(InventoryBatch).where(InventoryBatch.store_id == _store(user)).order_by(InventoryBatch.expiry_date)).all()
    if expiring: rows = [b for b in rows if (b.expiry_date - date.today()).days <= 15]
    result = [_batch_out(b) for b in rows]
    return [b for b in result if severity is None or b.severity == severity]


@router.post("/batches", response_model=BatchOut)
def create_batch(payload: BatchCreate, user: User = Depends(get_worker_up), db=Depends(get_db)):
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
            p=db.get(Product,b.product_id); result.append(DeadStockItem(batch_id=b.id,product_id=p.id,product_name=p.name,batch_number=b.batch_number,quantity=b.quantity,days_idle=days_idle,value_locked=float(b.quantity*(b.purchase_price or 0))))
    return result


@router.get("/reorder-suggestions", response_model=list[ReorderSuggestion])
def reorder_suggestions(user: User = Depends(get_owner_manager), db=Depends(get_db)):
    store_id=_store(user); products=db.scalars(select(Product).where(Product.store_id==store_id)).all(); result=[]
    for p in products:
        batches=db.scalars(select(InventoryBatch).where(InventoryBatch.product_id==p.id,InventoryBatch.quantity>0)).all(); qty=sum(b.quantity for b in batches); velocity=calculate_velocity(db,store_id,p.id); eta=stockout_eta(qty,velocity)
        if eta <= max(7,p.lead_time_days+2) or qty == 0:
            result.append(ReorderSuggestion(product_id=p.id,name=p.name,current_qty=qty,velocity=velocity,lead_time_days=p.lead_time_days,suggested_qty=reorder_quantity(qty,velocity,p.lead_time_days),stockout_eta=eta if math.isfinite(eta) else None))
    return result

@router.get("/intelligence")
def inventory_intelligence(user: User = Depends(get_current_user), db=Depends(get_db)):
    return stock_intelligence(db, _store(user))

@router.get("/slow-movers")
def get_slow_movers(user: User = Depends(get_owner_manager), db=Depends(get_db)):
    return _slow_movers(db, _store(user))

@router.get("/fast-movers")
def get_fast_movers(user: User = Depends(get_current_user), db=Depends(get_db)):
    return _fast_movers(db, _store(user))
