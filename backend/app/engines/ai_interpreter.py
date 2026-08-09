"""Owner AI Copilot (AI spec §2, §4, §6).

Answers the owner's natural-language questions with the grounded
OBSERVATION → EVIDENCE → INTERPRETATION → RECOMMENDATION → EXPECTED IMPACT
format. The AI never supplies a number: every figure is pulled from the
database through the math engine and embedded in the prompt as facts.

Rule of honesty:
- ``confidence`` is derived from the real data-quality tier (60/80/95), never
  a hardcoded 95.
- ``model_used`` names the real model that produced the answer, or
  ``"rule-based"`` when no LLM is configured / the call failed.
- ``fallback_used`` is True whenever the deterministic engine answered.
- If the question matches no intent, we answer with the store-health intent
  rather than pretending to understand.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..integrations import llm_service
from . import behavior_engine, insight_engine, math_engine
from .analytics import aggregate_lines as _canon_aggregate
from .analytics import comparable_periods as _canon_periods
from .analytics import compare_periods as _canon_compare
from .analytics import load_sales as _canon_load_sales
from .data_quality import confidence_score, tier as dq_tier

logger = logging.getLogger(__name__)

# ───────────────────────────────── intent map ────────────────────────────────

_INTENTS: dict[str, tuple[str, ...]] = {
    "buy": ("buy today", "what to buy", "reorder", "order more", "procure", "restock", "purchase"),
    "sales_drop": ("why did sales", "sales drop", "sales fall", "sales decrease", "dipped", "decline", "went down"),
    "expiry": ("expir", "waste", "at risk", "risk", "sell before", "going bad", "spoil"),
    "profit": ("profit", "making money", "money", "earning", "revenue", "top product", "best selling", "margin"),
    "dead_stock": ("dead stock", "not selling", "slow moving", "slow", "unsold", "stagnant", "no sales"),
    "peak": ("peak", "hour", "6pm", "time of day", "busiest", "when do customers"),
    "best_day": ("best day", "weekday", "weekend", "sunday", "monday", "saturday", "day of week"),
    "discount": ("discount", "markdown", "offer", "promotion", "reduce price", "clear"),
    "stockout": ("stockout", "run out", "out of stock", "coverage", "low stock", "shortage", "empty"),
    "stock_count": ("how many", "in stock", "left in stock", "inventory of", "on hand", "units left"),
    "cross_sell": ("together", "pair", "association", "basket", "cross-sell", "also buy", "combo"),
    "monthly": ("monthly", "month", "trend", "growth", "performance", "progress", "how are we doing"),
    "yesterday": ("yesterday", "today", "daily", "last night", "last 24"),
    "health": ("health", "status", "overview", "summary", "how is my store", "how am i", "doin"),
}


def _detect_intent(question: str) -> str:
    q = question.lower()
    best, best_score = "health", 0
    for key, words in _INTENTS.items():
        score = sum(1 for w in words if w in q)
        if score > best_score:
            best, best_score = key, score
    return best


# ───────────────────────────────── formatters ────────────────────────────────

def _format(observation: str, interpretation: str, recommendation: str, expected_impact: str | None = None) -> str:
    do = recommendation + (f" Expected impact: {expected_impact}." if expected_impact else "")
    return f"WHAT I SEE: {observation}\n\nWHY IT MATTERS: {interpretation}\n\nWHAT TO DO: {do}"


def _money(v: float) -> str:
    return f"₹{v:,.0f}"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ───────────────────────────── intent answer builders ────────────────────────

def _answer_buy(db: Session, sid: Any) -> tuple[str, list[str]]:
    from .opportunity_engine import opportunities_for_store

    opps = opportunities_for_store(db, sid, limit=30)
    reorder = [o for o in opps if o["action"] in ("REORDER", "SELL_FIRST")]
    evidence = [f"Catalog scanned: {len(opps)} products with an action", f"Of those, {len(reorder)} need a restock or clear-first action"]
    if not reorder:
        return _format(
            "No product currently falls below its reorder point.",
            "Every selling product still has enough stock to cover its lead time.",
            "Keep your current order cycle. Re-check tomorrow as stock depletes.",
        ), evidence
    def _cover(m: dict) -> str:
        c = m.get("stock_coverage_days")
        return f"{c} days cover" if c is not None else "out of stock"

    top = reorder[:3]
    for o in top:
        m = o["metrics"]
        evidence.append(
            f"{o['product_name']}: {m['current_stock']} in stock, "
            f"{_cover(m)} vs {m['avg_daily_sales']}/day demand"
        )
    lines = "; ".join(f"{o['product_name']} ({_cover(o['metrics'])})" for o in top)
    exp = reorder[0]
    impact = exp["expected_impact"]
    return _format(
        f"Order today: {lines}. {len(reorder)} products in total are below safe stock.",
        "Coverage below the supplier lead time means a stockout before the next delivery arrives, losing sales on items customers buy daily.",
        f"Place a purchase order for {', '.join(o['product_name'] for o in top)} first.",
        impact,
    ), evidence


def _answer_sales_drop(db: Session, sid: Any) -> tuple[str, list[str]]:
    """Store-level 7d-vs-prior-7d from real invoices (canonical, paise-normalized)."""
    now = _utcnow()
    lines_cur = _canon_load_sales(db, sid, start=now - timedelta(days=7), end=now)
    lines_prev = _canon_load_sales(db, sid, start=now - timedelta(days=14), end=now - timedelta(days=7))
    cur = _canon_aggregate(lines_cur)
    prev = _canon_aggregate(lines_prev)

    u_now = int(cur["units"])
    r_now = float(cur["net_revenue"])
    u_prev = int(prev["units"])
    r_prev = float(prev["net_revenue"])
    data_points = len(lines_cur) + len(lines_prev)
    dq = dq_tier(data_points, 14)

    evidence = [
        f"Revenue last 7 days: {_money(r_now)} vs prior 7 days {_money(r_prev)}",
        f"Units: {u_now} vs {u_prev} across {len(lines_cur)} sale lines",
    ]
    if u_prev == 0:
        return _format(
            "Not enough transaction history to compare the last two weeks.",
            "With sparse data a change between weeks can be noise, not a real drop.",
            "Keep recording every sale — this answer becomes reliable after ~2 weeks of data.",
        ), evidence
    pct = round((u_now - u_prev) / u_prev * 100, 1)
    dropped = pct < 0
    rec = (
        "Open the product report and sort by trend to find which items fell."
        if dropped
        else "The store is actually up — check whether a product or day drove it."
    )
    return _format(
        f"Sales {'dropped' if dropped else 'grew'} {abs(pct):.1f}% week-over-week on {dq} data.",
        "A change that size on this much data is a real signal, not random noise — one product or one day usually drives it.",
        rec,
        "Pin the exact product/day causing the change so you can act precisely.",
    ), evidence


def _answer_expiry(db: Session, sid: Any) -> tuple[str, list[str]]:
    metrics, dq, _ = insight_engine._product_metrics(db, sid)
    expiring = [m for m in metrics if m["expiry_days"] is not None and 0 <= m["expiry_days"] <= 15 and m["stock"] > 0]
    expiring.sort(key=lambda m: m["expiry_days"])
    total_value = round(sum(m["expiring_value"] for m in expiring), 2)
    evidence = [f"{len(expiring)} products expiring within 15 days", f"Value at risk: {_money(total_value)}"]
    if not expiring:
        return _format(
            "No stock currently expires within the next 15 days.",
            "Your batch rotation is keeping shelf life under control.",
            "Keep applying first-expiry-first-out on receiving.",
        ), evidence
    top = expiring[0]
    for m in expiring[:3]:
        evidence.append(f"{m['product'].name}: {m['stock']} units, {m['expiry_days']} days left, ₹{m['expiring_value']}")
    return _format(
        f"{len(expiring)} products have stock expiring in the next 15 days worth {_money(total_value)}; "
        f"the closest is {top['product'].name} in {top['expiry_days']} days.",
        "Unsold units past expiry are written off as waste — the value is lost entirely.",
        f"Discount or sell-first {top['product'].name} (and {len(expiring) - 1} more) today.",
        f"Recover up to {_money(total_value)} instead of writing it off.",
    ), evidence


def _answer_profit(db: Session, sid: Any) -> tuple[str, list[str]]:
    metrics, dq, _ = insight_engine._product_metrics(db, sid)
    movers = sorted([m for m in metrics if m["units_30"] > 0], key=lambda m: m["revenue_30"], reverse=True)
    evidence = [f"Analyzed {len(movers)} products with sales in the last 30 days"]
    if not movers:
        return _format(
            "No product sales recorded in the last 30 days.",
            "Without transactions there is no profit to rank.",
            "Record sales through the POS — the profit analysis activates immediately.",
        ), evidence
    top = movers[:3]
    for m in top:
        evidence.append(f"{m['product'].name}: {_money(m['revenue_30'])} revenue, {m['margin']}% margin")
    names = ", ".join(f"{m['product'].name}" for m in top)
    protection = (
        f"Protect stock of {top[0]['product'].name}; it funds the store."
        if len(top) == 1
        else f"Protect stock of {top[0]['product'].name} and {top[1]['product'].name} first; they fund the store."
    )
    return _format(
        f"Your top revenue drivers are {names}.",
        "Revenue and margin together show what actually earns — high revenue with low margin earns little.",
        protection,
        "Prioritising reorders for your top two drivers prevents lost income.",
    ), evidence


def _answer_dead_stock(db: Session, sid: Any) -> tuple[str, list[str]]:
    metrics, dq, _ = insight_engine._product_metrics(db, sid)
    dead = [m for m in metrics if m["stock"] > 0 and (m["units_30"] == 0 or (m["coverage"] is not None and m["coverage"] >= 60))]
    dead.sort(key=lambda m: m["stock"] * (m["product"].purchase_price or 0), reverse=True)
    value = round(sum(m["stock"] * (m["product"].purchase_price or 0) for m in dead), 2)
    evidence = [f"{len(dead)} products qualify as dead stock", f"Capital tied up: {_money(value)}"]
    if not dead:
        return _format(
            "No product is sitting unsold for 60+ days.",
            "Stock is moving within a healthy window.",
            "Continue monitoring monthly for slow movers.",
        ), evidence
    top = dead[:3]
    for m in top:
        v = round(m["stock"] * (m["product"].purchase_price or 0), 2)
        evidence.append(f"{m['product'].name}: {m['stock']} units, {m['units_30']} sold in 30d, worth {_money(v)}")
    return _format(
        f"{len(dead)} products are dead stock worth {_money(value)} — led by {top[0]['product'].name} ({top[0]['stock']} units).",
        "Dead stock is capital frozen on the shelf that could fund moving inventory.",
        f"Discount or bundle {', '.join(m['product'].name for m in top)}; stop reordering them.",
        f"Free up {_money(value)} of working capital.",
    ), evidence


def _answer_peak(db: Session, sid: Any) -> tuple[str, list[str]]:
    hours = math_engine.hourly_pattern(db, sid, days=30)
    if not hours:
        return _format(
            "No sales data yet to build an hourly pattern.",
            "An hour-by-hour pattern needs transactions spread across the day.",
            "Keep billing — the pattern appears after a few days of sales.",
        ), ["No hour-level sales found"]
    peak = max(hours, key=lambda h: h["units"])
    if peak["units"] == 0:
        return _format("No sales yet — the hourly pattern is empty.", "Empty data cannot show a peak.", "Start selling and it fills in.", None), ["0 units sold across all hours"]
    second = sorted(hours, key=lambda h: h["units"], reverse=True)[1:3]
    evidence = [
        f"Peak hour: {peak['label']} — {peak['units']} units, {_money(peak['revenue'])}",
        "Next busiest: " + ", ".join(f"{h['label']} ({h['units']}u)" for h in second),
    ]
    return _format(
        f"Your peak hour is {peak['label']} ({peak['units']} units, {_money(peak['revenue'])}).",
        "The hour before and after the peak carries the highest stockout and staffing risk.",
        f"Schedule restocking and extra staff around {peak['label']}.",
        "Fewer empty shelves exactly when you sell the most.",
    ), evidence


def _answer_best_day(db: Session, sid: Any) -> tuple[str, list[str]]:
    days = math_engine.weekday_pattern(db, sid, days=60)
    if not days:
        return _format("No weekday data yet.", "A day-of-week pattern needs two or more weeks of sales.", "Keep selling — it appears soon.", None), ["No weekday sales found"]
    best = max(days, key=lambda d: d["revenue"])
    worst = min(days, key=lambda d: d["revenue"])
    evidence = [
        f"Best day: {best['weekday']} — {_money(best['revenue'])} avg",
        f"Slowest: {worst['weekday']} — {_money(worst['revenue'])} avg",
    ]
    return _format(
        f"{best['weekday']} is your strongest day ({_money(best['revenue'])} average) and {worst['weekday']} the quietest.",
        "A predictable weekly rhythm means ordering and staffing can follow it instead of guessing.",
        f"Front-load orders before {best['weekday']} and schedule deliveries for {worst['weekday']}.",
        "Stock the week's demand before it peaks.",
    ), evidence


def _answer_discount(db: Session, sid: Any) -> tuple[str, list[str]]:
    metrics, dq, _ = insight_engine._product_metrics(db, sid)
    candidates = [m for m in metrics if m["stock"] > 0 and ((m["expiry_days"] is not None and m["expiry_days"] <= 7) or m["units_30"] == 0)]
    candidates.sort(key=lambda m: (0 if (m["expiry_days"] is not None and m["expiry_days"] <= 7) else 1, -m["stock"]))
    candidates = candidates[:4]
    evidence = [f"Found {len(candidates)} discount candidates (expiring or unsold)"]
    if not candidates:
        return _format(
            "Nothing currently qualifies for a discount push.",
            "Stock is either selling or has enough time left.",
            "Re-check weekly for slow movers.",
        ), evidence
    for m in candidates:
        evidence.append(f"{m['product'].name}: {m['stock']} units, {m['expiry_days']}d to expiry" if m["expiry_days"] is not None else f"{m['product'].name}: {m['stock']} units, 0 sales in 30d")
    names = ", ".join(m["product"].name for m in candidates)
    return _format(
        f"Discount today: {names}.",
        "Discounting first speeds the sell-through window before expiry and converts idle stock to cash.",
        f"Put a markdown on {candidates[0]['product'].name} first — it has the least time.",
        "Convert expiring stock into revenue instead of write-off.",
    ), evidence


def _answer_stockout(db: Session, sid: Any) -> tuple[str, list[str]]:
    metrics, dq, _ = insight_engine._product_metrics(db, sid)
    risky = [m for m in metrics if m["avg_daily"] > 0 and m["coverage"] is not None and m["coverage"] <= m["lead"]]
    risky.sort(key=lambda m: m["coverage"] or 999)
    evidence = [f"{len(risky)} products below their safe stock level"]
    if not risky:
        return _format(
            "Every selling product still has enough cover for its lead time.",
            "Your stock levels are healthy relative to demand.",
            "Keep your current reorder discipline.",
        ), evidence
    for m in risky[:3]:
        evidence.append(f"{m['product'].name}: {m['stock']} units, {m['coverage']}d cover, {m['lead']}d lead time")
    names = ", ".join(m["product"].name for m in risky[:3])
    return _format(
        f"{len(risky)} products risk a stockout, led by {names}.",
        "When coverage is below the supplier lead time the shelf goes empty before the next delivery arrives.",
        f"Reorder {names} today.",
        "Never miss a sale on products customers buy daily.",
    ), evidence


def _answer_cross_sell(db: Session, sid: Any) -> tuple[str, list[str]]:
    assoc = behavior_engine.associations(db, sid, days=60)
    rules = assoc.get("association_rules", [])
    evidence = [f"Analyzed {assoc.get('n_baskets', 0)} baskets"]
    if not rules:
        return _format(
            "No strong co-purchase pattern yet.",
            "Associations need enough baskets where the two products appear together.",
            "Keep selling — the pattern strengthens with volume.",
        ), evidence
    r = rules[0]
    conf = round(r.get("confidence_a_to_b", 0) * 100)
    evidence.append(f"{r['product_a_name']} + {r['product_b_name']}: {r['co_purchases']} co-purchases, {conf}% confidence, lift {r['lift']}")
    return _format(
        f"Buyers of {r['product_a_name']} also take {r['product_b_name']} {conf}% of the time ({r['co_purchases']} co-purchases).",
        "An observed co-purchase pattern is a free basket-growth lever — no marketing spend required.",
        f"Suggest {r['product_b_name']} at checkout when {r['product_a_name']} is scanned, and place them side by side.",
        "Larger baskets from the same number of customers.",
    ), evidence


def _answer_monthly(db: Session, sid: Any) -> tuple[str, list[str]]:
    m = math_engine.monthly_trend_engine(db, sid)
    d30 = m.get("days_30", {})
    sg = d30.get("sales_growth_pct")
    pg = d30.get("profit_growth_pct")
    sg_txt = f"{sg:+.1f}%" if sg is not None else "insufficient data"
    pg_txt = f"{pg:+.1f}%" if pg is not None else "insufficient data"
    evidence = [
        f"30-day sales growth: {sg_txt}",
        f"30-day profit growth: {pg_txt}",
    ]
    if sg is None:
        return _format(
            "Not enough history to compare this month against the last.",
            "A monthly trend needs a full prior month of data.",
            "Check again after a month of billing.",
        ), evidence
    direction = "up" if sg >= 0 else "down"
    return _format(
        f"Sales are {direction} {abs(sg):.1f}% this month vs last; profit {pg:+.1f}%.",
        "When sales and profit move together the store is healthy; when they diverge, margins are eroding.",
        "If profit trails sales, review purchase prices and discounting.",
        "Protect margin while revenue grows.",
    ), evidence


def _answer_yesterday(db: Session, sid: Any) -> tuple[str, list[str]]:
    daily = math_engine.daily_sales_engine(db, sid)
    today = daily.get("today", {})
    yesterday = daily.get("yesterday", {})
    profit = today.get("profit")
    profit_txt = _money(profit) if profit is not None else "no cost baseline"
    evidence = [
        f"Today: {_money(today.get('revenue', 0))} revenue, {today.get('orders', 0)} orders, {profit_txt} profit",
        f"Yesterday: {_money(yesterday.get('revenue', 0))} revenue, {yesterday.get('orders', 0)} orders",
    ]
    if today.get("orders", 0) == 0 and yesterday.get("orders", 0) == 0:
        return _format(
            "No sales yet today or yesterday.",
            "The store has not recorded transactions in this window.",
            "Billing a sale will populate the daily report.",
        ), evidence

    # Equal-elapsed-window comparison: today 00:00→now vs yesterday 00:00→the
    # same clock time. Comparing partial today against yesterday's FULL day
    # would fabricate a ~-99% drop every morning before the store catches up.
    cur_p, prev_p = _canon_periods("today")
    cmp = _canon_compare(cur_p, prev_p, _canon_load_sales(db, sid))
    rev_now = float(cmp["current"]["net_revenue"])
    rev_prev = float(cmp["previous"]["net_revenue"])
    delta = cmp["net_revenue_growth_pct"]
    delta_txt = f"{delta:+.1f}%" if delta is not None else "no same-time baseline yesterday"
    return _format(
        f"Today is at {_money(rev_now)} across {today.get('orders', 0)} orders — {delta_txt} vs the same time yesterday ({_money(rev_prev)}).",
        "Day-to-day momentum shows whether the week is tracking toward or away from your daily target.",
        "If the day is behind, push your best-selling items on the counter display.",
        "Recover the day before it closes.",
    ), evidence


def _answer_health(db: Session, sid: Any) -> tuple[str, list[str]]:
    a = math_engine.store_analytics(db, sid)
    growth = a.get("revenue_growth_pct")
    growth_txt = f"{growth:+.1f}% vs prior period" if growth is not None else "no prior period to compare"
    evidence = [
        f"Revenue: {_money(a['total_revenue'])} ({growth_txt})",
        f"Transactions: {a['total_transactions']} · Units: {a['total_units_sold']} · Avg basket: {_money(a['avg_basket_value'])}",
        f"Inventory value: {_money(a['total_inventory_value'])} · At risk: {_money(a['at_risk_value'])}",
    ]
    if a["total_transactions"] == 0:
        return _format(
            "Your store is live but has no recorded sales yet.",
            "The dashboard, analytics and AI all activate from real transactions.",
            "Ring up a sale at the POS — the entire system starts learning immediately.",
            "Every AI feature becomes accurate as history accumulates.",
        ), evidence
    healthy_growth = growth is None or growth >= 0
    health = "healthy" if healthy_growth and a["at_risk_value"] < a["total_inventory_value"] * 0.1 else "needs attention"
    return _format(
        f"Your store is {health}: {_money(a['total_revenue'])} revenue ({growth_txt}) "
        f"from {a['total_transactions']} transactions across {a['product_count']} products.",
        f"Inventory is worth {_money(a['total_inventory_value'])} with {_money(a['at_risk_value'])} at expiry risk — that is the main value to protect.",
        "Review today's AI insights for the specific items to act on.",
        "Protect margin while revenue grows.",
    ), evidence


def _answer_stock_count(db: Session, sid: Any, question: str) -> tuple[str, list[str]]:
    """Per-product on-hand count from the live batch ledger (real, never estimated)."""
    metrics, dq, _ = insight_engine._product_metrics(db, sid)
    q = question.lower()

    def _overlap(name: str) -> int:
        words = {w for w in name.replace("-", " ").replace("_", " ").split() if len(w) >= 3}
        return sum(1 for w in words if w in q)

    best, best_score = None, 0
    for m in metrics:
        name = (m["product"].name or "").lower()
        if not name:
            continue
        # A full-name substring is the strongest signal; otherwise the product
        # whose significant name words appear most in the question.
        score = 100000 if name in q else _overlap(name)
        if score > best_score:
            best, best_score = m, score

    if best is not None:
        p = best["product"]
        evidence = [f"Live on-hand stock for {p.name}: {best['stock']} units across open batches"]
        return _format(
            f"You have {best['stock']} units of {p.name} in stock right now.",
            "This is the real on-hand count — every receipt adds and every POS sale deducts from the batch ledger.",
            f"If {best['stock']} is below your daily need, reorder from the supplier.",
            None,
        ), evidence

    total = sum(m["stock"] for m in metrics)
    evidence = [f"Total on-hand units across {len(metrics)} products: {total}"]
    return _format(
        f"Your store currently holds {total} units across {len(metrics)} products.",
        "This is the real sum of every live inventory batch.",
        "Name a product — e.g. 'how many milk packets?' — to get a single product's count.",
        None,
    ), evidence


_ANSWER_BUILDERS: dict[str, Any] = {
    "buy": _answer_buy,
    "sales_drop": _answer_sales_drop,
    "expiry": _answer_expiry,
    "profit": _answer_profit,
    "dead_stock": _answer_dead_stock,
    "peak": _answer_peak,
    "best_day": _answer_best_day,
    "discount": _answer_discount,
    "stockout": _answer_stockout,
    "cross_sell": _answer_cross_sell,
    "monthly": _answer_monthly,
    "yesterday": _answer_yesterday,
    "health": _answer_health,
    "stock_count": _answer_stock_count,
}


# ───────────────────────────── LLM enhancement path ──────────────────────────

def _llm_answer(question: str, intent: str, answer: str, evidence: list[str], dq: str) -> dict | None:
    """Best-effort LLM rewrite of the grounded answer. Returns None on any failure."""
    facts = "\n".join(f"- {e}" for e in evidence)
    system = (
        "You are GREEN QUANT AI, a production-grade AI intelligence layer consisting of two specialized engines:\n"
        "1. DATA ANALYST AI: You receive verified database facts and perform objective interpretation without inventing numbers.\n"
        "2. BEHAVIORAL RETAIL INTELLIGENCE AI: You study purchasing behavior, timing, price sensitivity, and urgency without ever pretending to diagnose customers psychologically.\n\n"
        "You are given verified database facts and a draft answer. Rewrite it in plain, confident owner-friendly language using the "
        "exact structure below and ONLY the facts provided — NEVER add, estimate, or round numbers "
        "that are not in the facts. If a fact is missing, do not invent it. Your logic flows: Raw transactions → Math Engine → Data Analyst AI → Behavioral AI → Recommendation Engine.\n\n"
        "Return JSON: {\"answer\": \"...\"} where answer contains three sections separated by blank "
        "lines, each starting on its own line with exactly 'WHAT I SEE: ', 'WHY IT MATTERS: ', "
        "'WHAT TO DO: '."
    )
    user = f"Intent: {intent}\nQuestion: {question}\n\nVerified facts:\n{facts}\n\nDraft answer:\n{answer}"
    try:
        out = llm_service.generate_json(system, user, tier="medium")
    except Exception:  # noqa: BLE001 — any failure degrades to the grounded answer
        return None
    text = (out or {}).get("answer") or (out or {}).get("response") or ""
    if not isinstance(text, str) or "WHAT I SEE" not in text or "WHAT TO DO" not in text:
        return None
    return {"answer": text, "model": llm_service.current_model("medium")}


# ─────────────────────────────── public entry point ──────────────────────────

def answer_owner_question(db: Session, store_id: Any, question: str, include_products: bool = True, include_behavior: bool = True) -> dict:
    intent = _detect_intent(question)
    builder = _ANSWER_BUILDERS.get(intent, _answer_health)
    if intent == "stock_count":
        # The count builder needs the question to identify which product.
        answer, evidence = _answer_stock_count(db, store_id, question)
    else:
        answer, evidence = builder(db, store_id)

    # Honest data-quality tier for this store — the base for confidence.
    _metrics, dq, _ = insight_engine._product_metrics(db, store_id)
    del _metrics

    model_used, fallback_used = "rule-based", True
    if llm_service.has_llm():
        enhanced = _llm_answer(question, intent, answer, evidence, dq)
        if enhanced:
            answer, model_used, fallback_used = enhanced["answer"], enhanced["model"], False

    return {
        "answer": answer,
        "evidence_used": evidence,
        "confidence": confidence_score(dq),
        "data_quality": dq,
        "fallback_used": fallback_used,
        "model_used": model_used,
    }


# ───────────────────────── briefing narrative & insight text ─────────────────

def generate_briefing_narrative(data: dict) -> str:
    """A one-paragraph morning briefing written from the real briefing numbers."""
    sales = (data.get("sections") or {}).get("sales", {})
    inv = (data.get("sections") or {}).get("inventory", {})
    today = sales.get("today", {}) or {}
    rev = today.get("revenue") or 0
    orders = today.get("orders") or 0
    stock_value = inv.get("stock_value") or 0
    expiring = inv.get("expiring_value") or 0
    low = inv.get("low_stock_products") or 0
    actions = data.get("important_actions") or 0

    parts = [
        f"Good morning. You are at ₹{rev:,.0f} revenue today across {orders} orders.",
        f"Inventory on hand is worth ₹{stock_value:,.0f}, with ₹{expiring:,.0f} at expiry risk and {low} products running low.",
    ]
    if actions:
        parts.append(f"{actions} action(s) need you today — see the top actions below.")
    else:
        parts.append("No urgent actions right now — keep the current rhythm.")
    return " ".join(parts)


def interpret_insight(insight: dict) -> str:
    """Plain-language version of a single insight for the explanation UI."""
    title = insight.get("title") or "Insight"
    rec = insight.get("recommendation") or ""
    why = insight.get("explanation") or insight.get("evidence") and str(insight["evidence"]) or ""
    if rec:
        return f"{title}. {rec}" + (f" Why: {why}." if why else "")
    return f"{title}. Why: {why}." if why else str(insight)
