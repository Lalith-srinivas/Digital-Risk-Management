import os
from typing import List, Union
from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load .env into os.environ for connectors and external services
load_dotenv()
load_dotenv("backend/.env")
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite:///./soc360.db"

    # Supabase optional credentials
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # External surveillance connectors credentials
    TELEGRAM_BOT_TOKEN: str = ""
    SERPER_API_KEY: str = ""
    SERPAPI_API_KEY: str = ""
    GITHUB_TOKEN: str = ""
    TWITTER_BEARER_TOKEN: str = ""
    VIRUSTOTAL_API_KEY: str = ""
    URLSCAN_API_KEY: str = ""

    # CORS Configuration
    CORS_ORIGINS: Union[str, List[str]] = (
        "http://localhost:3000,http://localhost:5173,https://soc360.onrender.com,https://soc360.vercel.app"
    )

    # Detection engine mode
    DETECTION_ENGINE_MODE: str = "internal_adapter"

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def normalized_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url


settings = Settings()
