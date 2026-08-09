"""Centralized business calculation engine.

All financial and inventory formulas live here.
Never call LLMs for math — these are deterministic functions.
"""
from __future__ import annotations
from decimal import Decimal, ROUND_HALF_UP
from typing import Sequence


def calculate_revenue(sale_price: float, quantity: int) -> float:
    """Revenue for a single sale line."""
    return round(float(Decimal(str(sale_price)) * quantity), 2)


def calculate_gross_profit(revenue: float, cost: float, quantity: int) -> float:
    """Gross profit = (sale_price - purchase_price) * quantity."""
    return round((float(Decimal(str(revenue)) - Decimal(str(cost))) * quantity), 2)


def calculate_margin(revenue: float, cost: float) -> float:
    """Gross margin percentage = (revenue - cost) / revenue * 100."""
    if revenue <= 0:
        return 0.0
    return round((revenue - cost) / revenue * 100, 2)


def calculate_aov(total_revenue: float, order_count: int) -> float:
    """Average order value."""
    if order_count <= 0:
        return 0.0
    return round(total_revenue / order_count, 2)


def calculate_inventory_value(quantities: Sequence[int], prices: Sequence[float]) -> float:
    """Total inventory value = sum(quantity * price)."""
    return round(sum(int(q) * float(p) for q, p in zip(quantities, prices)), 2)


def calculate_stock_velocity(total_sold: int, days: int) -> float:
    """Average units sold per day."""
    if days <= 0:
        return 0.0
    return round(total_sold / days, 4)


def calculate_days_of_inventory(quantity: int, velocity: float) -> float:
    """How many days current stock will last at current velocity."""
    if velocity <= 0:
        return float('inf')
    return round(quantity / velocity, 1)


def calculate_reorder_point(daily_demand: float, lead_time_days: int, safety_stock: int) -> int:
    """Reorder point = (demand * lead_time) + safety_stock."""
    return max(0, int(daily_demand * lead_time_days) + safety_stock)


def calculate_safety_stock(daily_demand: float, demand_variability: float, z_score: float = 1.645) -> int:
    """Safety stock = z * variability * sqrt(lead_time). Simplified: z * variability."""
    return max(0, int(z_score * demand_variability))


def calculate_stockout_risk(days_of_supply: float, lead_time_days: int) -> str:
    """Risk level: CRITICAL, HIGH, MEDIUM, LOW."""
    if days_of_supply <= 0:
        return 'CRITICAL'
    if days_of_supply <= lead_time_days:
        return 'CRITICAL'
    if days_of_supply <= lead_time_days * 1.5:
        return 'HIGH'
    if days_of_supply <= lead_time_days * 2:
        return 'MEDIUM'
    return 'LOW'


def calculate_expiry_risk(quantity: int, daily_velocity: float, days_remaining: int) -> dict:
    """Calculate expected sales vs expected leftover before expiry."""
    expected_sales = round(daily_velocity * days_remaining, 1)
    expected_leftover = max(0, quantity - expected_sales)
    leftover_pct = (expected_leftover / quantity * 100) if quantity > 0 else 0
    risk_level = 'CRITICAL' if leftover_pct > 50 else 'HIGH' if leftover_pct > 20 else 'MEDIUM' if leftover_pct > 5 else 'LOW'
    return {
        'expected_sales': expected_sales,
        'expected_leftover': round(expected_leftover, 1),
        'leftover_pct': round(leftover_pct, 1),
        'risk_level': risk_level,
    }


def calculate_sell_through_rate(units_sold: int, units_purchased: int) -> float:
    """Sell-through rate = sold / purchased * 100."""
    if units_purchased <= 0:
        return 0.0
    return round(units_sold / units_purchased * 100, 1)


def calculate_inventory_turnover(cogs: float, avg_inventory_value: float) -> float:
    """Inventory turnover ratio = COGS / average inventory value."""
    if avg_inventory_value <= 0:
        return 0.0
    return round(cogs / avg_inventory_value, 2)


def calculate_potential_loss(quantity: int, purchase_price: float) -> float:
    """Potential monetary loss if stock expires/is wasted."""
    return round(quantity * purchase_price, 2)
