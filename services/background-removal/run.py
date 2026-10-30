"""Local launcher for the background removal microservice."""

import uvicorn
from app.config import settings

if __name__ == "__main__":
    # Runs on loopback (127.0.0.1:8000) by default, or respects HOST and PORT env vars
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
        log_level="info",
    )
