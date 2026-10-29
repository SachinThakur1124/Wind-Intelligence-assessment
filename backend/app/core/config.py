import os
from typing import List


class Settings:
    """Application configuration settings loaded from environment or defaults."""
    
    ELEXON_BASE_URL: str = os.getenv("ELEXON_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1")
    DEFAULT_CUTOFF_TIME: str = os.getenv("DEFAULT_CUTOFF_TIME", "11:00")
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "3600"))
    REQUEST_TIMEOUT_SECONDS: int = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
        # Split by comma and strip whitespace
        origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
        # Allow wildcards or production domains if provided
        return origins


settings = Settings()
