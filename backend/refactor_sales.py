import os
import re

files_to_fix = [
    "c:/Users/sbhrn/.gemini/antigravity/scratch/greenshop-ai/backend/app/engines/math_engine.py",
    "c:/Users/sbhrn/.gemini/antigravity/scratch/greenshop-ai/backend/app/engines/behavior_engine.py",
    "c:/Users/sbhrn/.gemini/antigravity/scratch/greenshop-ai/backend/app/engines/detection_engine.py",
    "c:/Users/sbhrn/.gemini/antigravity/scratch/greenshop-ai/backend/app/engines/forecast_engine.py",
    "c:/Users/sbhrn/.gemini/antigravity/scratch/greenshop-ai/backend/app/engines/insight_engine.py",
    "c:/Users/sbhrn/.gemini/antigravity/scratch/greenshop-ai/backend/app/routers/analytics.py"
]

def replace_in_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Imports
    content = re.sub(r'\bSale\b', 'InvoiceItem', content)
    content = content.replace("from ..models.database import InvoiceItem", "from ..models.database import Invoice, InvoiceItem")
    content = content.replace("from ..models.database import (", "from ..models.database import (\n    Invoice, InvoiceItem,")
    
    # SQLAlchemy queries
    content = content.replace("select(InvoiceItem).where(InvoiceItem.store_id", "select(InvoiceItem).join(Invoice).where(Invoice.store_id")
    content = content.replace("select(InvoiceItem).where(", "select(InvoiceItem).join(Invoice).where(")
    content = content.replace("select(InvoiceItem.quantity_sold).where(", "select(InvoiceItem.quantity).join(Invoice).where(")
    
    # Attributes
    content = content.replace("InvoiceItem.store_id", "Invoice.store_id")
    content = content.replace("InvoiceItem.sale_date", "Invoice.created_at")
    content = content.replace("InvoiceItem.pos_session_id", "Invoice.pos_session_id")
    
    content = content.replace(".sale_date", ".invoice.created_at")
    content = content.replace(".quantity_sold", ".quantity")
    content = content.replace(".sale_price", ".unit_price")
    
    # In behavior_engine etc
    content = content.replace(".pos_session_id", ".invoice.pos_session_id")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print(f"Fixed {path}")

for f in files_to_fix:
    if os.path.exists(f):
        replace_in_file(f)
