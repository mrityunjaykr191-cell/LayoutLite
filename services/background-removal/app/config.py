"""Configuration settings for the background removal microservice."""

import os
from typing import List


def parse_origins(raw: str) -> List[str]:
    """Parse comma-separated origin strings into a cleaned list."""
    if not raw:
        return []
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    return origins


class Settings:
    """Microservice environment configuration."""

    def __init__(self) -> None:
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()
        self.HOST: str = os.getenv("HOST", "127.0.0.1")
        self.PORT: int = int(os.getenv("PORT", "8000"))

        # Default allowed origins for local Vite dev server
        default_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
        env_origins = os.getenv("ALLOWED_ORIGINS", "")
        if env_origins:
            parsed = parse_origins(env_origins)
            # In production, disallow wildcard '*' to prevent unauthorized third-party abuse
            if "*" in parsed and self.ENVIRONMENT == "production":
                parsed = [o for o in parsed if o != "*"]
            self.ALLOWED_ORIGINS: List[str] = parsed if parsed else default_origins
        else:
            self.ALLOWED_ORIGINS: List[str] = default_origins

        # Max file upload size (default 25 MB)
        self.MAX_FILE_SIZE_BYTES: int = int(
            os.getenv("MAX_FILE_SIZE_BYTES", str(25 * 1024 * 1024))
        )

        # Rate limiting (sliding window per minute)
        self.RATE_LIMIT_ENABLED: bool = (
            os.getenv("RATE_LIMIT_ENABLED", "true").lower() in ("1", "true", "yes")
        )
        self.RATE_LIMIT_PER_MINUTE: int = int(
            os.getenv("RATE_LIMIT_PER_MINUTE", "20")
        )

        self.REMOVE_BG_API_KEY: str = os.getenv("REMOVE_BG_API_KEY", "G3j6K2JzVVSwaLV9f4YvZea6").strip()


settings = Settings()
