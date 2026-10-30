# Multi-stage production container for LayoutLite background removal service
FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    REMBG_HOME=/opt/rembg \
    PORT=8000 \
    ENVIRONMENT=production \
    PREWARM_MODEL=true

WORKDIR /app

# Install system dependencies required by ONNX runtime (OpenMP)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-cache u2netp ONNX weights (~4.36 MB) during image build
# This avoids any cold-start runtime download from GitHub
RUN mkdir -p /opt/rembg && \
    python -c "import rembg; rembg.new_session('u2netp')" && \
    test -f /opt/rembg/models/u2netp/u2netp.onnx

# Copy application code
COPY app/ ./app/

# Create a non-privileged user and transfer ownership
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app /opt/rembg

USER appuser

EXPOSE 8000

# Cloud Run injects $PORT at runtime (defaults to 8000 if not set)
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
