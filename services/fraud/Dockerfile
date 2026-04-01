# Multi-stage Dockerfile for Fraud service
# Development target for hot-reload

FROM python:3.11-slim as base

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY services/fraud/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Development target (hot-reload)
FROM base as development

# Install development tools
RUN pip install --no-cache-dir \
    pytest \
    pytest-asyncio

# Copy source code (will be mounted as volume)
COPY services/fraud/ .
COPY shared/ /app/shared/

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]

# Production target
FROM base as production

COPY services/fraud/ .
COPY shared/ /app/shared/

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
