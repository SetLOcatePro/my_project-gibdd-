from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.models import MonthlyStat, Region

MONTH_NAMES = {
    1: "Январь", 2: "Февраль", 3: "Март", 4: "Апрель",
    5: "Май", 6: "Июнь", 7: "Июль", 8: "Август",
    9: "Сентябрь", 10: "Октябрь", 11: "Ноябрь", 12: "Декабрь"
}

class StatsService:

    async def get_yearly_stats(self, db: AsyncSession, region_code: str, year: int):
        region_q = await db.execute(select(Region).where(Region.code == region_code))
        region = region_q.scalar_one_or_none()
        if not region:
            return {"error": "Регион не найден"}

        stats_q = await db.execute(
            select(MonthlyStat)
            .where(and_(MonthlyStat.region_id == region.id, MonthlyStat.year == year))
            .order_by(MonthlyStat.month)
        )
        stats = stats_q.scalars().all()
        data = [
            {
                "month": s.month,
                "month_name": MONTH_NAMES.get(s.month),
                "dtp": s.dtp_count,
                "dead": s.dead_count,
                "hurt": s.hurt_count,
            }
            for s in stats
        ]
        return {
            "region": region.name,
            "year": year,
            "data": data,
            "totals": {
                "dtp":  sum(d["dtp"]  for d in data),
                "dead": sum(d["dead"] for d in data),
                "hurt": sum(d["hurt"] for d in data),
            }
        }

stats_service = StatsService()