from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import map_router, regions_router, stats_router
from app.core.database import engine, Base
from contextlib import asynccontextmanager
'http://localhost:8000/app'
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("📋 Создаем таблицы базы данных...")
    Base.metadata.create_all(bind=engine)
    print("✅ Таблицы созданы!")
    yield

app = FastAPI(
    title="ДТП Аналитика API",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ВАЖНО: Раздаём статические файлы
app.mount("/static", StaticFiles(directory="static"), name="static")

# Роутеры
app.include_router(map_router.router, prefix="/api")
app.include_router(regions_router.router, prefix="/api")
app.include_router(stats_router.router, prefix="/api")

# Главная страница
@app.get("/")
async def root():
    return {"message": "API работает", "docs": "/docs"}

# Открываем index.html
@app.get("/app")
async def app_root():
    from fastapi.responses import FileResponse
    return FileResponse("static/index.html")