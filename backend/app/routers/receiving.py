"""Smart receiving: invoice OCR preview then explicit user confirmation."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select

from ..deps import get_db, get_owner_manager
from ..engines.detection_engine import run_detection
from ..integrations.ocr_service import extract_invoice_text, parse_invoice
from ..models.database import InventoryBatch, Product, User
from ..models.schemas import ConfirmReceiptRequest, ConfirmReceiptResponse, DetectionRunSummary, ExtractedItem, ScanInvoiceResponse
from ..ws import manager, make_event

router = APIRouter(prefix="/api/receiving", tags=["receiving"])

@router.post("/scan-invoice", response_model=ScanInvoiceResponse)
async def scan_invoice(file: UploadFile = File(...), user: User = Depends(get_owner_manager), db=Depends(get_db)):
    if not user.store_id: raise HTTPException(400, "User is not assigned to a store")
    data = await file.read()
    ocr = extract_invoice_text(data)
    products = db.scalars(select(Product).where(Product.store_id == user.store_id)).all()
    parsed = parse_invoice(ocr.raw_text, products)
    return ScanInvoiceResponse(source=ocr.source, raw_text=ocr.raw_text, extracted_items=[ExtractedItem.model_validate(item) for item in parsed])

@router.post("/confirm", response_model=ConfirmReceiptResponse)
async def confirm_receipt(payload: ConfirmReceiptRequest, user: User = Depends(get_owner_manager), db=Depends(get_db)):
    if not user.store_id: raise HTTPException(400, "User is not assigned to a store")
    created = []
    for item in payload.items:
        product = db.scalar(select(Product).where(Product.id == item.product_id, Product.store_id == user.store_id))
        if not product: raise HTTPException(404, f"Product {item.product_id} not found")
        batch = InventoryBatch(store_id=user.store_id, product_id=item.product_id, quantity=item.quantity, expiry_date=item.expiry_date, purchase_price=item.purchase_price or product.purchase_price or 0, batch_number=item.batch_number)
        db.add(batch); db.flush(); created.append(batch.id)
    db.commit()
    summary = run_detection(db, user.store_id)
    await manager.broadcast(str(user.store_id), make_event("inventory_updated", {"batch_ids": [str(x) for x in created]}))
    if summary["recommendations_created"]:
        await manager.broadcast(str(user.store_id), make_event("recommendation_created", summary))
    return ConfirmReceiptResponse(created_batch_ids=created, detection_summary=DetectionRunSummary(**summary), alerts_triggered=summary["recommendations_created"])
