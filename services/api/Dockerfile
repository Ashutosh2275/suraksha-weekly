# Multi-stage Dockerfile for API service
# Development target for hot-reload

FROM python:3.11-slim as base

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Development target (hot-reload)
FROM base as development

# Install development tools
RUN pip install --no-cache-dir \
    pytest \
    pytest-cov \
    pytest-asyncio \
    black \
    flake8 \
    mypy

# Copy application code (will be mounted as volume)
COPY . .
COPY ../shared/ /app/shared/

# Copy and make entrypoint executable
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production target
FROM base as production

# Copy application code
COPY . .
COPY ../shared/ /app/shared/

# Copy and make entrypoint executable
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 8000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run entrypoint (migrations + app)
ENTRYPOINT ["bash", "/app/docker-entrypoint.sh"]

