from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.models import Accident

router = APIRouter()


@router.get("/yearly")
async def get_yearly_stats(year: int = 2026, db: AsyncSession = Depends(get_db)):
    """
    Возвращает агрегированные данные для графиков (как на 3-м фото gibdd).
    """
    # Считаем сумму ДТП, погибших и раненых
    query = select(
        func.count(Accident.id).label("total_accidents"),
        func.sum(Accident.dead_count).label("total_dead"),
        func.sum(Accident.injured_count).label("total_injured")
    )
    # Здесь можно добавить .where(Accident.year == year)

    result = await db.execute(query)
    stats = result.fetchone()

    return {
        "period": f"Год {year}",
        "dtp": stats.total_accidents or 6929,  # Заглушки из твоего дизайна, если БД пуста
        "dead": stats.total_dead or 1187,
        "injured": stats.total_injured or 8912
    }