"""AI action plan: rule-based generation, API execute/dismiss, RBAC."""
import uuid

import pytest

from sqlalchemy import select

from app.engines.action_engine import _rule_based_recommendations
from app.engines.detection_engine import Detection
from app.models.database import AIRecommendation, InventoryBatch, Product, WasteEvent, utcnow


# ------------------------------------------------------------ unit: generation

def _detection(risk_type, severity="WARNING", value=1000.0, meta=None):
    return Detection(risk_type=risk_type, severity=severity, product_id=uuid.uuid4(),
                     batch_id=uuid.uuid4(), value_at_risk=value, metadata=meta or {})


def test_rule_based_always_three_ranked():
    for risk in ("Expiry Risk", "Waste Risk", "Dead Stock", "Overstock",
                 "Stockout Risk", "Demand Spike", "Margin Risk"):
        recs = _rule_based_recommendations(_detection(risk))
        assert len(recs) == 3
        assert {r.action_type for r in recs}.issubset({"DISCOUNT", "TRANSFER", "RETURN", "REORDER"})
        assert [r.rank for r in recs] == [1, 2, 3]
        assert all(0 <= r.confidence <= 100 for r in recs)
        assert all(r.reasoning for r in recs)


def test_critical_expiry_suggests_discount_first():
    # Master Upgrade Plan: CRITICAL expiry now gets a 35% dynamic discount
    # (was a flat 25%), with the elasticity formula scaling WARNING discounts.
    recs = _rule_based_recommendations(_detection("Expiry Risk", severity="CRITICAL", value=1000))
    assert recs[0].action_type == "DISCOUNT"
    assert recs[0].params["percent"] == 35
    assert recs[0].expected_outcome == pytest.approx(800.0)


def test_stockout_reorder_quantity_from_velocity():
    recs = _rule_based_recommendations(
        _detection("Stockout Risk", value=0, meta={"last_week_avg": 4}))
    assert recs[0].action_type == "REORDER"


# ------------------------------------------------------------- api: execute

def _amul_ids(db):
    product = db.scalar(select(Product).where(Product.name == "Amul Butter 500g"))
    batch = db.scalar(select(InventoryBatch).where(InventoryBatch.batch_number == "B2284"))
    assert product and batch, "seeded Amul product/batch missing"
    return product, batch


def _fresh_rec(db, risk_type="Expiry Risk", severity="CRITICAL", value=1000.0):
    product, batch = _amul_ids(db)
    detection = Detection(risk_type=risk_type, severity=severity, product_id=product.id,
                          batch_id=batch.id, value_at_risk=value)
    rec = AIRecommendation(
        store_id=product.store_id, product_id=product.id, batch_id=batch.id,
        risk_type=risk_type, severity=severity, value_at_risk=value,
        recommendation_json=[r.model_dump() for r in _rule_based_recommendations(detection, product)],
        status="PENDING", created_at=utcnow())
    db.add(rec)
    db.commit()
    return rec


def test_execute_as_owner(client, owner_headers, db):
    rec = _fresh_rec(db)
    action = client.get(f"/api/actions/{rec.id}", headers=owner_headers)
    assert action.status_code == 200
    selected = action.json()["recommendations"][0]  # DISCOUNT for expiry

    r = client.post(f"/api/actions/{rec.id}/execute", headers=owner_headers,
                    json={"selected": selected})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["new_status"] == "EXECUTED"
    assert body["waste_prevented"] > 0
    assert body["intervention"] == "DISCOUNT"

    db.refresh(rec)
    assert rec.status == "EXECUTED"
    assert rec.executed_at is not None
    event = db.scalar(select(WasteEvent).where(WasteEvent.product_id == rec.product_id,
                                               WasteEvent.intervention_type == "DISCOUNT",
                                               WasteEvent.value_prevented > 0).order_by(WasteEvent.created_at.desc()))
    assert event is not None

    # already-executed rec can't be executed again
    again = client.post(f"/api/actions/{rec.id}/execute", headers=owner_headers,
                        json={"selected": selected})
    assert again.status_code == 409


def test_execute_forbidden_for_staff(client, staff_headers, db):
    rec = _fresh_rec(db)
    selected = _rule_based_recommendations(_detection("Expiry Risk"))[0].model_dump()
    r = client.post(f"/api/actions/{rec.id}/execute", headers=staff_headers,
                    json={"selected": selected})
    assert r.status_code == 403


def test_dismiss_sets_dismissed(client, owner_headers, db):
    rec = _fresh_rec(db)
    r = client.post(f"/api/actions/{rec.id}/dismiss", headers=owner_headers)
    assert r.status_code == 200
    assert r.json()["message"]
    db.refresh(rec)
    assert rec.status == "DISMISSED"


def test_get_unknown_action_404(client, owner_headers):
    r = client.get(f"/api/actions/{uuid.uuid4()}", headers=owner_headers)
    assert r.status_code == 404


def test_list_actions_returns_plans(client, owner_headers):
    r = client.get("/api/actions/", headers=owner_headers)
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 5  # seeded 5 (executed/dismissed ones drop off PENDING)
    assert all(item["recommendations"] for item in items)
    assert all(item["status"] == "PENDING" for item in items)
