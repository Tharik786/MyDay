import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "MyDay Task Scheduler API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "myday_super_secret_jwt_key_scheduler_production_grade_987654321")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite+aiosqlite:///./myday.db"
    )
    
    # Supabase Integration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://xczdiqizaweqszklsddm.supabase.co")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "sb_publishable_Ri2xExiE4ZsziIq9zOCf-Q_8KIqz_8t")
    SUPABASE_PROJECT_ID: str = os.getenv("SUPABASE_PROJECT_ID", "xczdiqizaweqszklsddm")
    SUPABASE_DB_PASSWORD: str = os.getenv("SUPABASE_DB_PASSWORD", "")
    
    # CORS
    ALLOWED_ORIGINS: Union[str, List[str]] = "*"
    
    @property
    def cors_origins(self) -> List[str]:
        if isinstance(self.ALLOWED_ORIGINS, str):
            if self.ALLOWED_ORIGINS.strip() == "*":
                return ["*"]
            return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
        return self.ALLOWED_ORIGINS

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
