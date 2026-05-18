from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class Region(Base):
    __tablename__ = "regions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, index=True)
    name = Column(String(255), nullable=False)
    geojson = Column(String)


class Accident(Base):
    __tablename__ = "accidents"

    id = Column(Integer, primary_key=True, index=True)
    region_code = Column(String(10), ForeignKey("regions.code"))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    deaths = Column(Integer, default=0)
    injured = Column(Integer, default=0)
    description = Column(String(500))
    severity = Column(String(50))
    category = Column(String(255), default="all")


class MonthlyStat(Base):
    __tablename__ = "monthly_stats"

    id = Column(Integer, primary_key=True, index=True)
    region_code = Column(String(10), ForeignKey("regions.code"))
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    category = Column(String(100), default="all")
    accidents_count = Column(Integer, default=0)
    deaths_count = Column(Integer, default=0)
    injured_count = Column(Integer, default=0)