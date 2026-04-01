# Multi-stage build for FastAPI Trigger service
FROM python:3.11-slim as builder

WORKDIR /app

# Install dependencies
COPY services/trigger/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final stage
FROM python:3.11-slim

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY services/trigger/ .
COPY shared/ /app/shared/

# Expose port
EXPOSE 8003

# Run the application
CMD ["python", "main.py"]
