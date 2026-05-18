from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.models import Region

router = APIRouter()

@router.get("/", summary="Список всех регионов")
async def list_regions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Region).order_by(Region.name))
    regions = result.scalars().all()
    return {"total": len(regions), "regions": [
        {"id": r.id, "code": r.code, "name": r.name} for r in regions
    ]}

@router.get("/{code}", summary="Регион по коду")
async def get_region(code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Region).where(Region.code == code))
    region = result.scalar_one_or_none()
    if not region:
        raise HTTPException(status_code=404, detail=f"Регион '{code}' не найден")
    return {"id": region.id, "code": region.code, "name": region.name}