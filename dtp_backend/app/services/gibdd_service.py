"""
GibddService — прокси к оригинальному API stat.gibdd.ru

Пока своя БД не заполнена данными, этот сервис:
1. Делает запрос к реальному API ГИБДД
2. Парсит SVG/JSON ответ
3. Возвращает в нашем формате

Потом заменим на запросы к своей PostgreSQL.
"""

import httpx
import json
import re
from typing import Optional
from app.core.config import settings
##from app.schemas.schemas import RegionMapData


INDICATOR_NAMES = {
    "1": "ДТП",
    "2": "Погибшие",
    "3": "Раненые",
}

MONTH_NAMES = {
    1: "Январь", 2: "Февраль", 3: "Март", 4: "Апрель",
    5: "Май", 6: "Июнь", 7: "Июль", 8: "Август",
    9: "Сентябрь", 10: "Октябрь", 11: "Ноябрь", 12: "Декабрь"
}


class GibddService:

    def __init__(self):
        self.base_url = settings.GIBDD_API_BASE
        self.timeout  = settings.GIBDD_TIMEOUT

    async def get_map_data(
        self,
        maptype: int,
        region: str,
        date: str,
        pok: str
    ) -> dict:
        """
        Проксируем запрос к /map/getMainMapData
        Возвращаем распарсенные данные в нашем формате.
        """
        payload = {
            "maptype": maptype,
            "region":  region,
            "date":    date,
            "pok":     pok,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/map/getMainMapData",
                json=payload,
                headers={
                    "Content-Type": "application/json; charset=UTF-8",
                    "X-Requested-With": "XMLHttpRequest",
                    "Referer": f"{self.base_url}/",
                    "Origin":  self.base_url,
                }
            )
            response.raise_for_status()
            raw = response.json()

        return self._parse_response(raw, pok, date)

    def _parse_response(self, raw: dict, pok: str, date: str) -> dict:
        """
        Парсим ответ ГИБДД.
        raw содержит:
          - metabase: JSON-строка со списком регионов и их ID
          - data:     SVG-строка с числовыми данными
          - regionname: название выбранного региона
        """
        result = {
            "regionname": raw.get("regionname", "Российская Федерация"),
            "indicator":  INDICATOR_NAMES.get(pok, "ДТП"),
            "period":     self._parse_period(date),
            "regions":    [],
            "total_dtp":  0,
            "total_dead": 0,
            "total_hurt": 0,
        }

        # Парсим metabase — список регионов
        try:
            metabase_str = raw.get("metabase", "[]")
            # metabase приходит как экранированная JSON-строка
            if isinstance(metabase_str, str):
                metabase = json.loads(metabase_str)
            else:
                metabase = metabase_str

            maps_list = metabase[0].get("maps", []) if metabase else []
            result["regions"] = [
                {
                    "region_code": m.get("id", ""),
                    "region_name": m.get("name", ""),
                    "path":        m.get("path", ""),
                }
                for m in maps_list
            ]
        except (json.JSONDecodeError, IndexError, KeyError):
            pass

        # Парсим data — SVG с числами (извлекаем значения из title-тегов)
        data_str = raw.get("data", "")
        if data_str:
            values = self._extract_values_from_svg(data_str)
            for i, region in enumerate(result["regions"]):
                if i < len(values):
                    region["value"] = values[i]

        return result

    def _extract_values_from_svg(self, svg_str: str) -> list:
        """Извлекаем числовые значения из SVG-разметки картограммы"""
        # Ищем числа в title-тегах или атрибутах fill
        values = re.findall(r'<title[^>]*>(\d+)</title>', svg_str)
        return [int(v) for v in values]

    def _parse_period(self, date_str: str) -> str:
        """Преобразуем '[\"MONTHS:4.2026\"]' → 'Апрель 2026'"""
        try:
            match = re.search(r'MONTHS:(\d+)\.(\d+)', date_str)
            if match:
                month = int(match.group(1))
                year  = match.group(2)
                return f"{MONTH_NAMES.get(month, str(month))} {year}"
        except Exception:
            pass
        return date_str


# Singleton
gibdd_service = GibddService()
