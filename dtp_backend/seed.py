from app.core.database import engine, SessionLocal
from app.models.models import Accident, MonthlyStat, Region, Base
import random
from datetime import datetime


def seed_data():
    print("🚀 Начинаем заполнение базы данных...")

    print("📋 Создаем таблицы...")
    Base.metadata.create_all(bind=engine)
    print("✅ Таблицы созданы!")

    db = SessionLocal()

    try:
        print("\n🌍 Добавляем регионы...")
        regions_data = [
            {"code": "77", "name": "Москва"},
            {"code": "78", "name": "Санкт-Петербург"},
            {"code": "54", "name": "Новосибирская область"},
            {"code": "66", "name": "Свердловская область"},
            {"code": "23", "name": "Краснодарский край"},
            {"code": "16", "name": "Республика Татарстан"},
            {"code": "52", "name": "Нижегородская область"},
            {"code": "74", "name": "Челябинская область"},
            {"code": "61", "name": "Ростовская область"},
            {"code": "34", "name": "Волгоградская область"},
        ]

        for r in regions_data:
            exists = db.query(Region).filter(Region.code == r["code"]).first()
            if not exists:
                region = Region(code=r["code"], name=r["name"])
                db.add(region)
                print(f"   ✅ Добавлен регион: {r['name']}")

        db.commit()
        print(f"✅ Добавлено {len(regions_data)} регионов")

        print("\n📊 Генерируем статистику...")
        categories = ["all", "children", "pedestrians", "drivers"]
        count_stats = 0

        for r_code in ["77", "78", "54", "66", "23"]:
            for month in range(1, 13):
                for cat in categories:
                    base_accidents = random.randint(50, 300)
                    base_deaths = random.randint(5, 30)
                    base_injured = random.randint(50, 250)

                    if cat != "all":
                        base_accidents = int(base_accidents * 0.3)
                        base_deaths = int(base_deaths * 0.2)
                        base_injured = int(base_injured * 0.3)

                    stat = MonthlyStat(
                        region_code=r_code,
                        year=2026,
                        month=month,
                        category=cat,
                        accidents_count=base_accidents,
                        deaths_count=base_deaths,
                        injured_count=base_injured
                    )
                    db.add(stat)
                    count_stats += 1

        db.commit()
        print(f"✅ Сгенерировано {count_stats} записей статистики")

        print("\n🚗 Генерируем аварии...")
        for i in range(50):
            acc = Accident(
                region_code=random.choice(["77", "78", "54", "66"]),
                latitude=55.7558 + random.uniform(-2, 2),
                longitude=37.6173 + random.uniform(-2, 2),
                date=datetime.now(),
                deaths=random.randint(0, 3),
                injured=random.randint(1, 10),
                description=f"ДТП #{i + 1}",
                severity=random.choice(["critical", "high", "medium", "low"]),
                category=random.choice(["all", "children", "pedestrians", "drivers"])
            )
            db.add(acc)

        db.commit()
        print("✅ Сгенерировано 50 аварий")

        print("\n" + "=" * 50)
        print("🎉 БАЗА ДАННЫХ УСПЕШНО ЗАПОЛНЕНА!")
        print("=" * 50)

    except Exception as e:
        db.rollback()
        print(f"\n❌ Ошибка при заполнении: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()