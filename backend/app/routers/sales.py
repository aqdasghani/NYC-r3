"""POS sales with FEFO batch allocation and GST receipts."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from ..deps import get_current_user, get_owner_manager, get_biller_up, get_db
from ..models.database import InventoryBatch, Product, Sale, Invoice, InvoiceItem, User, utcnow
from ..models.schemas import PosSaleRequest, PosSaleResponse, InvoiceOut, InvoiceLineOut, SaleOut, SalesTrendPoint
from ..utils.fefo import allocate, InsufficientStockError
from ..ws import manager, make_event

router = APIRouter(tags=["sales"])


def _store(user: User):
    if not user.store_id:
        raise HTTPException(400, "User is not assigned to a store")
    return user.store_id


@router.post("/api/pos/sale", response_model=PosSaleResponse)
async def create_sale(payload: PosSaleRequest, user: User = Depends(get_biller_up), db=Depends(get_db)):
    store_id = _store(user)
    
    invoice = Invoice(
        invoice_number=f"GM-{datetime.now().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}",
        store_id=store_id,
        cashier_id=user.id,
        customer_id=payload.customer_id,
        subtotal=0,
        total_mrp=0,
        total_discount=0,
        total_gst=0,
        grand_total=0,
        amount_paid=payload.amount_paid or 0,
        change_amount=0,
        payment_method=payload.payment_method
    )
    db.add(invoice)
    db.flush()

    product_ids = []

    try:
        for item in payload.items:
            product = db.scalar(select(Product).where(Product.store_id == store_id, Product.id == item.product_id)) if item.product_id else None
            if product is None and item.barcode:
                product = db.scalar(select(Product).where(Product.store_id == store_id, Product.barcode == item.barcode))
            if not product:
                raise HTTPException(404, "Product not found")
            
            product_ids.append(product.id)
            
            qty = Decimal(str(item.quantity))
            base_price = Decimal(str(product.selling_price or 0))
            gross = base_price * qty
            
            discount_amount = Decimal("0")
            if item.discount_type == "PERCENTAGE" and item.discount_value:
                discount_amount = gross * (Decimal(str(item.discount_value)) / Decimal("100"))
            elif item.discount_type == "FLAT" and item.discount_value:
                discount_amount = Decimal(str(item.discount_value))
            
            taxable = gross - discount_amount
            gst_rate = Decimal(str(product.gst_rate or 0))
            gst_amount = taxable * (gst_rate / Decimal("100"))
            line_total = taxable + gst_amount
            
            inv_item = InvoiceItem(
                invoice_id=invoice.id,
                product_id=product.id,
                product_name_snapshot=product.name,
                sku_snapshot=product.sku,
                barcode_snapshot=product.barcode,
                quantity=item.quantity,
                unit="Piece",
                mrp=float(base_price),
                selling_price=float(base_price),
                discount_type=item.discount_type,
                discount_value=float(item.discount_value) if item.discount_value else None,
                discount_amount=float(discount_amount),
                taxable_amount=float(taxable),
                gst_rate=float(gst_rate),
                gst_amount=float(gst_amount),
                total_amount=float(line_total)
            )
            db.add(inv_item)
            
            invoice.subtotal += float(taxable)
            invoice.total_mrp += float(gross)
            invoice.total_discount += float(discount_amount)
            invoice.total_gst += float(gst_amount)
            
            batches = db.scalars(select(InventoryBatch).where(InventoryBatch.product_id == product.id, InventoryBatch.store_id == store_id)).all()
            try:
                allocations = allocate(batches, item.quantity)
            except InsufficientStockError as exc:
                raise HTTPException(409, str(exc))
            
            for batch, alloc_qty in allocations:
                batch.quantity -= alloc_qty
                batch.last_sale_date = date.today()
                
                sale_record = Sale(
                    store_id=store_id,
                    invoice_id=invoice.id,
                    product_id=product.id,
                    batch_id=batch.id,
                    quantity_sold=alloc_qty,
                    sale_price=float(taxable / qty),
                    gst_amount=float(gst_amount * (Decimal(str(alloc_qty)) / qty)),
                    customer_id=payload.customer_id,
                    pos_session_id=payload.pos_session_id
                )
                db.add(sale_record)
                
        if payload.cart_discount_type and payload.cart_discount_value:
            cart_discount = Decimal("0")
            if payload.cart_discount_type == "PERCENTAGE":
                cart_discount = Decimal(str(invoice.subtotal)) * (Decimal(str(payload.cart_discount_value)) / Decimal("100"))
            elif payload.cart_discount_type == "FLAT":
                cart_discount = Decimal(str(payload.cart_discount_value))
            
            invoice.total_discount += float(cart_discount)
            invoice.subtotal -= float(cart_discount)
            
        invoice.grand_total = float(Decimal(str(invoice.subtotal)) + Decimal(str(invoice.total_gst)))
        invoice.change_amount = max(0.0, float(Decimal(str(invoice.amount_paid)) - Decimal(str(invoice.grand_total))))
        
        db.commit()
        db.refresh(invoice)
            
    except HTTPException:
        db.rollback()
        raise

    db_lines = db.scalars(select(InvoiceItem).where(InvoiceItem.invoice_id == invoice.id)).all()
    out_lines = [InvoiceLineOut.model_validate(l) for l in db_lines]
    
    invoice_out = InvoiceOut.model_validate(invoice)
    invoice_out.items = out_lines

    await manager.broadcast(str(store_id), make_event("sale_recorded", {"grand_total": invoice.grand_total, "items_count": len(out_lines)}))
    await manager.broadcast(str(store_id), make_event("inventory_updated", {"product_ids": [str(p) for p in product_ids]}))
    
    return PosSaleResponse(invoice=invoice_out)


@router.get("/api/sales/transactions", response_model=list[SaleOut])
def transactions(limit: int = 100, user: User = Depends(get_biller_up), db=Depends(get_db)):
    return db.scalars(select(Sale).where(Sale.store_id == _store(user)).order_by(Sale.sale_date.desc()).limit(limit)).all()


@router.get("/api/sales/trend", response_model=list[SalesTrendPoint])
def trend(days: int = 30, user: User = Depends(get_biller_up), db=Depends(get_db)):
    store = _store(user); start = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days - 1)
    rows = db.scalars(select(Sale).where(Sale.store_id == store, Sale.sale_date >= start)).all()
    result = {}
    for i in range(days): result[(start.date() + timedelta(days=i))] = [0.0, 0]
    for row in rows:
        result.setdefault(row.sale_date.date(), [0.0, 0]); result[row.sale_date.date()][0] += float(row.sale_price or 0) * row.quantity_sold; result[row.sale_date.date()][1] += row.quantity_sold
    return [SalesTrendPoint(date=d, revenue=round(v[0], 2), units=v[1]) for d, v in sorted(result.items())]
