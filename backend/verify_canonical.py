import asyncio
import sys
sys.path.insert(0, '.')
from app.engines.analytics import calculate_revenue, to_rupees
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import settings

async def check():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        # Test dashboard revenue
        res = await calculate_revenue(db, 1, None, None)
        print(f'Dashboard revenue: net={res["net_revenue"]} paise = ₹{to_rupees(res["net_revenue"])}')
        print(f'Gross revenue: {res["gross_revenue"]} paise = ₹{to_rupees(res["gross_revenue"])}')
        print(f'Transactions: {res["transactions"]}')

        # Test profit
        from app.engines.analytics import calculate_profit
        res = await calculate_profit(db, 1, None, None)
        print(f'Profit: total_revenue={res["total_revenue"]} cogs={res["total_cogs"]} profit={res["total_profit"]} margin={res["gross_margin_pct"]}%')

        # Test weekly
        from app.engines.analytics import calculate_growth
        res = await calculate_growth(db, 1, 'week')
        print(f'Weekly growth: this_week={res["this_week"]["revenue"]} last_week={res["last_week"]["revenue"]} growth_pct={res["revenue_growth_pct"]}')

        # Test monthly
        res = await calculate_growth(db, 1, 'month')
        print(f'Monthly growth: this_month={res["this_month"]["revenue"]} last_month={res["last_month"]["revenue"]} growth_pct={res["revenue_growth_pct"]}')

        # Test all-time
        res = await calculate_revenue(db, 1)
        print(f'All-time revenue: net={res["net_revenue"]} paise = ₹{to_rupees(res["net_revenue"])}')

asyncio.run(check())