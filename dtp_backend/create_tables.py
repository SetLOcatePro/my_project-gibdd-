import asyncio
from app.core.database import engine, Base
from app.models.models import Region, Accident, MonthlyStat

async def create ():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Таблицы созданы успешно!")
asyncio.run(create())