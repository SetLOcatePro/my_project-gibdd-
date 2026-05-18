# ДТП Аналитика — Backend

FastAPI + PostgreSQL/PostGIS backend для системы анализа ДТП по России.

## Структура проекта

```
dtp_backend/
├── app/
│   ├── main.py              # точка входа FastAPI
│   ├── api/
│   │   ├── map_router.py    # POST /api/map/getMainMapData
│   │   ├── regions_router.py # GET /api/regions/
│   │   └── stats_router.py  # GET /api/stats/yearly
│   ├── core/
│   │   ├── config.py        # настройки (env vars)
│   │   └── database.py      # async SQLAlchemy + PostGIS
│   ├── models/
│   │   └── models.py        # ORM: Region, Accident, MonthlyStat
│   ├── schemas/
│   │   └── schemas.py       # Pydantic request/response
│   └── services/
│       ├── gibdd_service.py # прокси к stat.gibdd.ru (временно)
│       └── stats_service.py # запросы из своей БД
└── requirements.txt
```

## Запуск

### 1. Установка зависимостей
```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. PostgreSQL + PostGIS
```bash
# Создать БД
createdb dtp_db
psql dtp_db -c "CREATE EXTENSION postgis;"
psql dtp_db -c "CREATE EXTENSION postgis_topology;"
```

### 3. Переменные окружения (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dtp_db
DB_USER=dtp_user
DB_PASSWORD=your_password
DEBUG=True
```

### 4. Запуск сервера
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Документация

После запуска доступна на:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**:      http://localhost:8000/redoc

## Эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/map/getMainMapData` | Данные картограммы |
| GET  | `/api/map/regions-geojson` | GeoJSON границы регионов |
| GET  | `/api/map/heatmap` | Тепловая карта |
| GET  | `/api/regions/` | Список регионов |
| GET  | `/api/regions/{code}` | Регион по коду |
| GET  | `/api/stats/yearly` | Помесячная статистика |
| GET  | `/api/stats/top` | Топ регионов |
| GET  | `/api/stats/summary` | Сводка по России |

## Следующие шаги

- [ ] Создать миграции Alembic
- [ ] Загрузить GeoJSON границ регионов в PostGIS
- [ ] Парсер данных ГИБДД → заполнить monthly_stats
- [ ] Подключить фронтенд к `/api/map/getMainMapData`
- [ ] Добавить кэширование (Redis)
