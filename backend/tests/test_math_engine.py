import pytest
from app.engines.math_engine import *

def test_calculate_revenue():
    assert calculate_revenue(10.5, 2) == 21.0
    assert calculate_revenue(0, 5) == 0.0
    assert calculate_revenue(10, 0) == 0.0

def test_calculate_gross_profit():
    assert calculate_gross_profit(20.0, 10.0, 2) == 20.0
    assert calculate_gross_profit(0.0, 10.0, 1) == -10.0
    assert calculate_gross_profit(10.0, 10.0, 5) == 0.0

def test_calculate_margin():
    assert calculate_margin(100.0, 80.0) == 20.0
    assert calculate_margin(0.0, 50.0) == 0.0
    assert calculate_margin(50.0, 100.0) == -100.0

def test_calculate_aov():
    assert calculate_aov(100.0, 4) == 25.0
    assert calculate_aov(0.0, 5) == 0.0
    assert calculate_aov(100.0, 0) == 0.0

def test_calculate_inventory_value():
    assert calculate_inventory_value([10, 20], [5.0, 2.5]) == 100.0
    assert calculate_inventory_value([], []) == 0.0
    assert calculate_inventory_value([0, 5], [10.0, 0.0]) == 0.0

def test_calculate_stock_velocity():
    assert calculate_stock_velocity(100, 10) == 10.0
    assert calculate_stock_velocity(0, 10) == 0.0
    assert calculate_stock_velocity(100, 0) == 0.0

def test_calculate_days_of_inventory():
    assert calculate_days_of_inventory(100, 10.0) == 10.0
    assert calculate_days_of_inventory(0, 10.0) == 0.0
    assert calculate_days_of_inventory(100, 0.0) == float('inf')

def test_calculate_reorder_point():
    assert calculate_reorder_point(5.0, 2, 10) == 20
    assert calculate_reorder_point(0.0, 5, 0) == 0
    assert calculate_reorder_point(-1.0, 5, 0) == 0

def test_calculate_safety_stock():
    assert calculate_safety_stock(10.0, 2.0, 1.5) == 3
    assert calculate_safety_stock(10.0, 0.0) == 0
    assert calculate_safety_stock(10.0, -1.0) == 0

def test_calculate_stockout_risk():
    assert calculate_stockout_risk(0, 5) == 'CRITICAL'
    assert calculate_stockout_risk(5, 5) == 'CRITICAL'
    assert calculate_stockout_risk(7, 5) == 'HIGH'
    assert calculate_stockout_risk(10, 5) == 'MEDIUM'
    assert calculate_stockout_risk(11, 5) == 'LOW'

def test_calculate_expiry_risk():
    res = calculate_expiry_risk(100, 5.0, 10)
    assert res['expected_sales'] == 50.0
    assert res['expected_leftover'] == 50.0
    assert res['leftover_pct'] == 50.0
    assert res['risk_level'] == 'HIGH'
    
    res = calculate_expiry_risk(100, 0.0, 10)
    assert res['leftover_pct'] == 100.0
    assert res['risk_level'] == 'CRITICAL'

    res = calculate_expiry_risk(0, 5.0, 10)
    assert res['leftover_pct'] == 0.0
    assert res['risk_level'] == 'LOW'

def test_calculate_sell_through_rate():
    assert calculate_sell_through_rate(50, 100) == 50.0
    assert calculate_sell_through_rate(0, 100) == 0.0
    assert calculate_sell_through_rate(50, 0) == 0.0

def test_calculate_inventory_turnover():
    assert calculate_inventory_turnover(500.0, 100.0) == 5.0
    assert calculate_inventory_turnover(0.0, 100.0) == 0.0
    assert calculate_inventory_turnover(500.0, 0.0) == 0.0

def test_calculate_potential_loss():
    assert calculate_potential_loss(10, 15.5) == 155.0
    assert calculate_potential_loss(0, 15.5) == 0.0
    assert calculate_potential_loss(10, 0.0) == 0.0
