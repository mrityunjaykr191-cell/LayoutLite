"""Local launcher for the background removal microservice."""

import sys
import uvicorn

if __name__ == "__main__":
    # Ensure service is only accessible on the local loopback interface
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info",
    )
