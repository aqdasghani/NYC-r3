"""Deterministic demo seed — targets the static dashboard's mock vocabulary so the
app "comes alive" on first boot (run offline, no API keys needed).

Seed targets (from the frontend mock):
- 2 stores (Rahul SuperMart + a second store so TRANSFER has a real target)
- 3 users (Rahul OWNER / Priya MANAGER / Amit STAFF, password ``demo1234``)
- 24 suppliers, ~1284 products across 12 categories
- Batches so the expiry timeline matches: 8 in 0-3d, 14 in 4-7d, 15 in 8-15d
  (at-risk ≈ 37), 22 in 16-30d, rest 31-365d; 8 already-expired (₹2,160 loss)
- 192 dead-stock, 14 overstock, 21 low-stock products (dashboard donut)
- ~30 days of sales incl. a Lays +37% demand-spike product and a ParleG overstock
- 5 PENDING recommendations (alerts badge = 5)
- 30-day Green Score history trending 72 -> 84
- Waste events summing to ₹7,240 MTD

Idempotent: ``seed_if_empty()`` is a no-op once users exist.
CLI: ``python -m app.seed --force`` drops + recreates and reseeds.
"""
from __future__ import annotations

import argparse
import random
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .engines.action_engine import _rule_based_recommendations
from .engines.detection_engine import Detection
from .models.database import (
    AIRecommendation, GreenScoreHistory, InventoryBatch, Product, Sale, Store,
    Supplier, User, WasteEvent, create_all, drop_all, utcnow,
)
from .security import hash_password

# ------------------------------------------------------------------- catalog

CATEGORY_POOLS: dict[str, tuple[list[str], list[str]]] = {
    "Dairy & Bread": (
        ["Amul", "Mother Dairy", "Nandini", "Britannia"],
        ["Milk 1L", "Curd 400g", "Butter 500g", "Paneer 200g", "Ghee 500ml", "Bread 400g", "Cheese 200g", "Milk Powder 200g"],
    ),
    "Snacks & Namkeen": (
        ["Lays", "Kurkure", "Haldiram's", "Balaji", "Bingo", "Doritos"],
        ["Potato Chips 90g", "Masala Munch 75g", "Aloo Bhujia 200g", "Chana Jor Garam 150g", "Kurkure 90g", "Nachos 140g", "Mixture 250g", "Cheese Balls 60g"],
    ),
    "Beverages": (
        ["Coca-Cola", "Pepsi", "Thums Up", "Red Bull", "Sprite", "Fanta"],
        ["Cola 750ml", "Lemon Soda 750ml", "Orange Soda 750ml", "Energy Drink 250ml", "Soda Water 500ml", "Juice 1L", "Cold Coffee 180ml", "Water 1L"],
    ),
    "Biscuits & Bakery": (
        ["Parle", "Britannia", "Sunfeast", "Oreo", "Good Day", "Monaco"],
        ["Glucose Biscuit 250g", "Marie Gold 200g", "Good Day 200g", "Oreo 120g", "Cream Biscuit 150g", "Monaco 150g", "Krack Jack 150g", "Bourbon 150g"],
    ),
    "Personal Care": (
        ["Colgate", "Lux", "Dove", "Close-Up", "Patanjali", "Himalaya"],
        ["Toothpaste 100g", "Soap 100g", "Shampoo 180ml", "Face Wash 100g", "Hair Oil 200ml", "Deodorant 150ml", "Body Lotion 200ml", "Handwash 200ml"],
    ),
    "Home Care": (
        ["Surf Excel", "Tide", "Vim", "Lizol", "Ariel", "Mr. Muscle"],
        ["Detergent Powder 1kg", "Dishwash Gel 500ml", "Floor Cleaner 500ml", "Toilet Cleaner 500ml", "Liquid Detergent 1L", "Washing Bar 200g", "Glass Cleaner 500ml", "Soap Bar 150g"],
    ),
    "Staples": (
        ["Aashirvaad", "Fortune", "Tata Salt", "India Gate", "Patanjali", "Nature Fresh"],
        ["Wheat Atta 5kg", "Basmati Rice 5kg", "Toor Dal 1kg", "Moong Dal 1kg", "Salt 1kg", "Sugar 1kg", "Chana Dal 1kg", "Ragi Atta 1kg"],
    ),
    "Cooking Oils": (
        ["Fortune", "Saffola", "Dhara", "Gemini", "Freedom", "Sunflower"],
        ["Sunflower Oil 1L", "Groundnut Oil 1L", "Mustard Oil 1L", "Palm Oil 1L", "Refined Oil 1L", "Rice Bran Oil 1L", "Olive Oil 500ml", "Palmolein 1L"],
    ),
    "Spices & Masala": (
        ["MDH", "Everest", "Catch", "Badshah", "Tata", "Aachi"],
        ["Turmeric 100g", "Red Chilli 100g", "Garam Masala 100g", "Coriander 100g", "Cumin 100g", "Chicken Masala 100g", "Sabji Masala 100g", "Tea Masala 50g"],
    ),
    "Confectionery": (
        ["Cadbury", "Nestlé", "Parle", "Melody", "Eclairs", "Mentos"],
        ["Milk Chocolate 40g", "Chocolate Bar 52g", "Candy Jar 100g", "Toffee 200g", "Chewing Gum 25g", "Lollipop 100g", "Dark Chocolate 60g", "Chocolate Wafers 50g"],
    ),
    "Frozen Foods": (
        ["McCain", "Mother Dairy", "Bambino", "Kissan", "Amul", "McVities"],
        ["Frozen Fries 400g", "Frozen Peas 500g", "Ice Cream 500ml", "Frozen Paratha 300g", "Frozen Veggies 500g", "Pizza Base 200g", "Frozen Samosa 6pcs", "Frozen Momos 250g"],
    ),
    "Tea & Coffee": (
        ["Tata Tea", "Nescafé", "Bru", "Red Label", "Wagh Bakri", "Brooke Bond"],
        ["Tea Leaf 500g", "Instant Coffee 50g", "Green Tea 25g", "Masala Tea 500g", "Coffee Powder 200g", "Chai Masala 50g", "Filter Coffee 250g", "Lemon Tea 25g"],
    ),
}
CATEGORIES = list(CATEGORY_POOLS)

# Price band (purchase ₹) per category — cheap essentials to premium dairy/oil.
PRICE_BANDS = {
    "Dairy & Bread": (22, 65), "Snacks & Namkeen": (10, 45), "Beverages": (18, 90),
    "Biscuits & Bakery": (8, 40), "Personal Care": (25, 140), "Home Care": (15, 160),
    "Staples": (30, 95), "Cooking Oils": (55, 220), "Spices & Masala": (20, 90),
    "Confectionery": (10, 60), "Frozen Foods": (60, 180), "Tea & Coffee": (35, 150),
}
GST_OPTIONS = [5, 12, 18]


def _pick_name(rng: random.Random, category: str, used: set[str]) -> str:
    brands, items = CATEGORY_POOLS[category]
    brand, item = rng.choice(brands), rng.choice(items)
    name = f"{brand} {item}"
    if name not in used:
        used.add(name)
        return name
    for suffix in ("Pack", "Refill", "Mini", "Large", "Multi", "Sachet"):
        candidate = f"{brand} {item} {suffix}"
        if candidate not in used:
            used.add(candidate)
            return candidate
    name = f"{brand} {item} #{len(used) + 1}"
    used.add(name)
    return name


# ---------------------------------------------------------------- main seed

def seed_if_empty(db: Session | None = None) -> dict:
    """Idempotent entry point called from the app lifespan. No-op if users exist."""
    session = db or _session()
    try:
        if session.scalar(select(User.id).limit(1)):
            return {"seeded": False, "reason": "users already exist"}
        summary = _run_seed(session)
        session.commit()
        return {"seeded": True, **summary}
    except Exception:
        session.rollback()
        raise
    finally:
        if db is None:
            session.close()


def _session() -> Session:
    from .models.database import SessionLocal
    return SessionLocal()


def _run_seed(db: Session) -> dict:
    rng = random.Random(42)
    today = date.today()

    # --- stores ----------------------------------------------------------
    store1 = Store(name="Rahul SuperMart", address="12, MG Road", city="Bengaluru",
                   store_type="Kirana & Grocery", is_active=True)
    store2 = Store(name="Green Bazaar", address="4, Brigade Road", city="Bengaluru",
                   store_type="Supermarket", is_active=True)
    db.add_all([store1, store2])
    db.flush()

    # --- users -----------------------------------------------------------
    users = [
        User(name="Rahul Sharma", email="rahul@greenshop.ai", phone="9845012340",
             role="OWNER", hashed_password=hash_password("demo1234"), store_id=store1.id),
        User(name="Priya Verma", email="priya@greenshop.ai", phone="9845012341",
             role="MANAGER", hashed_password=hash_password("demo1234"), store_id=store1.id),
        User(name="Amit Kumar", email="amit@greenshop.ai", phone="9845012342",
             role="STAFF", hashed_password=hash_password("demo1234"), store_id=store1.id),
    ]
    store1.owner_id = users[0].id
    db.add_all(users)

    # --- suppliers (24) --------------------------------------------------
    supplier_names = [
        "Ganesh Distributors", "Sharma Agencies", "Karnataka Wholesale", "Sri Ganesh Traders",
        "Bangalore Supply Co", "Annapurna Distributors", "City Cold Storage", "Vijay Agencies",
        "Metro FMCG Supply", "South India Distributors", "Naveen Enterprises", "Jai Hind Traders",
        "Bharat Wholesale", "Sunrise Agencies", "Krishna Enterprises", "Lakshmi Traders",
        "Reliance FMCG Hub", "Nandini Supply Chain", "Ganga Distributors", "Om Agencies",
        "Perfect Grocery Supply", "Urban Fresh Distribution", "Sri Venkateswara Traders", "QuickMarts Supply",
    ]
    suppliers: list[Supplier] = []
    for i, name in enumerate(supplier_names):
        supplier = Supplier(store_id=store1.id, name=name, contact_phone=f"9845{i+100:04d}0",
                            gst_number=f"29ABCDE{i+1001}F1Z5",
                            on_time_delivery_score=round(rng.uniform(72, 98), 2),
                            expiry_quality_score=round(rng.uniform(65, 95), 2))
        suppliers.append(supplier)
    db.add_all(suppliers)
    db.flush()

    # --- products --------------------------------------------------------
    products: list[Product] = []
    batches: list[InventoryBatch] = []
    used_names: set[str] = set()
    product_count = max(5, settings.SEED_PRODUCT_COUNT)

    def add_product(name, category, price, quantity_hint=None) -> Product:
        low, high = PRICE_BANDS[category]
        p = Product(store_id=store1.id, name=name, category=category,
                    sku=f"GS-{category[:2].upper().replace(' ', '')}-{len(products):05d}",
                    barcode=f"890{100000000 + len(products):09d}",
                    purchase_price=round(price, 2),
                    selling_price=round(price * rng.uniform(1.15, 1.3), 2),
                    gst_rate=rng.choice(GST_OPTIONS),
                    supplier_id=rng.choice(suppliers).id,
                    lead_time_days=rng.randint(1, 5))
        products.append(p)
        db.add(p)
        db.flush()  # populate p.id so downstream batches can reference it
        return p

    def add_batch(product, quantity, expiry_offset, price=None, received_offset=None,
                  last_sale_offset=None, batch_number=None, days_in_store=None, store=None) -> InventoryBatch:
        sid = store.id if store else product.store_id
        b = InventoryBatch(
            product_id=product.id, store_id=sid,
            batch_number=batch_number or f"B{rng.randint(1000, 9999)}",
            quantity=quantity, expiry_date=today + timedelta(days=expiry_offset),
            purchase_price=price if price is not None else float(product.purchase_price),
            received_date=today - timedelta(days=received_offset or rng.randint(10, 120)),
            fefo_priority=0,
            last_sale_date=today - timedelta(days=last_sale_offset) if last_sale_offset is not None else None,
            days_in_store=days_in_store if days_in_store is not None else rng.randint(0, 120),
        )
        batches.append(b)
        return b

    # -- special products (drive the demo storyline) ----------------------
    amul = add_product("Amul Butter 500g", "Dairy & Bread", 50)
    amul_batch = add_batch(amul, 20, expiry_offset=2, batch_number="B2284",
                           received_offset=40, last_sale_offset=1, days_in_store=41)

    curd = add_product("Mother Dairy Curd 400g", "Dairy & Bread", 20)
    curd_batch = add_batch(curd, 40, expiry_offset=1, batch_number="B2213",
                           received_offset=12, last_sale_offset=1, days_in_store=12)

    bread = add_product("Britannia Bread 400g", "Dairy & Bread", 25)
    bread_batch = add_batch(bread, 30, expiry_offset=5, batch_number="B2187",
                            received_offset=8, last_sale_offset=2, days_in_store=9)

    parle = add_product("Parle-G Gold 250g", "Biscuits & Bakery", 20)
    parle_b1 = add_batch(parle, 600, expiry_offset=280, received_offset=150, last_sale_offset=2, days_in_store=152)
    parle_b2 = add_batch(parle, 500, expiry_offset=240, received_offset=90, last_sale_offset=2, days_in_store=92)

    lays = add_product("Lays Classic Salted 90g", "Snacks & Namkeen", 18)
    lays_batch = add_batch(lays, 60, expiry_offset=120, received_offset=30, last_sale_offset=1, days_in_store=31)

    # -- near-expiry products (37: 3 specials + 7 critical + 13 warning + 14 upcoming)
    offsets = ([rng.randint(0, 3) for _ in range(7)] +
               [rng.randint(4, 7) for _ in range(13)] +
               [rng.randint(8, 15) for _ in range(14)])
    # near-expiry stock is typically cheap perishables; keep prices modest so the
    # dashboard's at-risk value (~₹18.5k) and Green Score (~84) stay in the demo band.
    cheap = ["Dairy & Bread", "Snacks & Namkeen", "Biscuits & Bakery", "Confectionery", "Spices & Masala"]
    for off in offsets:
        category = rng.choice(cheap)
        product = add_product(_pick_name(rng, category, used_names), category, rng.uniform(15, 35))
        add_batch(product, rng.randint(15, 25), expiry_offset=off, price=rng.uniform(15, 35),
                  last_sale_offset=rng.randint(0, 5))

    # -- expired products (8) summing to ₹2,160 loss ----------------------
    expired_targets = [(30, 10), (28, 10), (25, 11), (26, 10), (25, 10), (24, 10), (47, 5), (32, 10)]  # = 2160
    for price, qty in expired_targets:
        category = rng.choice(CATEGORIES)
        product = add_product(_pick_name(rng, category, used_names), category, price)
        add_batch(product, qty, expiry_offset=rng.randint(-15, -1), last_sale_offset=rng.randint(20, 45))

    # -- low stock (21) ---------------------------------------------------
    low_stock_products: list[Product] = []
    for _ in range(21):
        category = rng.choice(CATEGORIES)
        product = add_product(_pick_name(rng, category, used_names), category, rng.uniform(*PRICE_BANDS[category]))
        add_batch(product, rng.randint(2, 5), expiry_offset=rng.randint(40, 90), last_sale_offset=rng.randint(1, 10))
        low_stock_products.append(product)

    # -- overstock (14) ---------------------------------------------------
    overstock_products = [parle]
    for _ in range(13):
        category = rng.choice(CATEGORIES)
        product = add_product(_pick_name(rng, category, used_names), category, rng.uniform(*PRICE_BANDS[category]))
        qty1 = rng.randint(300, 500)
        qty2 = rng.randint(200, 400)
        add_batch(product, qty1, expiry_offset=rng.randint(100, 300), last_sale_offset=rng.randint(0, 5))
        add_batch(product, qty2, expiry_offset=rng.randint(120, 320), last_sale_offset=rng.randint(0, 5))
        overstock_products.append(product)

    # -- dead stock (192 products with only a zero-qty batch) -------------
    for _ in range(192):
        category = rng.choice(CATEGORIES)
        product = add_product(_pick_name(rng, category, used_names), category, rng.uniform(*PRICE_BANDS[category]))
        add_batch(product, 0, expiry_offset=rng.randint(60, 300), last_sale_offset=rng.randint(90, 180), days_in_store=rng.randint(120, 300))

    # -- good stock (rest) ---------------------------------------------------
    # Quantity is scaled to the seeded sales rate (3-8 sale days x qty 1-8 over
    # 30 days) so days-of-supply lands in a healthy 35-80 band. This keeps the
    # full-store detection sweep quiet except for the curated storyline risks,
    # and pushes inventory value toward the dashboard's ~₹4.8L figure.
    good_target = product_count - len(products)
    for _ in range(good_target):
        category = rng.choice(CATEGORIES)
        product = add_product(_pick_name(rng, category, used_names), category, rng.uniform(*PRICE_BANDS[category]))
        add_batch(product, rng.randint(25, 60), expiry_offset=rng.randint(31, 365),
                  last_sale_offset=rng.randint(0, 30), days_in_store=rng.randint(0, 60))

    db.add_all(batches)
    db.flush()

    # --- second store: a little inventory for TRANSFER realism ------------
    store2_products: list[Product] = []
    for _ in range(10):
        category = rng.choice(CATEGORIES)
        low, high = PRICE_BANDS[category]
        p = Product(store_id=store2.id, name=_pick_name(rng, category, used_names), category=category,
                    barcode=f"890{200000000 + len(store2_products):09d}",
                    purchase_price=round(rng.uniform(low, high), 2),
                    selling_price=round(rng.uniform(low, high) * 1.2, 2),
                    gst_rate=rng.choice(GST_OPTIONS), lead_time_days=2)
        store2_products.append(p)
    db.add_all(store2_products)
    db.flush()
    for p in store2_products:
        db.add(InventoryBatch(product_id=p.id, store_id=store2.id, quantity=rng.randint(20, 200),
                              expiry_date=today + timedelta(days=rng.randint(40, 300)),
                              purchase_price=float(p.purchase_price), received_date=today - timedelta(days=20)))
    db.flush()

    # --- sales (~3500 rows over 30 days) ----------------------------------
    active = [p for p in products if p not in (b.product_id for b in batches if b.quantity == 0) or p in (lays, parle, amul, curd, bread)]
    # simpler: products that have at least one positive-qty batch
    active_ids = {b.product_id for b in batches if b.quantity > 0}
    active = [p for p in products if p.id in active_ids]
    sale_rows: list[Sale] = []
    for product in active:
        product_batches = [b for b in batches if b.product_id == product.id and b.quantity > 0]
        if not product_batches:
            continue
        # Spread each product's sales across the full 30-day window so the
        # prior-4-week baseline is populated (sparse last-week-only sales would
        # otherwise trip a false Demand Spike).
        if product is lays or product is parle:
            offsets = list(range(30))
        else:
            offsets = sorted(rng.sample(range(30), rng.randint(3, 8)))
        for offset in offsets:
            if product is lays:
                qty = rng.randint(11, 15) if offset <= 6 else rng.randint(7, 10)
            elif product is parle:
                qty = rng.randint(6, 10)
            else:
                qty = rng.randint(1, 8)
            sale_rows.append(Sale(
                store_id=store1.id, product_id=product.id,
                batch_id=rng.choice(product_batches).id,
                quantity_sold=qty,
                sale_price=float(product.selling_price or 0),
                gst_amount=round(float(product.selling_price or 0) * qty * 0.12, 2),
                sale_date=datetime.combine(today - timedelta(days=offset), datetime.min.time())
                + timedelta(hours=rng.randint(8, 21)),
            ))
    db.add_all(sale_rows)
    db.flush()

    # --- 5 PENDING recommendations (alerts badge = 5) ----------------------
    def make_detection(product, batch, risk_type, severity, value, metadata=None) -> Detection:
        return Detection(risk_type=risk_type, severity=severity, product_id=product.id,
                         batch_id=batch.id, value_at_risk=value, metadata=metadata or {})

    rec_specs = [
        (amul, amul_batch, "Expiry Risk", "CRITICAL", 1000.0, {}),
        (curd, curd_batch, "Expiry Risk", "CRITICAL", 800.0, {}),
        (bread, bread_batch, "Waste Risk", "WARNING", 750.0, {"units": 30}),
        (parle, parle_b1, "Overstock", "WARNING", 22000.0, {"days_of_supply": 137}),
        (lays, lays_batch, "Demand Spike", "WARNING", 1320.0, {"last_week_avg": 13, "prior_avg": 7}),
    ]
    for product, batch, risk_type, severity, value, meta in rec_specs:
        detection = make_detection(product, batch, risk_type, severity, value, meta)
        recs = _rule_based_recommendations(detection, product)
        db.add(AIRecommendation(
            store_id=store1.id, product_id=product.id, batch_id=batch.id,
            risk_type=risk_type, severity=severity, value_at_risk=value,
            recommendation_json=[r.model_dump() for r in recs],
            status="PENDING", created_at=utcnow(),
        ))

    # --- waste events summing to ₹7,240 MTD -------------------------------
    waste_values = [1000, 950, 900, 850, 800, 750, 700, 650, 600, 40]  # = 7240
    interventions = ["DISCOUNT", "TRANSFER", "RETURN", "REORDER", "DISCOUNT"]
    refs = [amul, curd, bread, parle, lays, amul, curd, bread, parle, lays]
    for i, value in enumerate(waste_values):
        db.add(WasteEvent(
            store_id=store1.id, product_id=refs[i].id, potential_value=value * 1.25,
            intervention_type=interventions[i % len(interventions)],
            value_prevented=value, actual_waste=0,
            created_at=datetime.combine(today - timedelta(days=28 - i * 3), datetime.min.time())
            + timedelta(hours=rng.randint(9, 19)),
        ))

    # --- Green Score history: 30 days trending 72 -> 84 ---------------------
    for i in range(30):
        day = today - timedelta(days=29 - i)
        score = round(72 + 12 * i / 29, 2)
        db.add(GreenScoreHistory(
            store_id=store1.id, period_date=day, score=score,
            expiry_score=round(max(0, score - 4), 2), inventory_score=round(max(0, score - 2), 2),
            dead_stock_score=round(max(0, score + 1), 2), waste_score=round(max(0, score - 1), 2),
        ))
    db.flush()

    return {
        "stores": 2, "users": len(users), "suppliers": len(suppliers),
        "products": len(products), "batches": len(batches), "sales": len(sale_rows),
        "recommendations": len(rec_specs), "waste_events": len(waste_values),
    }


# ----------------------------------------------------------------------- CLI

def main() -> None:
    parser = argparse.ArgumentParser(description="Seed GreenShop AI demo data")
    parser.add_argument("--force", action="store_true", help="Drop and recreate all tables before seeding")
    args = parser.parse_args()

    if args.force:
        drop_all()
        create_all()
    result = seed_if_empty()
    print(f"Seed result: {result}")


if __name__ == "__main__":
    main()
