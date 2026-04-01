# 🐳 Docker Compose Development Setup - Complete!

A production-ready local development environment for Suraksha Weekly with hot-reload, health checks, and comprehensive tooling.

## ✅ What Was Created

### 1. **docker-compose.yml**
Complete orchestration for local development:

#### Infrastructure Services
- ✅ **postgres:15** - PostgreSQL with health checks, named volumes, init scripts
- ✅ **redis:7** - Redis with AOF persistence and health checks
- ✅ **rabbitmq:3-management** - RabbitMQ with management UI on port 15672

#### Backend Services (FastAPI with hot-reload)
- ✅ **api** - Main backend (port 8000) with uvicorn --reload
- ✅ **fraud** - Fraud scoring (port 8001) with uvicorn --reload
- ✅ **trigger** - Trigger ingestion (port 8002) with uvicorn --reload

#### Frontend Services (Next.js with hot-reload)
- ✅ **worker-web** - Worker portal (port 3000) with Next.js dev server
- ✅ **admin-web** - Admin dashboard (port 3001) with Next.js dev server

**Key Features:**
- 🌐 Shared `suraksha-net` bridge network
- 🏥 Health checks with `depends_on: condition: service_healthy`
- 🔥 Source code mounted as volumes for hot-reload
- 📦 Named volumes for data persistence
- 🔧 Loads env vars from root `.env` file

### 2. **Makefile**
Comprehensive development commands:

```bash
# Quick Start
make setup          # Initial setup (copy .env, start, migrate, seed)
make up             # Start all services
make down           # Stop all services
make logs           # View logs

# Development
make build          # Build all images
make restart        # Restart services
make shell-api      # Shell into API container
make shell-postgres # PostgreSQL shell

# Database
make migrate        # Run migrations
make seed           # Seed test data
make db-reset       # Reset database (with confirmation)

# Testing
make test           # Run all tests
make test-unit      # Unit tests only
make test-integration # Integration tests only
make test-coverage  # With coverage report
```

### 3. **.env.example**
Complete environment template with:
- Database configuration
- Redis settings
- RabbitMQ credentials
- Service ports
- API keys
- Feature flags
- Fraud thresholds
- Trigger thresholds

### 4. **Development Dockerfiles**
Multi-stage Dockerfiles for all services:

- ✅ `services/api/Dockerfile` - with development target
- ✅ `services/fraud/Dockerfile` - with hot-reload support
- ✅ `services/trigger/Dockerfile` - with hot-reload support
- ✅ `apps/worker-web/Dockerfile` - Next.js dev mode
- ✅ `apps/admin-web/Dockerfile` - Next.js dev mode

**Features:**
- Development and production targets
- Hot-reload capabilities
- Volume mounts for source code
- Excluded cache directories for performance

### 5. **PostgreSQL Init Scripts**
Auto-run scripts in `infra/postgres/init/`:

- ✅ `01-init-schema.sh` - Creates extensions, enum types, audit log table
- ✅ `02-seed-dev-data.sh` - Seeds initial dev data
- ✅ `README.md` - Documentation for init process

**Created:**
- UUID extension
- Text search extension
- Custom enum types (user_role, policy_status, claim_status)
- Audit logs table with indexes

### 6. **DOCKER_DEV_SETUP.md**
Complete documentation covering:
- Quick start guide
- Service descriptions
- Makefile command reference
- Access URLs and credentials
- Hot-reload configuration
- Health checks explanation
- Volume mounts
- Environment variables
- Troubleshooting guide
- Development workflow

## 🚀 Quick Start

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env and add your API keys
nano .env

# 3. Initial setup (one command does everything!)
make setup
```

That's it! The setup command will:
- Start all infrastructure services
- Wait for health checks
- Run database migrations
- Seed test data
- Start all application services

## 🌐 Access Your Applications

| Service | URL | Credentials |
|---------|-----|-------------|
| Worker Portal | http://localhost:3000 | - |
| Admin Dashboard | http://localhost:3001 | - |
| API Docs | http://localhost:8000/docs | - |
| Fraud Service | http://localhost:8001/docs | - |
| Trigger Service | http://localhost:8002/docs | - |
| RabbitMQ Management | http://localhost:15672 | suraksha / suraksha_dev_pass |
| PostgreSQL | localhost:5432 | suraksha / suraksha_dev_pass |
| Redis | localhost:6379 | - |

## 🔥 Hot Reload Features

### Backend (FastAPI)
All Python services use `uvicorn --reload`:
- Edit any Python file
- Service automatically restarts
- Changes reflected immediately
- No container rebuild needed

### Frontend (Next.js)
Both web apps use Next.js dev server:
- Edit any React/TypeScript file
- Fast refresh updates the page
- Preserves component state
- No page reload needed

### Volumes Configuration
```yaml
# Backend hot-reload
volumes:
  - ./services/api:/app:cached
  - ./shared:/app/shared:cached
  - /app/__pycache__  # Excluded for performance

# Frontend hot-reload
volumes:
  - ./apps/worker-web:/app:cached
  - ./packages/shared-types:/packages/shared-types:cached
  - /app/node_modules  # Excluded for performance
  - /app/.next         # Excluded for performance
```

## 🏥 Health Check System

All services include health checks ensuring services start in the correct order:

```yaml
postgres:
  healthcheck:
    test: pg_isready -U suraksha -d suraksha_db
    interval: 5s
    timeout: 5s
    retries: 5

api:
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
    rabbitmq:
      condition: service_healthy
  healthcheck:
    test: curl -f http://localhost:8000/health
```

## 📦 Named Volumes

Data persists across container restarts:

```yaml
volumes:
  suraksha_postgres_data:  # Database data
  suraksha_redis_data:     # Redis cache
  suraksha_rabbitmq_data:  # RabbitMQ messages
```

## 🔧 Configuration

### Environment Variables (.env)
```env
# Database
POSTGRES_USER=suraksha
POSTGRES_PASSWORD=suraksha_dev_pass
POSTGRES_DB=suraksha_db

# Ports (customizable)
API_PORT=8000
FRAUD_PORT=8001
TRIGGER_PORT=8002
WORKER_WEB_PORT=3000
ADMIN_WEB_PORT=3001

# Application
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=dev-secret-key
JWT_SECRET=jwt-secret-key

# External APIs
OPENWEATHER_API_KEY=your-key-here
```

### Network Architecture
```
suraksha-net (bridge network)
├── Infrastructure Layer
│   ├── postgres (with init scripts)
│   ├── redis (AOF persistence)
│   └── rabbitmq (management enabled)
├── Backend Layer (depends on infrastructure)
│   ├── api (FastAPI hot-reload)
│   ├── fraud (FastAPI hot-reload)
│   └── trigger (FastAPI hot-reload)
└── Frontend Layer (depends on api)
    ├── worker-web (Next.js dev mode)
    └── admin-web (Next.js dev mode)
```

## 🎯 Development Workflow

### Daily Development
```bash
# Morning
make up              # Start everything
make logs            # Watch logs (Ctrl+C to exit, services keep running)

# During development - just edit code!
# Hot-reload handles the rest

# Check status
make status

# Evening
make down            # Stop everything
```

### Working on Backend
```bash
# Edit Python files - auto-reloads
# Watch specific service
make logs-api

# Run tests
make test

# Access shell if needed
make shell-api

# Restart specific service
make restart-api
```

### Working on Frontend
```bash
# Edit React/TS files - fast refresh
# Watch specific app
make logs-worker

# Access shell if needed
make shell-worker
```

### Database Operations
```bash
# Create migration
make migrate-create MESSAGE="add user fields"

# Run migrations
make migrate

# Seed data
make seed

# Reset database
make db-reset  # Asks for confirmation

# Access PostgreSQL
make shell-postgres
```

## 🧪 Testing

```bash
# Run all tests
make test

# Unit tests only
make test-unit

# Integration tests (with running services)
make test-integration

# With coverage
make test-coverage

# Load tests
make test-load
```

## 🐛 Troubleshooting

### Services won't start
```bash
make logs           # Check error messages
make build          # Rebuild images
make up-build       # Build and start
```

### Database issues
```bash
make shell-postgres  # Check database
make db-reset        # Nuclear option (destroys data)
```

### Port conflicts
Edit `.env` and change ports:
```env
API_PORT=8080
WORKER_WEB_PORT=3002
```

### Hot-reload not working
```bash
# Backend
make restart-api

# Frontend
docker-compose exec worker-web rm -rf .next
make restart
```

### Clean slate
```bash
make clean    # Removes all volumes and data
make setup    # Fresh start
```

## 📚 Documentation Files

- **DOCKER_DEV_SETUP.md** - Complete guide (this file's companion)
- **infra/postgres/init/README.md** - Init scripts documentation
- **Makefile** - Self-documenting (run `make help`)

## 🎁 Bonus Features

### PostgreSQL Init Scripts
- Auto-creates extensions on first run
- Sets up enum types
- Creates audit log table
- Seeds initial dev data

### RabbitMQ Management
- Web UI on port 15672
- Default credentials: suraksha / suraksha_dev_pass
- Monitor queues, exchanges, connections

### Redis Persistence
- AOF (Append-Only File) enabled
- Fsync on every second
- 256MB max memory with LRU eviction

### Development Tools in Containers
- pytest, pytest-cov, pytest-asyncio
- black, flake8, mypy
- curl for health checks
- postgresql-client for database access

## 🚦 Startup Sequence

1. **Infrastructure starts** (postgres, redis, rabbitmq)
2. **Health checks wait** (5-30 seconds)
3. **Backend services start** when infrastructure is healthy
4. **Frontend apps start** when API is healthy
5. **All healthy** - ready for development!

Total startup time: ~30-60 seconds

## ✨ Best Practices

1. **Always use make commands** - They're safer and documented
2. **Check logs when things break** - `make logs`
3. **Don't commit .env** - It's in .gitignore
4. **Use make setup for new team members** - One command setup
5. **Run tests before commits** - `make test`
6. **Reset database when schema changes** - `make db-reset`

---

## 🎉 You're Ready!

Everything is configured for an excellent development experience:
- ✅ Hot-reload on all services
- ✅ Proper health checks and dependencies
- ✅ Data persistence
- ✅ Easy commands via Makefile
- ✅ Complete documentation

Run `make help` to see all available commands!

**Happy coding! 🚀**
