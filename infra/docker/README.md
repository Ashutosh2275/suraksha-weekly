# Docker Infrastructure

Docker setup for Suraksha Weekly monorepo.

## Services

- **postgres** - PostgreSQL 15 database (port 5432)
- **redis** - Redis cache (port 6379)
- **api** - Main FastAPI backend (port 8000)
- **fraud** - Fraud scoring microservice (port 8002)
- **trigger** - Trigger ingestion service (port 8003)
- **worker-web** - Next.js worker frontend (port 3000)
- **admin-web** - Next.js admin dashboard (port 3001)

## Quick Start

### Development Mode (with hot reload)

```bash
# Start all services
docker-compose -f infra/docker/docker-compose.yml up

# Start specific services
docker-compose -f infra/docker/docker-compose.yml up postgres redis api

# Run in background
docker-compose -f infra/docker/docker-compose.yml up -d
```

### Stop Services

```bash
# Stop all services
docker-compose -f infra/docker/docker-compose.yml down

# Stop and remove volumes (WARNING: deletes data)
docker-compose -f infra/docker/docker-compose.yml down -v
```

### View Logs

```bash
# All services
docker-compose -f infra/docker/docker-compose.yml logs -f

# Specific service
docker-compose -f infra/docker/docker-compose.yml logs -f api
```

### Rebuild Services

```bash
# Rebuild all
docker-compose -f infra/docker/docker-compose.yml build

# Rebuild specific service
docker-compose -f infra/docker/docker-compose.yml build api

# Rebuild and restart
docker-compose -f infra/docker/docker-compose.yml up --build
```

## Environment Variables

Create a `.env` file in the root directory with required variables:

```env
OPENWEATHER_API_KEY=your_api_key_here
```

See individual service `.env.example` files for all configuration options.

## Ports

| Service      | Port | URL                      |
|--------------|------|--------------------------|
| Worker Web   | 3000 | http://localhost:3000    |
| Admin Web    | 3001 | http://localhost:3001    |
| API          | 8000 | http://localhost:8000    |
| Fraud        | 8002 | http://localhost:8002    |
| Trigger      | 8003 | http://localhost:8003    |
| PostgreSQL   | 5432 | localhost:5432           |
| Redis        | 6379 | localhost:6379           |

## Production Deployment

For production, update:

1. Change database passwords in environment variables
2. Set `DEBUG=false` and `ENVIRONMENT=production`
3. Use proper secret keys (not the dev defaults)
4. Configure proper CORS origins
5. Use managed database services instead of containerized DB
6. Set up proper networking and security groups

## Health Checks

All services include health checks:
- PostgreSQL: pg_isready
- Redis: redis-cli ping
- FastAPI services: /health endpoint

## Data Persistence

Data is persisted in Docker volumes:
- `postgres_data` - Database data
- `redis_data` - Redis cache

To backup data:
```bash
docker-compose -f infra/docker/docker-compose.yml exec postgres pg_dump -U suraksha suraksha_db > backup.sql
```
