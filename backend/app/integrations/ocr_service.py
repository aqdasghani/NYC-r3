"""Invoice OCR pipeline with Google Gemini Flash."""
from __future__ import annotations

import base64
import difflib
import json
from dataclasses import dataclass
from datetime import date
from typing import Optional

from ..config import settings
from ..models.database import Product


@dataclass
class OcrResult:
    raw_text: str
    source: str
    parsed_items: list[dict] = None


def extract_invoice_text(image_bytes: bytes) -> OcrResult:
    """Use Gemini to extract structured JSON from the invoice image."""
    parsed_items = []
    text = ""
    source = "mock_parser"

    if settings.GEMINI_API_KEY:
        try:
            import httpx
            b64_data = base64.b64encode(image_bytes).decode("utf-8")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"text": "Extract the line items from this invoice. For each item, return product_name, quantity, price, batch_number, and expiry_date if available. Also extract vendor_name, invoice_date, invoice_number, total_amount, tax_amount. Format as JSON."},
                            {
                                "inlineData": {
                                    "data": b64_data,
                                    "mimeType": "image/jpeg"
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }

            resp = httpx.post(url, json=payload, timeout=20)
            resp.raise_for_status()
            result_json = resp.json()
            
            text = result_json.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
            if text:
                source = "gemini"
                try:
                    data = json.loads(text)
                    items = data.get("items") or data.get("extracted_items") or []
                    for item in items:
                        # Ensure fields match our internal expectations
                        parsed_items.append({
                            "line_text": item.get("line_text") or f"{item.get('product_name', '')} {item.get('quantity', '')} {item.get('price', '')}",
                            "product_name": item.get("product_name", "Unknown Product"),
                            "quantity": int(item.get("quantity") or 1),
                            "price": float(item.get("price") or 0.0),
                            "batch_number": str(item.get("batch_number", "")) if item.get("batch_number") else None,
                            "expiry_date": item.get("expiry_date"),  # Usually YYYY-MM-DD
                        })
                except Exception:
                    pass
        except Exception as e:
            print(f"Gemini OCR Failed: {e}")

    # Fallback to demo data if Gemini fails or is not configured. The demo
    # catalog (seed) uses these exact product names so the fuzzy matcher can
    # confirm them, keeping the receiving wizard usable end-to-end offline.
    if not parsed_items:
        source = "mock"
        text = "MOCK INVOICE TEXT"
        parsed_items = [
            {
                "line_text": "Amul Butter 500g 20 50.00",
                "product_name": "Amul Butter 500g",
                "quantity": 20,
                "price": 50.0,
                "batch_number": "B2284",
                "expiry_date": "2026-08-11",
            },
            {
                "line_text": "Mother Dairy Curd 400g 40 20.00",
                "product_name": "Mother Dairy Curd 400g",
                "quantity": 40,
                "price": 20.0,
                "batch_number": "B2213",
                "expiry_date": "2026-08-11",
            },
            {
                "line_text": "Britannia Bread 400g 30 25.00",
                "product_name": "Britannia Bread 400g",
                "quantity": 30,
                "price": 25.0,
                "batch_number": "B2187",
                "expiry_date": "2026-08-14",
            },
        ]

    return OcrResult(raw_text=text, source=source, parsed_items=parsed_items)


def parse_invoice(ocr_result: OcrResult, products: list[Product] | None = None) -> list[dict]:
    products = products or []
    parsed = []
    
    items = ocr_result.parsed_items or []
    
    for item in items:
        best = None
        confidence = 0.0
        # Fuzzy match product name
        for product in products:
            score = difflib.SequenceMatcher(None, item["product_name"].lower(), product.name.lower()).ratio()
            if score > confidence:
                confidence, best = score, product
        
        parsed.append({
            **item,
            "matched_product_id": best.id if best and confidence >= 0.40 else None,
            "confidence": round(confidence, 3),
        })
    return parsed
