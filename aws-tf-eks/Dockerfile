FROM python:3.12-slim

WORKDIR /app

# Copy requirements before source so this layer is cached unless deps change.
COPY requirements.txt .
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements.txt

COPY api/ api/

# Run as non-root. Port 8000 is non-privileged (only ports below 1024 require root).
RUN useradd --no-create-home appuser && chown -R appuser /app
USER appuser
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "10"]
