"""Application configuration using pydantic-settings"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8081",  # Expo default port
        "exp://localhost:8081",
    ]

    # Database
    DATABASE_URL: str = "postgresql://synapse:synapse@localhost:5432/synapse"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 3600  # 1 hour

    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30  # 30 days

    # AI Models
    EMBEDDING_MODEL: str = "intfloat/multilingual-e5-large"
    EMBEDDING_DEVICE: str = "cpu"  # or "cuda" if GPU available
    EMBEDDING_BATCH_SIZE: int = 32

    # Recommendation
    RECOMMENDATION_TOP_K: int = 10
    RECOMMENDATION_MIN_SCORE: float = 0.3

    # Sync
    SYNC_BATCH_MAX_SIZE: int = 100
    SYNC_BATCH_MAX_BYTES: int = 1_048_576  # 1MB

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # or "console"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
