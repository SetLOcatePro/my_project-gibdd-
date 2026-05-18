from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "ДТП Аналитика"
    DEBUG: bool = False
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "dtp_db"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "secret"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    ALLOWED_ORIGINS: List[str] = ["*"]
    GIBDD_API_BASE: str = "http://stat.gibdd.ru"
    GIBDD_TIMEOUT: int = 10

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()