FROM python:3.11-slim

WORKDIR /poller

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy poller source
COPY . .

# Mount path for mock feeds at runtime; falls back to container copy
ENV MOCK_FEEDS_DIR=/mock_feeds

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD python -c "import asyncpg, redis; print('ok')" || exit 1

CMD ["python", "poller.py"]
