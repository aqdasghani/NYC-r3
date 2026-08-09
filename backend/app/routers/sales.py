"""POS sales with FEFO batch allocation and GST receipts."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from ..deps import get_current_user, get_owner_manager, get_db
from ..models.database import InventoryBatch, Product, Sale, User, utcnow
from ..models.schemas import PosSaleRequest, PosSaleResponse, Receipt, ReceiptLine, SaleOut, SalesTrendPoint
from ..utils.fefo import allocate, InsufficientStockError
from ..ws import manager, make_event

router = APIRouter(tags=["sales"])


def _store(user: User):
    if not user.store_id:
        raise HTTPException(400, "User is not assigned to a store")
    return user.store_id


@router.post("/api/pos/sale", response_model=PosSaleResponse)
async def create_sale(payload: PosSaleRequest, user: User = Depends(get_current_user), db=Depends(get_db)):
    store_id = _store(user)
    lines, subtotal, gst_total, product_ids = [], Decimal("0"), Decimal("0"), []
    try:
        for item in payload.items:
            product = db.scalar(select(Product).where(Product.store_id == store_id, Product.id == item.product_id)) if item.product_id else None
            if product is None and item.barcode:
                product = db.scalar(select(Product).where(Product.store_id == store_id, Product.barcode == item.barcode))
            if not product:
                raise HTTPException(404, "Product not found")
            batches = db.scalars(select(InventoryBatch).where(InventoryBatch.product_id == product.id, InventoryBatch.store_id == store_id)).all()
            try:
                allocations = allocate(batches, item.quantity)
            except InsufficientStockError as exc:
                raise HTTPException(409, str(exc))
            product_ids.append(product.id)
            unit_price = Decimal(str(product.selling_price or 0)); rate = Decimal(str(product.gst_rate or 0))
            for batch, qty in allocations:
                batch.quantity -= qty; batch.last_sale_date = date.today()
                sale_sub = unit_price * qty; sale_gst = sale_sub * rate / Decimal("100")
                sale = Sale(store_id=store_id, product_id=product.id, batch_id=batch.id, quantity_sold=qty, sale_price=unit_price, gst_amount=sale_gst, customer_id=payload.customer_id, pos_session_id=payload.pos_session_id)
                db.add(sale)
                lines.append(ReceiptLine(product_id=product.id, name=product.name, batch_id=batch.id, batch_number=batch.batch_number, qty=qty, unit_price=float(unit_price), gst_rate=float(rate), gst_amount=round(float(sale_gst), 2), line_total=round(float(sale_sub), 2)))
                subtotal += sale_sub; gst_total += sale_gst
        db.commit()
    except HTTPException:
        db.rollback(); raise
    receipt = Receipt(receipt_no=f"GS-{datetime.now().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}", store_id=store_id, lines=lines, subtotal=round(float(subtotal), 2), gst_total=round(float(gst_total), 2), grand_total=round(float(subtotal + gst_total), 2), timestamp=utcnow())
    await manager.broadcast(str(store_id), make_event("sale_recorded", {"grand_total": receipt.grand_total, "items_count": len(lines)}))
    await manager.broadcast(str(store_id), make_event("inventory_updated", {"product_ids": [str(p) for p in product_ids]}))
    return PosSaleResponse(receipt=receipt)


@router.get("/api/sales/transactions", response_model=list[SaleOut])
def transactions(limit: int = 100, user: User = Depends(get_owner_manager), db=Depends(get_db)):
    return db.scalars(select(Sale).where(Sale.store_id == _store(user)).order_by(Sale.sale_date.desc()).limit(limit)).all()


@router.get("/api/sales/trend", response_model=list[SalesTrendPoint])
def trend(days: int = 30, user: User = Depends(get_owner_manager), db=Depends(get_db)):
    store = _store(user); start = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days - 1)
    rows = db.scalars(select(Sale).where(Sale.store_id == store, Sale.sale_date >= start)).all()
    result = {}
    for i in range(days): result[(start.date() + timedelta(days=i))] = [0.0, 0]
    for row in rows:
        result.setdefault(row.sale_date.date(), [0.0, 0]); result[row.sale_date.date()][0] += float(row.sale_price or 0) * row.quantity_sold; result[row.sale_date.date()][1] += row.quantity_sold
    return [SalesTrendPoint(date=d, revenue=round(v[0], 2), units=v[1]) for d, v in sorted(result.items())]
