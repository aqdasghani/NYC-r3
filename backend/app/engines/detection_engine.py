"""Rule-based risk detection and recommendation generation trigger."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.database import AIRecommendation, InventoryBatch, Product, Sale
from .forecast_engine import calculate_velocity, days_of_supply, stockout_eta


@dataclass
class ExpiryRisk:
    severity: str
    value_at_risk: float
    risk_type: str = "Expiry Risk"
    metadata: dict = field(default_factory=dict)


@dataclass
class WasteRisk:
    units: float
    value: float
    severity: str = "WARNING"
    risk_type: str = "Waste Risk"
    metadata: dict = field(default_factory=dict)


@dataclass
class DeadStockRisk:
    days_idle: int
    value_locked: float
    severity: str = "WARNING"
    risk_type: str = "Dead Stock"
    metadata: dict = field(default_factory=dict)


@dataclass
class Detection:
    risk_type: str
    severity: str
    product_id: Any
    batch_id: Any | None = None
    value_at_risk: float = 0.0
    metadata: dict = field(default_factory=dict)


def _unit_cost(batch) -> float:
    return float(getattr(batch, "unit_cost", None) or getattr(batch, "purchase_price", 0) or 0)


def detect_risks(batch, sales_history):
    """Evaluate one inventory batch against the three arch §4.1 risk vectors.

    ``sales_history`` is a list of quantities (or Sale rows); accepting both
    makes this function useful in unit tests and in the DB-backed runner.
    """
    quantities = [int(getattr(s, "quantity_sold", s) or 0) for s in sales_history]
    velocity = sum(quantities) / 14 if quantities else 0.0
    today = datetime.now().date()
    days_remaining = (batch.expiry_date - today).days
    expected_leftover = batch.quantity - (velocity * days_remaining)
    cost = _unit_cost(batch)
    risks = []
    if days_remaining <= 3:
        risks.append(ExpiryRisk(severity="CRITICAL", value_at_risk=batch.quantity * cost))
    if expected_leftover > 0 and days_remaining < 15:
        risks.append(WasteRisk(units=expected_leftover, value=expected_leftover * cost))
    last_sale = getattr(batch, "last_sale_date", None)
    days_since_last_sale = (today - last_sale).days if last_sale else getattr(batch, "days_in_store", 0)
    if velocity == 0 and days_since_last_sale > 60:
        risks.append(DeadStockRisk(days_idle=days_since_last_sale, value_locked=batch.quantity * cost))
    return risks


def detect_product_risks(product: Product, sales: list[Sale], batches: list[InventoryBatch]) -> list[Detection]:
    if not batches:
        return []
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    last_7 = [s for s in sales if s.sale_date >= now - timedelta(days=7)]
    last_14 = [s for s in sales if s.sale_date >= now - timedelta(days=14)]
    prior = [s for s in sales if now - timedelta(days=35) <= s.sale_date < now - timedelta(days=7)]
    last_avg = sum(s.quantity_sold for s in last_7) / 7
    prior_avg = sum(s.quantity_sold for s in prior) / 28
    total_qty = sum(max(0, b.quantity) for b in batches)
    velocity = sum(s.quantity_sold for s in last_14) / 14 if last_14 else 0.0
    active_batch = next((b for b in batches if b.quantity > 0), batches[0])
    detections: list[Detection] = []
    if prior_avg >= 0.8 and last_avg >= 1.3 * prior_avg and last_avg > 0 and total_qty <= max(10, velocity * 10):
        detections.append(Detection("Demand Spike", "WARNING", product.id, active_batch.id, float(total_qty * (product.selling_price or 0)), {"last_week_avg": last_avg, "prior_avg": prior_avg}))
    # Overstock only counts on products with real turnover (>=1 unit/day); a
    # slow mover with a big shelf is a dead-stock problem, not an overstock one.
    if velocity >= 1.0 and days_of_supply(total_qty, velocity) > 90:
        detections.append(Detection("Overstock", "WARNING", product.id, active_batch.id, float(total_qty * (product.purchase_price or 0)), {"days_of_supply": days_of_supply(total_qty, velocity)}))
    eta = stockout_eta(total_qty, velocity)
    if velocity >= 0.15 and eta <= 5:
        detections.append(Detection("Stockout Risk", "CRITICAL", product.id, active_batch.id, 0.0, {"stockout_eta": eta}))
    purchase = float(product.purchase_price or 0)
    selling = float(product.selling_price or 0)
    margin = (selling - purchase) / selling * 100 if selling else 0
    if margin < 8:
        detections.append(Detection("Margin Risk", "WARNING", product.id, active_batch.id, float(total_qty * purchase), {"margin_pct": margin}))
    return detections


def run_detection(db: Session, store_id) -> dict:
    """Run all detectors, persist new pending recommendations, return a summary."""
    from collections import defaultdict

    products = db.scalars(select(Product).where(Product.store_id == store_id)).all()
    since = datetime.now() - timedelta(days=35)

    # Batch-load the whole store's active batches and recent sales once, grouped
    # by product, so the per-product sweep is a pure in-memory pass (was N queries).
    batches_by_product: dict[Any, list[InventoryBatch]] = defaultdict(list)
    for batch in db.scalars(select(InventoryBatch).where(InventoryBatch.store_id == store_id, InventoryBatch.quantity > 0)):
        batches_by_product[batch.product_id].append(batch)
    sales_by_product: dict[Any, list[Sale]] = defaultdict(list)
    for sale in db.scalars(select(Sale).where(Sale.store_id == store_id, Sale.sale_date >= since)):
        sales_by_product[sale.product_id].append(sale)

    created = 0
    risks_detected = 0
    from .action_engine import generate_recommendations

    for product in products:
        batches = batches_by_product.get(product.id, [])
        sales = sales_by_product.get(product.id, [])
        detections: list[Detection] = []
        for batch in batches:
            for risk in detect_risks(batch, sales):
                if isinstance(risk, ExpiryRisk):
                    detections.append(Detection(risk.risk_type, risk.severity, product.id, batch.id, risk.value_at_risk))
                elif isinstance(risk, WasteRisk):
                    detections.append(Detection(risk.risk_type, risk.severity, product.id, batch.id, risk.value, {"units": risk.units}))
                else:
                    detections.append(Detection(risk.risk_type, risk.severity, product.id, batch.id, risk.value_locked, {"days_idle": risk.days_idle}))
        detections.extend(detect_product_risks(product, sales, batches))
        seen: set[tuple] = set()
        for detection in detections:
            key = (str(detection.product_id), detection.risk_type)
            if key in seen:
                continue
            seen.add(key)
            risks_detected += 1
            if db.scalar(select(AIRecommendation.id).where(
                AIRecommendation.store_id == store_id,
                AIRecommendation.product_id == detection.product_id,
                AIRecommendation.risk_type == detection.risk_type,
                AIRecommendation.status == "PENDING",
            )):
                continue
            recs = generate_recommendations(db, detection, product=product)
            db.add(AIRecommendation(
                store_id=store_id,
                product_id=detection.product_id,
                batch_id=detection.batch_id,
                risk_type=detection.risk_type,
                severity=detection.severity,
                value_at_risk=detection.value_at_risk,
                recommendation_json=[r.model_dump() for r in recs],
                status="PENDING",
            ))
            created += 1
    db.commit()
    return {"risks_detected": risks_detected, "recommendations_created": created}
