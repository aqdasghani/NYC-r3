"""Recommendation generation and execution."""
from __future__ import annotations

import math
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.database import AIRecommendation, InventoryBatch, Product, Store, WasteEvent, utcnow
from ..models.schemas import ExecuteActionResponse, Recommendation


def build_prompt(detection, context: dict | None = None) -> str:
    context = context or {}
    return f"""You are an AI retail advisor for an Indian small shop.

Situation:
- Product: {context.get('product_name', 'Unknown')}, Batch: {context.get('batch_id', detection.batch_id)}
- Stock: {context.get('quantity', 0)} units @ ₹{context.get('unit_cost', 0)} each
- Expiry: {context.get('days_remaining', 'unknown')} days
- Sales velocity: {context.get('velocity', 0)} units/day
- Expected leftover: {context.get('expected_leftover', 0)} units
- Value at risk: ₹{detection.value_at_risk}

Return exactly 3 ranked recommendations as JSON. Each must contain rank, action_type
(DISCOUNT, TRANSFER, RETURN, or REORDER), params, expected_outcome, confidence,
and a one-line reasoning. Prefer actions that prevent waste while preserving margin."""


def _rule_based_recommendations(detection, product=None) -> list[Recommendation]:
    risk = detection.risk_type.lower()
    value = max(0.0, float(detection.value_at_risk or 0))
    if "expiry" in risk or "waste" in risk:
        discount = 25 if detection.severity == "CRITICAL" else 10
        actions = [
            ("DISCOUNT", {"percent": discount}, value * 0.8, f"Discount {discount}% to clear stock before expiry."),
            ("TRANSFER", {"percent_units": 50}, value * 0.5, "Move half the batch to a faster-selling store."),
            ("RETURN", {"eligible_units": "all"}, value * 0.35, "Return remaining eligible units to the supplier."),
        ]
    elif "dead" in risk:
        actions = [
            ("RETURN", {"eligible_units": "all"}, value * 0.8, "Return capital-locked stock while it remains eligible."),
            ("DISCOUNT", {"percent": 30}, value * 0.65, "Run a 30% clearance discount to release cash."),
            ("TRANSFER", {"percent_units": 100}, value * 0.55, "Transfer stock to a store where it sells."),
        ]
    elif "overstock" in risk:
        actions = [
            ("REORDER", {"quantity": 0}, 0, "Pause purchasing until supply normalizes."),
            ("TRANSFER", {"percent_units": 30}, value * 0.3, "Balance excess stock into another location."),
            ("DISCOUNT", {"percent": 5}, value * 0.2, "Use a small discount to improve sell-through."),
        ]
    elif "stockout" in risk or "demand" in risk:
        lead = getattr(product, "lead_time_days", 2) if product else 2
        qty = math.ceil(float(detection.metadata.get("last_week_avg", 1)) * (lead + 1))
        actions = [
            ("REORDER", {"quantity": qty}, value * 0.1, f"Order {qty} units before demand outpaces supply."),
            ("TRANSFER", {"percent_units": 25}, value * 0.15, "Source units from another store temporarily."),
            ("DISCOUNT", {"percent": 0}, 0, "Do not discount while stock is constrained."),
        ]
    else:
        actions = [
            ("DISCOUNT", {"percent": 10}, value * 0.5, "Use a targeted discount to improve sell-through."),
            ("TRANSFER", {"percent_units": 25}, value * 0.25, "Balance stock across locations."),
            ("REORDER", {"quantity": 0}, 0, "Hold new purchasing pending more demand data."),
        ]
    return [Recommendation(rank=i + 1, action_type=a, params=p, expected_outcome=round(o, 2), confidence=82 - i * 6, reasoning=r) for i, (a, p, o, r) in enumerate(actions)]


def generate_recommendations(db: Session, detection, product=None) -> list[Recommendation]:
    """Use configured LLM integration, falling back deterministically."""
    from ..integrations.llm_service import NoLLMConfigured, generate_recommendations as llm_generate, has_llm
    if has_llm():
        try:
            raw = llm_generate(build_prompt(detection, {"product_name": getattr(product, "name", "Unknown")}))
            return [Recommendation.model_validate(item) for item in raw][:3]
        except Exception:
            pass
    return _rule_based_recommendations(detection, product)


def execute_action(db: Session, recommendation: AIRecommendation, selected: Recommendation, current_user=None) -> ExecuteActionResponse:
    """Execute one approved plan and record the prevented waste impact."""
    if recommendation.status != "PENDING":
        raise ValueError("Recommendation is no longer pending")
    batch = db.get(InventoryBatch, recommendation.batch_id)
    product = db.get(Product, recommendation.product_id)
    if not batch or not product:
        raise ValueError("Recommendation inventory no longer exists")
    before_score = 0.0
    action = selected.action_type
    items = int(batch.quantity)
    value = float(recommendation.value_at_risk or 0)
    if action == "DISCOUNT":
        percent = float(selected.params.get("percent", 0))
        product.selling_price = round(float(product.selling_price or 0) * (1 - percent / 100), 2)
        items = max(1, int(batch.quantity * 0.5))
    elif action == "RETURN":
        items = int(batch.quantity)
        batch.quantity = 0
    elif action == "TRANSFER":
        pct = float(selected.params.get("percent_units", 50))
        items = max(1, int(batch.quantity * pct / 100))
        batch.quantity = max(0, batch.quantity - items)
    elif action == "REORDER":
        items = 0
    else:
        raise ValueError(f"Unsupported action type: {action}")
    prevented = round(value * (0.8 if action in ("DISCOUNT", "RETURN") else 0.5), 2)
    db.add(WasteEvent(store_id=recommendation.store_id, product_id=product.id, potential_value=value,
                      intervention_type=action, value_prevented=prevented, actual_waste=0))
    recommendation.status = "EXECUTED"
    recommendation.executed_at = utcnow()
    db.commit()
    return ExecuteActionResponse(waste_prevented=prevented, green_score_delta=0.4, items_cleared=items,
                                 new_status="EXECUTED", intervention=action)
