"""Dashboard/analytics endpoints — order-tolerant assertions against the seeded demo."""
import pytest

from app.models.database import AIRecommendation


def test_dashboard_kpis_match_seeded_demo(client, owner_headers):
    r = client.get("/api/analytics/dashboard", headers=owner_headers)
    assert r.status_code == 200
    kpis = r.json()["kpis"]
    assert kpis["product_count"] == 1284
    assert kpis["at_risk_count"] == 37
    assert kpis["expired_count"] == 8
    assert kpis["expired_value"] == pytest.approx(2160.0)
    # executed test actions only *grow* waste prevented; seeded baseline is ₹7,240
    assert kpis["waste_prevented_mtd"] >= 7240.0
    assert 15000 < kpis["at_risk_value"] < 25000
    assert kpis["inventory_value"] > 2_000_000


def test_dashboard_donut_matches_seeded_demo(client, owner_headers):
    r = client.get("/api/analytics/dashboard", headers=owner_headers)
    donut = {seg["name"]: seg["value"] for seg in r.json()["donut"]}
    assert donut == {
        "Good Stock": 1012, "Near Expiry": 37, "Expired": 8,
        "Low Stock": 21, "Overstock": 14, "Dead Stock": 192,
    }
    assert sum(donut.values()) == 1284


def test_dashboard_green_score_in_band(client, owner_headers):
    r = client.get("/api/analytics/dashboard", headers=owner_headers)
    gs = r.json()["green_score"]
    assert 80 <= gs["score"] <= 90
    assert len(gs["breakdown"]) == 4
    assert gs["breakdown"][0]["name"] == "Expiry Prevention"
    # weights sum to 1.0
    assert sum(c["weight"] for c in gs["breakdown"]) == pytest.approx(1.0)


def test_dashboard_expiry_timeline_has_five_buckets(client, owner_headers):
    r = client.get("/api/analytics/dashboard", headers=owner_headers)
    buckets = {b["label"]: b["items"] for b in r.json()["expiry_timeline"]}
    assert list(buckets.keys()) == ["0-3", "4-7", "8-15", "16-30", "30+"]
    assert buckets["0-3"] == 9
    assert buckets["4-7"] == 14
    assert buckets["8-15"] == 14
    assert buckets["30+"] >= 1000


def test_dashboard_briefing_counts_pending(client, owner_headers):
    r = client.get("/api/analytics/dashboard", headers=owner_headers)
    brief = r.json()["daily_brief"]
    assert brief["important_actions"] >= 5  # seeded 5; tests only add then clear


def test_waste_prevented_total_and_series(client, owner_headers):
    r = client.get("/api/analytics/waste-prevented", headers=owner_headers)
    assert r.status_code == 200
    assert r.json()["total"] >= 7240.0
    assert len(r.json()["series"]) == 30


def test_stock_health_six_segments(client, owner_headers):
    r = client.get("/api/analytics/stock-health", headers=owner_headers)
    assert r.status_code == 200
    assert len(r.json()) == 6
    assert all(seg["color"] for seg in r.json())


def test_sales_trend_endpoint(client, owner_headers):
    r = client.get("/api/analytics/sales-trend", headers=owner_headers)
    assert r.status_code == 200
    assert len(r.json()) == 30


def test_briefing_endpoint(client, owner_headers):
    r = client.get("/api/analytics/briefing", headers=owner_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["important_actions"] >= 5
    assert body["est_impact"] > 0
    assert len(body["sections"]) == 4


def test_staff_can_read_dashboard(client, staff_headers):
    r = client.get("/api/analytics/dashboard", headers=staff_headers)
    assert r.status_code == 200
