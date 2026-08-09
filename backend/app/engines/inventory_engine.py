"""Inventory intelligence engine — real analytical calculations from DB."""
from __future__ import annotations
from datetime import date, datetime, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..models.database import InventoryBatch, Product, Sale
from .math_engine import calculate_stock_velocity, calculate_days_of_inventory


def stock_intelligence(db: Session, store_id) -> dict:
    """Full inventory intelligence summary."""
    today = date.today()
    since_14 = datetime.now() - timedelta(days=14)
    
    batches = db.scalars(select(InventoryBatch).where(
        InventoryBatch.store_id == store_id,
        InventoryBatch.quantity > 0
    )).all()
    
    recent_sales = db.scalars(select(Sale).where(
        Sale.store_id == store_id,
        Sale.sale_date >= since_14
    )).all()
    
    # Build velocity map by product
    velocity_map = {}
    for s in recent_sales:
        velocity_map[s.product_id] = velocity_map.get(s.product_id, 0) + s.quantity_sold
    velocity_map = {pid: units / 14 for pid, units in velocity_map.items()}
    
    healthy = low_stock = overstock = dead = near_expiry = expired_count = 0
    healthy_value = low_value = overstock_value = dead_value = near_expiry_value = expired_value = 0.0
    
    for batch in batches:
        v = velocity_map.get(batch.product_id, 0.0)
        days_remaining = (batch.expiry_date - today).days
        cost = float(batch.purchase_price or 0)
        value = batch.quantity * cost
        
        if days_remaining < 0:
            expired_count += 1
            expired_value += value
            continue
        
        if days_remaining <= 7:
            near_expiry += 1
            near_expiry_value += value
        
        if v <= 0:
            if batch.days_in_store > 60:
                dead += 1
                dead_value += value
            else:
                healthy += 1
                healthy_value += value
        else:
            doi = calculate_days_of_inventory(batch.quantity, v)
            if doi <= 7:
                low_stock += 1
                low_value += value
            elif doi > 90:
                overstock += 1
                overstock_value += value
            else:
                healthy += 1
                healthy_value += value
    
    return {
        'healthy': {'count': healthy, 'value': round(healthy_value, 2)},
        'low_stock': {'count': low_stock, 'value': round(low_value, 2)},
        'overstock': {'count': overstock, 'value': round(overstock_value, 2)},
        'dead_stock': {'count': dead, 'value': round(dead_value, 2)},
        'near_expiry': {'count': near_expiry, 'value': round(near_expiry_value, 2)},
        'expired': {'count': expired_count, 'value': round(expired_value, 2)},
    }


def slow_movers(db: Session, store_id, threshold: float = 0.2, limit: int = 20) -> list:
    """Products with average velocity < threshold units/day."""
    since = datetime.now() - timedelta(days=30)
    products = db.scalars(select(Product).where(Product.store_id == store_id)).all()
    results = []
    for p in products:
        sales = db.scalars(select(Sale).where(
            Sale.store_id == store_id,
            Sale.product_id == p.id,
            Sale.sale_date >= since
        )).all()
        total = sum(s.quantity_sold for s in sales)
        v = total / 30
        if v < threshold:
            batches = db.scalars(select(InventoryBatch).where(
                InventoryBatch.product_id == p.id,
                InventoryBatch.store_id == store_id,
                InventoryBatch.quantity > 0
            )).all()
            stock = sum(b.quantity for b in batches)
            value = sum(b.quantity * float(b.purchase_price or 0) for b in batches)
            if stock > 0:
                results.append({
                    'product_id': str(p.id),
                    'name': p.name,
                    'category': p.category,
                    'stock': stock,
                    'value': round(value, 2),
                    'velocity': round(v, 3),
                    'days_of_inventory': round(calculate_days_of_inventory(stock, v), 0) if v > 0 else None,
                })
    results.sort(key=lambda x: x['velocity'])
    return results[:limit]


def fast_movers(db: Session, store_id, threshold: float = 5.0, limit: int = 20) -> list:
    """Products with average velocity >= threshold units/day."""
    since = datetime.now() - timedelta(days=14)
    products = db.scalars(select(Product).where(Product.store_id == store_id)).all()
    results = []
    for p in products:
        sales = db.scalars(select(Sale).where(
            Sale.store_id == store_id,
            Sale.product_id == p.id,
            Sale.sale_date >= since
        )).all()
        total = sum(s.quantity_sold for s in sales)
        v = total / 14
        if v >= threshold:
            batches = db.scalars(select(InventoryBatch).where(
                InventoryBatch.product_id == p.id,
                InventoryBatch.store_id == store_id,
                InventoryBatch.quantity > 0
            )).all()
            stock = sum(b.quantity for b in batches)
            results.append({
                'product_id': str(p.id),
                'name': p.name,
                'category': p.category,
                'stock': stock,
                'velocity': round(v, 2),
                'days_of_inventory': round(calculate_days_of_inventory(stock, v), 1) if v > 0 else None,
                'revenue_14d': round(sum(float(s.sale_price or 0) * s.quantity_sold for s in sales), 2),
            })
    results.sort(key=lambda x: x['velocity'], reverse=True)
    return results[:limit]
