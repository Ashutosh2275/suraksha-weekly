# Docker Compose Development Setup

Complete local development environment for Suraksha Weekly with hot-reload support.

## 🚀 Quick Start

```bash
# Copy environment file
cp .env.example .env

# Start all services
make up

# View logs
make logs

# Stop services
make down
```

## 📦 Services

### Infrastructure
- **postgres:15** - PostgreSQL database with init scripts (port 5432)
- **redis:7** - Redis cache with AOF persistence (port 6379)
- **rabbitmq:3** - RabbitMQ message broker with management UI (port 5672, 15672)

### Backend (FastAPI with hot-reload)
- **api** - Main backend service (port 8000)
- **fraud** - Fraud scoring microservice (port 8001)
- **trigger** - Trigger ingestion service (port 8002)

### Frontend (Next.js with hot-reload)
- **worker-web** - Worker portal (port 3000)
- **admin-web** - Admin dashboard (port 3001)

## 🔧 Makefile Commands

### Basic Operations
```bash
make up              # Start all services
make down            # Stop all services
make restart         # Restart all services
make logs            # View logs from all services
make ps              # List running containers
make status          # Show service status
```

### Development
```bash
make setup           # Initial setup (copy .env, start services, migrate, seed)
make dev             # Alias for 'up'
make build           # Rebuild all images
make up-build        # Build and start services
```

### Database
```bash
make migrate         # Run database migrations
make migrate-create  # Create new migration (use MESSAGE="description")
make migrate-rollback # Rollback last migration
make seed            # Seed database with test data
make db-reset        # Reset database (destroys all data!)
```

### Testing
```bash
make test            # Run all tests
make test-unit       # Run unit tests only
make test-integration # Run integration tests only
make test-coverage   # Run tests with coverage report
make test-load       # Run load tests
```

### Shell Access
```bash
make shell-api       # Open shell in API container
make shell-fraud     # Open shell in Fraud container
make shell-trigger   # Open shell in Trigger container
make shell-postgres  # Open PostgreSQL shell
make shell-redis     # Open Redis CLI
```

### Service-Specific Logs
```bash
make logs-api        # API service logs
make logs-fraud      # Fraud service logs
make logs-trigger    # Trigger service logs
make logs-worker     # Worker web logs
make logs-admin      # Admin web logs
```

### Cleanup
```bash
make clean           # Stop and remove volumes (destroys data!)
make clean-images    # Remove all service images
make prune           # Remove unused Docker resources
```

## 🌐 Access URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Worker Portal | http://localhost:3000 | - |
| Admin Dashboard | http://localhost:3001 | - |
| API Documentation | http://localhost:8000/docs | - |
| Fraud Service | http://localhost:8001/docs | - |
| Trigger Service | http://localhost:8002/docs | - |
| RabbitMQ Management | http://localhost:15672 | suraksha / suraksha_dev_pass |
| PostgreSQL | localhost:5432 | suraksha / suraksha_dev_pass |
| Redis | localhost:6379 | - |

## 🔥 Hot Reload

All services are configured for hot-reload:

### Backend Services (FastAPI)
- Source code mounted as volumes
- `uvicorn --reload` automatically restarts on code changes
- Python cache excluded from volume mounts

### Frontend Services (Next.js)
- Source code mounted as volumes
- Next.js dev server watches for changes
- `node_modules` excluded for performance

## 🏗️ Architecture

```
suraksha-net (bridge network)
├── postgres (with init scripts)
├── redis (AOF persistence)
├── rabbitmq (with management UI)
├── api (depends on postgres, redis, rabbitmq)
├── fraud (depends on postgres)
├── trigger (depends on postgres)
├── worker-web (depends on api)
└── admin-web (depends on api)
```

## 🔒 Health Checks

All services include health checks with `depends_on: condition: service_healthy`:

- **postgres**: `pg_isready` check
- **redis**: `redis-cli ping`
- **rabbitmq**: `rabbitmq-diagnostics ping`
- **api**: HTTP GET `/health` endpoint
- **fraud**: HTTP GET `/health` endpoint
- **trigger**: HTTP GET `/health` endpoint
- **worker-web**: HTTP GET to port 3000
- **admin-web**: HTTP GET to port 3001

## 📂 Volume Mounts

### Source Code (Hot Reload)
```yaml
# Backend
- ./services/api:/app:cached
- ./shared:/app/shared:cached

# Frontend
- ./apps/worker-web:/app:cached
- ./packages/shared-types:/packages/shared-types:cached
```

### Data Persistence
```yaml
- postgres_data:/var/lib/postgresql/data
- redis_data:/data
- rabbitmq_data:/var/lib/rabbitmq
```

## 🔧 Environment Variables

Configure via `.env` file (copy from `.env.example`):

```env
# Database
POSTGRES_USER=suraksha
POSTGRES_PASSWORD=suraksha_dev_pass
POSTGRES_DB=suraksha_db

# Services
API_PORT=8000
FRAUD_PORT=8001
TRIGGER_PORT=8002
WORKER_WEB_PORT=3000
ADMIN_WEB_PORT=3001

# Application
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=your-secret-key
JWT_SECRET=your-jwt-secret

# External APIs
OPENWEATHER_API_KEY=your-api-key
```

## 🐛 Troubleshooting

### Services not starting
```bash
# Check logs
make logs

# Check specific service
make logs-api

# Rebuild images
make build
make up
```

### Database connection issues
```bash
# Check postgres health
docker-compose ps postgres

# Access postgres shell
make shell-postgres

# Reset database
make db-reset
```

### Port already in use
```bash
# Change ports in .env file
API_PORT=8080
WORKER_WEB_PORT=3002
# etc.
```

### Hot reload not working
```bash
# For backend: Restart the service
make restart-api

# For frontend: Clear build cache
docker-compose exec worker-web rm -rf .next
make restart
```

## 📚 Additional Documentation

- [API Service README](../services/api/README.md)
- [Fraud Service README](../services/fraud/README.md)
- [Trigger Service README](../services/trigger/README.md)
- [Worker Web README](../apps/worker-web/README.md)
- [Admin Web README](../apps/admin-web/README.md)

## 🎯 Development Workflow

1. **Initial Setup**
   ```bash
   make setup
   ```

2. **Daily Development**
   ```bash
   make up          # Start services
   make logs        # Watch logs
   # Make code changes (hot-reload active)
   make test        # Run tests
   make down        # Stop when done
   ```

3. **Database Changes**
   ```bash
   # Make model changes
   make migrate-create MESSAGE="add new field"
   make migrate
   make seed        # If needed
   ```

4. **Testing**
   ```bash
   make test-unit
   make test-integration
   make test-load
   ```

---

**Need help?** Run `make help` to see all available commands.
