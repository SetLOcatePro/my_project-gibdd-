import json
import asyncio
from app.core.database import SessionLocal
from app.models.models import Accident


async def load_geojson():
    # Укажи путь к своему JSON файлу
    with open("data_dtp.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    async with SessionLocal() as db:
        for feature in data.get("features", []):
            coords = feature["geometry"]["coordinates"]
            props = feature["properties"]

            acc = Accident(
                latitude=coords[1],
                longitude=coords[0],
                type=props.get("accident_type", "Столкновение"),
                dead_count=props.get("dead_count", 0),
                injured_count=props.get("injured_count", 0)
            )
            db.add(acc)
        await db.commit()
        print("Данные успешно загружены в БД!")


if __name__ == "__main__":
    asyncio.run(load_geojson())