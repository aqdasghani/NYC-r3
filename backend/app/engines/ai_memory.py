"""AI memory and the recommendation feedback loop (AI spec §9, §10, §26).

The AI does not permanently "remember" anything itself. Every decision the
owner makes (accept / reject / execute a recommendation) and every AI request
is recorded as a *structured event* in the database, so the system can learn
from outcomes:

    AI recommends  →  owner accepts/rejects  →  action  →  outcome measured

``measure_outcome`` compares a product's sales velocity in the 7 days after a
decision against the 7 days before it — the change is stored as the outcome,
and future recommendations can cite it.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models.database import AIDecision, AILog, Invoice, InvoiceItem, Product

# Decisions that mean "the owner actually did something".
APPLIED = {"ACCEPTED", "EXECUTED"}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def record_decision(
    db: Session,
    store_id: uuid.UUID,
    *,
    action_type: str,
    decision: str,
    product_id: uuid.UUID | None = None,
    product_name: str | None = None,
    recommendation_id: uuid.UUID | None = None,
    notes: str = "",
) -> AIDecision:
    row = AIDecision(
        store_id=store_id,
        product_id=product_id,
        product_name=product_name,
        recommendation_id=recommendation_id,
        action_type=action_type,
        decision=decision.upper(),
        notes=notes,
    )
    db.add(row)
    db.commit()
    return row


def list_decisions(db: Session, store_id: uuid.UUID, limit: int = 50) -> list[dict]:
    rows = db.scalars(
        select(AIDecision).where(AIDecision.store_id == store_id).order_by(AIDecision.created_at.desc()).limit(limit)
    ).all()
    return [_decision_dict(r) for r in rows]


def _decision_dict(r: AIDecision) -> dict:
    return {
        "id": str(r.id),
        "product_id": str(r.product_id) if r.product_id else None,
        "product_name": r.product_name,
        "recommendation_id": str(r.recommendation_id) if r.recommendation_id else None,
        "action_type": r.action_type,
        "decision": r.decision,
        "notes": r.notes,
        "outcome": r.outcome,
        "created_at": r.created_at.isoformat(),
    }


def measure_outcome(db: Session, store_id: uuid.UUID, decision_id: uuid.UUID) -> dict:
    """Compare product velocity 7d before vs 7d after a decision.

    Returns the measured outcome dict, or a ``status: "PENDING"`` result when
    fewer than 7 days have elapsed since the decision (we never guess).
    """
    row = db.get(AIDecision, decision_id)
    if not row or row.store_id != store_id:
        return {"status": "NOT_FOUND", "error": "Decision not found for this store"}
    if not row.product_id:
        return {"status": "UNAVAILABLE", "error": "Decision is not product-scoped; outcome cannot be measured"}

    now = _utcnow()
    after_start = row.created_at
    after_end = after_start + timedelta(days=7)
    before_start = after_start - timedelta(days=7)

    if now < after_end:
        row.outcome = {"status": "PENDING", "message": "Fewer than 7 days since the decision — outcome not yet measurable."}
        db.commit()
        return row.outcome

    def _units(start: datetime, end: datetime) -> int:
        return int(
            db.scalar(
                select(func.coalesce(func.sum(InvoiceItem.quantity), 0))
                .join(Invoice)
                .where(
                    Invoice.store_id == store_id,
                    InvoiceItem.product_id == row.product_id,
                    Invoice.created_at >= start,
                    Invoice.created_at < end,
                )
            )
            or 0
        )

    before = _units(before_start, after_start)
    after = _units(after_start, after_end)
    delta_pct = round((after - before) / before * 100, 1) if before > 0 else (100.0 if after > 0 else 0.0)

    outcome = {
        "status": "MEASURED",
        "before_7d_units": before,
        "after_7d_units": after,
        "delta_pct": delta_pct,
        "interpretation": (
            f"Sales of {row.product_name or 'this product'} changed {delta_pct:+.0f}% in the 7 days after the "
            f"decision (before: {before} units, after: {after} units)."
        ),
        "measured_at": now.isoformat(),
    }
    row.outcome = outcome
    db.commit()
    return outcome


def log_ai(
    db: Session,
    store_id: uuid.UUID,
    *,
    feature: str,
    model: str,
    prompt_version: str = "v1",
    request_summary: str = "",
    response_summary: str = "",
    ok: bool = True,
) -> AILog:
    row = AILog(
        store_id=store_id,
        feature=feature,
        model=model,
        prompt_version=prompt_version,
        request_summary=(request_summary or "")[:500],
        response_summary=(response_summary or "")[:500],
        ok=ok,
    )
    db.add(row)
    db.commit()
    return row
