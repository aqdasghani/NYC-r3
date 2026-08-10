"""Pytest fixtures — isolated SQLite DB + one seeded TestClient per session.

Design:
- ``DATABASE_URL`` is pointed at a throwaway SQLite file *before* any app module
  is imported, so the whole app (engine, SessionLocal, lifespan seed) runs on the
  test DB and never touches ``greenshop.db``.
- ``DISABLE_SCHEDULER`` stops the APScheduler background job during tests.
- A single session-scoped ``client`` seeds the full demo once (~7k rows). Tests
  share it, so assertions are written order-tolerant (the boot-state invariants
  are verified in an autouse fixture the moment seeding completes, before any
  test can mutate state).
- Engine unit tests use their own in-memory engine via ``memdb``.
"""
from __future__ import annotations

import os
import pathlib
import tempfile

_TEST_DIR = pathlib.Path(tempfile.mkdtemp(prefix="greenshop-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DIR / 'test.db'}"
os.environ["DISABLE_SCHEDULER"] = "true"
os.environ["SEED_WITH_SYNTHETIC_DATA"] = "true"
os.environ["OPENAI_API_KEY"] = ""  # force rule-based AI, no network in tests

import pytest  # noqa: E402
import sqlalchemy as sa  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.main import app  # noqa: E402
from app.models.database import Base, SessionLocal  # noqa: E402


@pytest.fixture(scope="session")
def client():
    """Seeded TestClient (app lifespan: create_all -> seed_if_empty)."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def owner_headers(client):
    r = client.post("/api/auth/login", json={"email": "rahul@greenshop.ai", "password": "demo1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def manager_headers(client):
    r = client.post("/api/auth/login", json={"email": "priya@greenshop.ai", "password": "demo1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def biller_headers(client):
    r = client.post("/api/auth/login", json={"email": "neha@greenshop.ai", "password": "demo1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def staff_headers(client):
    r = client.post("/api/auth/login", json={"email": "amit@greenshop.ai", "password": "demo1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def db(client):
    """A session to the seeded test DB for direct assertions."""
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="session", autouse=True)
def _verify_boot_state(client, db):
    """The demo's curated boot state must hold *before* any test mutates data."""
    from app.models.database import AIRecommendation

    pending = db.scalars(sa.select(AIRecommendation).where(
        AIRecommendation.status == "PENDING")).all()
    assert len(pending) == 5, f"expected 5 seeded PENDING recs, got {len(pending)}"
    from collections import Counter
    by_type = Counter(r.risk_type for r in pending)
    assert by_type["Expiry Risk"] == 2 and by_type["Waste Risk"] == 1
    assert by_type["Overstock"] == 1 and by_type["Demand Spike"] == 1
    yield


@pytest.fixture
def memdb():
    """Fresh in-memory DB per test for engine unit tests (no seed)."""
    engine = sa.create_engine(
        "sqlite://", poolclass=sa.pool.StaticPool, connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
