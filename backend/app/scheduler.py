"""Background APScheduler job — re-runs risk detection every 15 minutes and
pushes any new recommendations to connected dashboards over WebSocket.

Gotcha: APScheduler runs jobs in a worker thread, while WebSocket broadcasts
must happen on the event loop. ``set_loop`` stores the main asyncio loop at
startup (from the FastAPI lifespan) and we hop threads with
``asyncio.run_coroutine_threadsafe``.
"""
from __future__ import annotations

import asyncio

from apscheduler.schedulers.background import BackgroundScheduler

from .config import settings
from .ws import make_event, manager

scheduler = BackgroundScheduler()
_loop: asyncio.AbstractEventLoop | None = None


def set_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Store the main event loop so the scheduler thread can broadcast safely."""
    global _loop
    _loop = loop


def run_detection_job() -> None:
    """One detection sweep across every active store, then broadcast results."""
    from sqlalchemy import select

    from .engines.detection_engine import run_detection
    from .models.database import SessionLocal, Store

    db = SessionLocal()
    try:
        store_ids = db.scalars(select(Store.id).where(Store.is_active.is_(True))).all()
        for store_id in store_ids:
            summary = run_detection(db, store_id)
            if summary["recommendations_created"] and _loop is not None:
                future = asyncio.run_coroutine_threadsafe(
                    manager.broadcast(str(store_id), make_event("recommendation_created", summary)), _loop
                )
                try:
                    future.result(timeout=5)
                except Exception:
                    pass
    finally:
        db.close()


def start() -> None:
    """Start the background scheduler unless disabled via env var."""
    if settings.DISABLE_SCHEDULER:
        return
    if scheduler.running:
        return
    scheduler.add_job(
        run_detection_job,
        "interval",
        minutes=settings.DETECTION_INTERVAL_MINUTES,
        id="risk-detection",
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()


def shutdown() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
