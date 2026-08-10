"""Invoice/label expiry extraction helpers.

Patterns intentionally accept the formats most commonly printed on Indian
FMCG packaging: EXP 14/08/2026, Best Before 6 months, MFD 08/2025, etc.
"""
from __future__ import annotations

import re
from calendar import monthrange
from datetime import date, timedelta
from typing import Optional

# Public so OCR tests and integrations can inspect the supported formats.
EXPIRY_PATTERNS = [
    re.compile(r"(?:EXP(?:IRY)?|USE\s*BY|BEST\s*BEFORE)\s*[:.\-]?\s*(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})", re.I),
    re.compile(r"(?:EXP(?:IRY)?|USE\s*BY|BEST\s*BEFORE)\s*[:.\-]?\s*(\d{1,2}[\-/]\d{4})", re.I),
    re.compile(r"(?:EXP(?:IRY)?|USE\s*BY|BEST\s*BEFORE)\s*[:.\-]?\s*([A-Za-z]{3,9}\s+\d{4})", re.I),
    re.compile(r"BEST\s*BEFORE\s*[:.\-]?\s*(\d+)\s*(DAYS?|MONTHS?)", re.I),
]
MFD_PATTERNS = [
    re.compile(r"(?:MFD|MFG|MANUFACTURED)\s*[:.\-]?\s*(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})", re.I),
    re.compile(r"(?:MFD|MFG|MANUFACTURED)\s*[:.\-]?\s*(\d{1,2}[\-/]\d{4})", re.I),
]


def _parse_date(value: str) -> Optional[date]:
    value = value.strip().replace("-", "/")
    parts = value.split("/")
    try:
        if len(parts) == 3:
            a, b, c = (int(p) for p in parts)
            if c < 100:
                c += 2000
            # Accept both DD/MM/YYYY and MM/DD/YYYY, preferring DD/MM.
            if a > 12:
                return date(c, b, a)
            if b > 12:
                return date(c, a, b)
            return date(c, b, a)
        if len(parts) == 2:
            month, year = (int(p) for p in parts)
            if year < 100:
                year += 2000
            return date(year, month, monthrange(year, month)[1])
        parsed = re.match(r"([A-Za-z]+)\s+(\d{4})", value)
        if parsed:
            month = next((i for i in range(1, 13) if date(2000, i, 1).strftime("%B").lower().startswith(parsed.group(1).lower()[:3])), None)
            if month:
                year = int(parsed.group(2))
                return date(year, month, monthrange(year, month)[1])
    except (ValueError, TypeError):
        return None
    return None


def parse_dates(text: str) -> Optional[date]:
    """Find the first explicit expiry date in arbitrary OCR text."""
    for pattern in EXPIRY_PATTERNS[:3]:
        match = pattern.search(text)
        if match:
            parsed = _parse_date(match.group(1))
            if parsed:
                return parsed
    # "Best before N months" is relative to MFD where available, else today.
    relative = EXPIRY_PATTERNS[3].search(text)
    if relative:
        amount = int(relative.group(1))
        unit = relative.group(2).lower()
        base = date.today()
        if unit.startswith("month"):
            month = base.month - 1 + amount
            year = base.year + month // 12
            month = month % 12 + 1
            return date(year, month, min(base.day, monthrange(year, month)[1]))
        return base + timedelta(days=amount)
    return None


def parse_expiry_fields(text: str) -> dict:
    expiry = parse_dates(text)
    batch_match = re.search(r"(?:BATCH|LOT|B)\s*[:#\-]?\s*([A-Z0-9][A-Z0-9\-/]{2,})", text, re.I)
    quantity_match = re.search(r"(?:QTY|QUANTITY|PCS|UNITS?)\s*[:x#]?\s*(\d+)", text, re.I)
    price_match = re.search(r"(?:MRP|RATE|PRICE|₹|RS\.?)[\s:]*([\d,]+(?:\.\d{1,2})?)", text, re.I)
    return {
        "expiry_date": expiry,
        "batch_number": batch_match.group(1) if batch_match else None,
        "quantity": int(quantity_match.group(1)) if quantity_match else 0,
        "price": float(price_match.group(1).replace(",", "")) if price_match else None,
    }


def parse_invoice_lines(raw_text: str) -> list[dict]:
    """Parse a simple line-oriented invoice into normalized dictionaries."""
    result: list[dict] = []
    for line in raw_text.splitlines():
        line = line.strip()
        if not line or line.upper().startswith(("INVOICE", "GSTIN", "DATE:")):
            continue
        fields = parse_expiry_fields(line)
        # Strip metadata to create a useful product candidate.
        product = re.sub(r"(?:EXP(?:IRY)?|USE\s*BY|BEST\s*BEFORE|MFD|BATCH|LOT|QTY|MRP|PRICE|RS\.?|₹)[^,;|]*", "", line, flags=re.I)
        product = re.sub(r"\s{2,}", " ", product).strip(" ,-:") or line
        result.append({"line_text": line, "product_name": product, **fields})
    return result
