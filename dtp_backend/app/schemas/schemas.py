from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime

class RegionStats(BaseModel):
    dtp: int
    dead: int
    injured: int

class ChartData(BaseModel):
    labels: list
    data: list

class MapDataResponse(BaseModel):
    stats: RegionStats
    regions: Dict[str, RegionStats]
    chart: ChartData

class AccidentCreate(BaseModel):
    region_code: str
    latitude: float
    longitude: float
    deaths: Optional[int] = 0
    injured: Optional[int] = 0
    description: Optional[str] = ""
    severity: Optional[str] = "medium"

class MonthlyStatCreate(BaseModel):
    region_code: str
    year: int
    month: int
    accidents_count: Optional[int] = 0
    deaths_count: Optional[int] = 0
    injured_count: Optional[int] = 0