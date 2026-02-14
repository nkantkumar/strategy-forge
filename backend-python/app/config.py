"""Application configuration."""
import os
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """App settings from env."""

    app_name: str = "Strategy Forge API"
    debug: bool = False
    # Data
    default_days_back: int = 365
    # External APIs (optional)
    news_api_key: Optional[str] = os.getenv("NEWS_API_KEY")
    anthropic_api_key: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    # MLflow
    mlflow_tracking_uri: Optional[str] = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
    # Redis (caching)
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    # Chroma
    chroma_persist_dir: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")

    class Config:
        env_file = ".env"
        extra = "ignore"
