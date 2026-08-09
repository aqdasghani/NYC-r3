"""Optional LLM integration. Any missing key or malformed response raises a
controlled exception so the action engine can use its deterministic rules.

Demo-safety guards (the app must never stall on the network):
- ``has_llm()`` only counts a *plausible* OpenAI key (``sk-`` prefix) so a bogus
  placeholder like "omniroute" never triggers a live call.
- A failure cooldown circuit-breaker skips further network calls for a while
  after any error (bad key, no internet, timeout), degrading to rule-based fast.
- The OpenAI client is built with no retries and a short timeout.
"""
from __future__ import annotations

import json
import time

from ..config import settings


class NoLLMConfigured(RuntimeError):
    pass


# Circuit breaker: after a failed LLM call, skip the network for this long.
_COOLDOWN_SECONDS = 300
_last_failure: float = 0.0


def _mark_failure() -> None:
    global _last_failure
    _last_failure = time.time()


def _in_cooldown() -> bool:
    return (time.time() - _last_failure) < _COOLDOWN_SECONDS


def has_llm() -> bool:
    """True only if a *plausible* provider key is configured and not cooling down."""
    if _in_cooldown():
        return False
    openai_ok = bool(settings.OPENAI_API_KEY) and settings.OPENAI_API_KEY.startswith("sk-")
    return openai_ok or bool(settings.GEMINI_API_KEY)


def _validate(raw) -> list[dict]:
    if isinstance(raw, dict):
        raw = raw.get("recommendations", raw.get("actions", []))
    if not isinstance(raw, list) or len(raw) < 3:
        raise ValueError("LLM did not return three recommendations")
    allowed = {"DISCOUNT", "TRANSFER", "RETURN", "REORDER"}
    out = []
    for index, item in enumerate(raw[:3], 1):
        if item.get("action_type") not in allowed:
            raise ValueError("Invalid action type")
        out.append({
            "rank": index,
            "action_type": item["action_type"],
            "params": item.get("params", {}),
            "expected_outcome": float(item.get("expected_outcome", 0)),
            "confidence": max(0, min(100, float(item.get("confidence", 70)))),
            "reasoning": str(item.get("reasoning", "AI recommendation")),
        })
    return out


def generate_recommendations(prompt: str) -> list[dict]:
    """Call a live LLM, or raise NoLLMConfigured to trigger the rule fallback."""
    if _in_cooldown():
        raise NoLLMConfigured("LLM cooling down after a previous failure")
    try:
        if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.startswith("sk-"):
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=6.0, max_retries=0)
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": "Return exactly three ranked actions as JSON."},
                ],
            )
            return _validate(json.loads(response.choices[0].message.content or "{}"))
        if settings.GEMINI_API_KEY:
            import httpx
            response = httpx.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent",
                params={"key": settings.GEMINI_API_KEY},
                json={"contents": [{"parts": [{"text": prompt + "\nReturn exactly three ranked actions as JSON."}]}]},
                timeout=6,
            )
            response.raise_for_status()
            text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
            text = text.replace("```json", "").replace("```", "").strip()
            return _validate(json.loads(text))
    except NoLLMConfigured:
        raise
    except Exception as exc:  # noqa: BLE001 — any failure trips the breaker
        _mark_failure()
        raise NoLLMConfigured(str(exc)) from exc
    raise NoLLMConfigured("No OpenAI or Gemini API key configured")
