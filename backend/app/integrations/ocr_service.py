"""Invoice OCR pipeline with Google Vision, local Tesseract, and deterministic fallback."""
from __future__ import annotations

import difflib
import io
import re
from dataclasses import dataclass
from datetime import date, timedelta

from ..config import settings
from ..models.database import Product
from ..utils.expiry_parser import parse_invoice_lines

MOCK_INVOICE = """INVOICE #GS-DEMO-2284
Amul Butter 500g, QTY 20, MRP 50, BATCH B2284, EXP 11/08/2026
Britannia Good Day 250g, QTY 48, MRP 30, BATCH BG771, BEST BEFORE 6 MONTHS
Parle-G Biscuits 800g, QTY 36, PRICE 72, LOT PG2026, EXP 30/09/2026
"""


@dataclass
class OcrResult:
    raw_text: str
    source: str


def _tesseract_available() -> bool:
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def extract_invoice_text(image_bytes: bytes) -> OcrResult:
    if settings.GOOGLE_VISION_API_KEY:
        try:
            import base64
            import httpx
            response = httpx.post(
                "https://vision.googleapis.com/v1/images:annotate",
                params={"key": settings.GOOGLE_VISION_API_KEY},
                json={"requests": [{"image": {"content": base64.b64encode(image_bytes).decode()}, "features": [{"type": "DOCUMENT_TEXT_DETECTION"}]}]},
                timeout=8,
            )
            response.raise_for_status()
            text = response.json().get("responses", [{}])[0].get("fullTextAnnotation", {}).get("text", "")
            if text:
                return OcrResult(text, "google_vision")
        except Exception:
            pass
    if image_bytes and _tesseract_available():
        try:
            import pytesseract
            from PIL import Image, ImageEnhance, ImageOps
            image = Image.open(io.BytesIO(image_bytes)).convert("L")
            image = ImageOps.autocontrast(image.resize((image.width * 2, image.height * 2)))
            image = ImageEnhance.Contrast(image).enhance(1.5)
            text = pytesseract.image_to_string(image)
            if text.strip():
                return OcrResult(text, "tesseract")
        except Exception:
            pass
    return OcrResult(MOCK_INVOICE, "mock_parser")


def parse_invoice(raw_text: str, products: list[Product] | None = None) -> list[dict]:
    products = products or []
    parsed = []
    for item in parse_invoice_lines(raw_text):
        best = None
        confidence = 0.0
        for product in products:
            score = difflib.SequenceMatcher(None, item["product_name"].lower(), product.name.lower()).ratio()
            if score > confidence:
                confidence, best = score, product
        parsed.append({
            **item,
            "matched_product_id": best.id if best and confidence >= 0.45 else None,
            "confidence": round(confidence, 3),
        })
    return parsed
