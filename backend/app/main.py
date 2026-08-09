"""GreenShop AI — FastAPI application factory and entry point.

Boot sequence (lifespan): create tables -> seed demo data if empty -> stash the
event loop for the scheduler -> start the background detection job.
"""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .models.database import create_all
from .routers import ai_actions, ai_intelligence, analytics, auth, green_score, inventory, procurement, receiving, reports, sales, stores, suppliers, whatsapp, ws, transfers, returns
from .scheduler import shutdown as scheduler_shutdown
from .scheduler import set_loop, start as start_scheduler
from .seed import seed_if_empty

_loop: asyncio.AbstractEventLoop | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_all()
    seed_result = {}
    if settings.SEED_DEMO:
        seed_result = seed_if_empty()
        if seed_result.get("seeded"):
            print(f"[GreenShop AI] Seeded demo data: {seed_result}")
    else:
        print("[GreenShop AI] SEED_DEMO=false — booting with an empty database (real onboarding).")
    global _loop
    _loop = asyncio.get_running_loop()
    set_loop(_loop)
    start_scheduler()
    yield
    scheduler_shutdown()


app = FastAPI(
    title="GreenShop AI",
    version="0.1.0",
    description="AI-powered inventory & waste-prevention platform for small Indian retailers.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers (all under /api/*)
app.include_router(auth.router)
app.include_router(inventory.router)
app.include_router(procurement.router)
app.include_router(sales.router)
app.include_router(receiving.router)
app.include_router(suppliers.router)
app.include_router(ai_actions.router)
app.include_router(ai_intelligence.router)
app.include_router(green_score.router)
app.include_router(analytics.router)
app.include_router(reports.router)
app.include_router(whatsapp.router)
app.include_router(stores.router)
app.include_router(transfers.router)
app.include_router(returns.router)
# WebSocket channel (no /api prefix — browsers can't set headers on WS upgrade)
app.include_router(ws.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": "0.1.0"}


@app.get("/")
def root():
    return {"name": settings.APP_NAME, "docs": "/docs", "health": "/api/health"}
