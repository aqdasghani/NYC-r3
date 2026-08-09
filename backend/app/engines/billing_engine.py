"""Atomic POS transaction engine.

Every sale is one database transaction: validate cart -> FEFO-deduct batches ->
write Invoice/InvoiceItem -> write one ``Sale`` row per line (so analytics sees
live revenue) -> write a SALE ``InventoryTransaction`` per batch deduction.
The caller commits once; any failure rolls the whole sale back.
"""
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..engines.money import (
    PAISE_PER_RUPEE,
    to_paise,
    from_paise,
    mul_qty_price,
    add_paise,
    sub_paise,
    calculate_gst,
    calculate_discount,
    calculate_taxable_and_gst,
    safe_div,
    DivisionByZero,
)
from ..models.database import (
    InventoryBatch,
    InventoryTransaction,
    Invoice,
    InvoiceItem,
    Product,
    Sale,
)
from ..models.schemas_sales import PosItemRequest, PosSaleRequest, Receipt, ReceiptLine


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _resolve_product(db: Session, store_id: uuid.UUID, item: PosItemRequest) -> Product:
    if item.product_id:
        product = db.get(Product, item.product_id)
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found")
        if product.store_id != store_id:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} not in this store")
        return product

    barcode = (item.barcode or "").strip()
    product = db.scalar(
        select(Product).where(Product.store_id == store_id, Product.barcode == barcode)
    )
    if not product:
        raise HTTPException(status_code=404, detail=f"Product not registered for barcode {barcode}")
    return product


def process_sale(db: Session, store_id: uuid.UUID, cashier_id: uuid.UUID, payload: PosSaleRequest) -> Receipt:
    """Atomic POS transaction with FEFO batch deduction and full sale persistence."""
    now = _utcnow()
    invoice_number = f"INV-{uuid.uuid4().hex[:8].upper()}"

    invoice = Invoice(
        invoice_number=invoice_number,
        store_id=store_id,
        cashier_id=cashier_id,
        pos_session_id=payload.pos_session_id,
        customer_id=payload.customer_id,
        payment_method=payload.payment_method,
        amount_paid=to_paise(payload.amount_paid),
        created_at=now,
    )
    db.add(invoice)
    db.flush()  # get invoice.id

    receipt_lines: list[ReceiptLine] = []
    subtotal = 0
    total_gst = 0
    total_discount = 0

    for item in payload.items:
        product = _resolve_product(db, store_id, item)
        if item.unit_price is not None:
            unit_price_paise = item.unit_price
        else:
            unit_price_paise = to_paise(product.selling_price or 0)
        if unit_price_paise < 0:
            raise HTTPException(status_code=400, detail=f"Invalid price for {product.name}")
        if item.discount_amount > mul_qty_price(item.quantity, unit_price_paise):
            raise HTTPException(
                status_code=400, detail=f"Discount exceeds line total for {product.name}"
            )

        remaining_qty = item.quantity

        # FEFO: earliest expiry first (fefo_priority desc, then expiry asc).
        batches = db.scalars(
            select(InventoryBatch)
            .where(
                InventoryBatch.product_id == product.id,
                InventoryBatch.store_id == store_id,
                InventoryBatch.quantity > 0,
            )
            .order_by(InventoryBatch.fefo_priority.desc(), InventoryBatch.expiry_date.asc())
        ).all()

        total_available = sum(b.quantity for b in batches)
        if total_available < remaining_qty:
            raise HTTPException(
                status_code=409,
                detail=f"Not enough stock for {product.name}. Requested {remaining_qty}, available {total_available}",
            )

        gst_rate = float(product.gst_rate or 0)
        discount_allocated = 0

        for batch in batches:
            if remaining_qty <= 0:
                break

            qty_from_batch = min(remaining_qty, batch.quantity)
            batch.quantity -= qty_from_batch
            batch.last_sale_date = now.date()
            remaining_qty -= qty_from_batch

            # Discount is a per-line total; allocate it once across the line
            # (a line split across batches must not over-discount).
            line_gross = mul_qty_price(qty_from_batch, unit_price_paise)
            line_discount = min(item.discount_amount - discount_allocated, line_gross)
            discount_allocated += line_discount

            taxable_paise = sub_paise(line_gross, line_discount)
            gst_paise = calculate_gst(taxable_paise, gst_rate)
            line_total_paise = add_paise(taxable_paise, gst_paise)

            tx = InventoryTransaction(
                store_id=store_id,
                product_id=product.id,
                batch_id=batch.id,
                invoice_id=invoice.id,
                tx_type="SALE",
                quantity=-qty_from_batch,
                note="POS Sale",
                performed_by=cashier_id,
            )
            db.add(tx)

            inv_item = InvoiceItem(
                invoice_id=invoice.id,
                product_id=product.id,
                batch_id=batch.id,
                quantity=qty_from_batch,
                unit_price=unit_price_paise,
                discount_amount=line_discount,
                taxable_amount=taxable_paise,
                gst_rate=gst_rate,
                gst_amount=gst_paise,
                line_total=line_total_paise,
            )
            db.add(inv_item)

            sale = Sale(
                store_id=store_id,
                product_id=product.id,
                batch_id=batch.id,
                quantity_sold=qty_from_batch,
                sale_price=unit_price_paise,
                gst_amount=gst_paise,
                customer_id=payload.customer_id,
                sale_date=now,
                pos_session_id=payload.pos_session_id,
            )
            db.add(sale)

            subtotal = add_paise(subtotal, line_gross)
            total_discount = add_paise(total_discount, line_discount)
            total_gst = add_paise(total_gst, gst_paise)

            receipt_lines.append(
                ReceiptLine(
                    product_id=product.id,
                    name=product.name,
                    unit=getattr(product, "unit", "pkt") or "pkt",
                    batch_id=batch.id,
                    batch_number=batch.batch_number,
                    qty=qty_from_batch,
                    unit_price=unit_price_paise,
                    gst_rate=gst_rate,
                    gst_amount=gst_paise,
                    line_total=line_total_paise,
                )
            )

    invoice.subtotal = subtotal
    invoice.total_discount = total_discount
    invoice.total_gst = total_gst
    invoice.grand_total = add_paise(sub_paise(subtotal, total_discount), total_gst)
    invoice.change_due = max(0, invoice.amount_paid - invoice.grand_total)

    return Receipt(
        receipt_no=invoice.invoice_number,
        store_id=store_id,
        timestamp=now,
        lines=receipt_lines,
        subtotal=subtotal,
        gst_total=total_gst,
        discount_total=total_discount,
        grand_total=invoice.grand_total,
    )