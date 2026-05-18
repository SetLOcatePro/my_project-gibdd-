from fastapi import APIRouter, Query, HTTPException
from sqlalchemy import func, and_
from datetime import datetime
from app.core.database import get_db
from app.models.models import Accident, MonthlyStat, Region
from app.schemas.schemas import MapDataResponse, RegionStats

router = APIRouter(prefix="/map", tags=["Map"])


@router.post("/getMainMapData", response_model=MapDataResponse)
def get_main_map_data(
        month: int = Query(4, ge=1, le=12),
        year: int = Query(2026, ge=2020),
        region: str = Query("all"),
        category: str = Query("all")
):
    """Получить данные для карты"""
    db = next(get_db())

    try:
        cat_filter = MonthlyStat.category == category

        total_accidents = get_total_stats(db, month, year, region, cat_filter)
        regions_stats = get_regions_stats(db, month, year, cat_filter)

        chart_data = {
            "labels": ["ДТП", "Погибло", "Ранено"],
            "data": [
                total_accidents["dtp"],
                total_accidents["dead"],
                total_accidents["injured"]
            ]
        }

        return MapDataResponse(
            stats=total_accidents,
            regions=regions_stats,
            chart=chart_data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_total_stats(db, month: int, year: int, region: str, cat_filter):
    """Получить общую статистику"""
    query = db.query(
        func.sum(MonthlyStat.accidents_count).label("dtp"),
        func.sum(MonthlyStat.deaths_count).label("dead"),
        func.sum(MonthlyStat.injured_count).label("injured")
    ).filter(
        and_(
            MonthlyStat.month == month,
            MonthlyStat.year == year,
            cat_filter
        )
    )

    if region != "all":
        query = query.filter(MonthlyStat.region_code == region)

    result = query.first()

    return {
        "dtp": result.dtp or 0,
        "dead": result.dead or 0,
        "injured": result.injured or 0
    }


def get_regions_stats(db, month: int, year: int, cat_filter):
    """Получить статистику по регионам"""
    stats = db.query(MonthlyStat).filter(
        and_(
            MonthlyStat.month == month,
            MonthlyStat.year == year,
            cat_filter
        )
    ).all()

    regions_data = {}
    for stat in stats:
        regions_data[stat.region_code] = {
            "dtp": stat.accidents_count,
            "dead": stat.deaths_count,
            "injured": stat.injured_count
        }

    return regions_data


@router.get("/regions")
def get_regions_list():
    """Получить список всех регионов"""
    db = next(get_db())
    regions = db.query(Region).all()
    return [{"code": r.code, "name": r.name} for r in regions]


@router.get("/accidents")
def get_accidents(
        region_code: str = None,
        start_date: str = None,
        end_date: str = None,
        limit: int = 100
):
    """Получить список аварий"""
    db = next(get_db())

    query = db.query(Accident)

    if region_code:
        query = query.filter(Accident.region_code == region_code)

    if start_date:
        query = query.filter(Accident.date >= datetime.fromisoformat(start_date))

    if end_date:
        query = query.filter(Accident.date <= datetime.fromisoformat(end_date))

    accidents = query.limit(limit).all()

    return [
        {
            "id": a.id,
            "region_code": a.region_code,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "date": a.date.isoformat(),
            "deaths": a.deaths,
            "injured": a.injured,
            "description": a.description,
            "severity": a.severity
        }
        for a in accidents
    ]


@router.post("/accidents")
def create_accident(accident_data: dict):
    """Создать новую аварию"""
    db = next(get_db())

    accident = Accident(
        region_code=accident_data["region_code"],
        latitude=accident_data["latitude"],
        longitude=accident_data["longitude"],
        deaths=accident_data.get("deaths", 0),
        injured=accident_data.get("injured", 0),
        description=accident_data.get("description", ""),
        severity=accident_data.get("severity", "medium")
    )

    db.add(accident)
    db.commit()
    db.refresh(accident)

    return {"id": accident.id, "message": "Авария успешно добавлена"}


@router.get("/export/all")
def export_all_data():
    """Экспорт всех данных"""
    db = next(get_db())

    accidents = db.query(Accident).all()
    stats = db.query(MonthlyStat).all()

    data = {
        "accidents": [
            {
                "region_code": a.region_code,
                "latitude": a.latitude,
                "longitude": a.longitude,
                "date": a.date.isoformat(),
                "deaths": a.deaths,
                "injured": a.injured
            }
            for a in accidents
        ],
        "monthly_stats": [
            {
                "region_code": s.region_code,
                "year": s.year,
                "month": s.month,
                "accidents_count": s.accidents_count,
                "deaths_count": s.deaths_count,
                "injured_count": s.injured_count
            }
            for s in stats
        ]
    }

    return data