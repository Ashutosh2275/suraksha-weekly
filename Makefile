# ──────────────────────────────────────────────────────────────────────────────
# Suraksha Weekly - Local Development Makefile
# ──────────────────────────────────────────────────────────────────────────────

.PHONY: help up down restart logs clean build migrate seed test shell-api shell-postgres

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# ──────────────────────────────────────────────────────────────────────────────
# Help
# ──────────────────────────────────────────────────────────────────────────────

help: ## Show this help message
	@echo "$(BLUE)Suraksha Weekly - Development Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Usage:$(NC)"
	@echo "  make [target]"
	@echo ""
	@echo "$(GREEN)Targets:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(NC) %s\n", $$1, $$2}'

# ──────────────────────────────────────────────────────────────────────────────
# Docker Compose Commands
# ──────────────────────────────────────────────────────────────────────────────

up: ## Start all services in detached mode
	@echo "$(GREEN)Starting Suraksha Weekly services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Services started!$(NC)"
	@echo ""
	@echo "$(BLUE)Access URLs:$(NC)"
	@echo "  Worker Portal:       http://localhost:3000"
	@echo "  Admin Dashboard:     http://localhost:3001"
	@echo "  API Documentation:   http://localhost:8000/docs"
	@echo "  Fraud Service:       http://localhost:8001/docs"
	@echo "  Trigger Service:     http://localhost:8002/docs"
	@echo "  RabbitMQ Management: http://localhost:15672"
	@echo ""
	@echo "$(YELLOW)Run 'make logs' to view logs$(NC)"

up-build: ## Build and start all services
	@echo "$(GREEN)Building and starting services...$(NC)"
	docker-compose up -d --build

down: ## Stop and remove all containers
	@echo "$(YELLOW)Stopping services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Services stopped$(NC)"

restart: down up ## Restart all services

logs: ## Tail logs from all services
	docker-compose logs -f

logs-api: ## Tail logs from API service only
	docker-compose logs -f api

logs-fraud: ## Tail logs from Fraud service only
	docker-compose logs -f fraud

logs-trigger: ## Tail logs from Trigger service only
	docker-compose logs -f trigger

logs-worker: ## Tail logs from Worker web only
	docker-compose logs -f worker-web

logs-admin: ## Tail logs from Admin web only
	docker-compose logs -f admin-web

# ──────────────────────────────────────────────────────────────────────────────
# Build Commands
# ──────────────────────────────────────────────────────────────────────────────

build: ## Build all service images
	@echo "$(GREEN)Building service images...$(NC)"
	docker-compose build

build-api: ## Build API service image
	docker-compose build api

build-fraud: ## Build Fraud service image
	docker-compose build fraud

build-trigger: ## Build Trigger service image
	docker-compose build trigger

build-worker: ## Build Worker web image
	docker-compose build worker-web

build-admin: ## Build Admin web image
	docker-compose build admin-web

# ──────────────────────────────────────────────────────────────────────────────
# Database Commands
# ──────────────────────────────────────────────────────────────────────────────

migrate: ## Run database migrations
	@echo "$(GREEN)Running database migrations...$(NC)"
	docker-compose exec api alembic upgrade head
	@echo "$(GREEN)✓ Migrations complete$(NC)"

migrate-create: ## Create a new migration (use MESSAGE="description")
	@echo "$(GREEN)Creating migration: $(MESSAGE)$(NC)"
	docker-compose exec api alembic revision --autogenerate -m "$(MESSAGE)"

migrate-rollback: ## Rollback last migration
	@echo "$(YELLOW)Rolling back last migration...$(NC)"
	docker-compose exec api alembic downgrade -1

seed: ## Seed database with test data
	@echo "$(GREEN)Seeding database...$(NC)"
	docker-compose exec api python scripts/seed_db.py
	@echo "$(GREEN)✓ Database seeded$(NC)"

db-reset: ## Reset database (WARNING: destroys all data)
	@echo "$(RED)⚠️  WARNING: This will destroy all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		docker-compose up -d postgres redis rabbitmq; \
		sleep 5; \
		$(MAKE) migrate; \
		$(MAKE) seed; \
	fi

# ──────────────────────────────────────────────────────────────────────────────
# Testing Commands
# ──────────────────────────────────────────────────────────────────────────────

test: ## Run all tests
	@echo "$(GREEN)Running tests...$(NC)"
	docker-compose exec api pytest -v

test-unit: ## Run unit tests only
	@echo "$(GREEN)Running unit tests...$(NC)"
	docker-compose exec api pytest tests/unit -v

test-integration: ## Run integration tests only
	@echo "$(GREEN)Running integration tests...$(NC)"
	docker-compose exec api pytest tests/integration -v

test-coverage: ## Run tests with coverage report
	@echo "$(GREEN)Running tests with coverage...$(NC)"
	docker-compose exec api pytest --cov=. --cov-report=html --cov-report=term

test-load: ## Run load tests (requires services to be running)
	@echo "$(GREEN)Running load tests...$(NC)"
	npm run load:baseline

# ──────────────────────────────────────────────────────────────────────────────
# Shell Access Commands
# ──────────────────────────────────────────────────────────────────────────────

shell-api: ## Open shell in API container
	docker-compose exec api /bin/sh

shell-fraud: ## Open shell in Fraud container
	docker-compose exec fraud /bin/sh

shell-trigger: ## Open shell in Trigger container
	docker-compose exec trigger /bin/sh

shell-worker: ## Open shell in Worker web container
	docker-compose exec worker-web /bin/sh

shell-admin: ## Open shell in Admin web container
	docker-compose exec admin-web /bin/sh

shell-postgres: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U suraksha -d suraksha_db

shell-redis: ## Open Redis CLI
	docker-compose exec redis redis-cli

# ──────────────────────────────────────────────────────────────────────────────
# Status & Info Commands
# ──────────────────────────────────────────────────────────────────────────────

ps: ## List all running containers
	docker-compose ps

status: ## Show status of all services
	@echo "$(BLUE)Service Status:$(NC)"
	@docker-compose ps

health: ## Check health of all services
	@echo "$(BLUE)Health Check:$(NC)"
	@docker-compose ps | grep -E "(healthy|unhealthy|Up)"

stats: ## Show container resource usage
	docker stats --no-stream

# ──────────────────────────────────────────────────────────────────────────────
# Cleanup Commands
# ──────────────────────────────────────────────────────────────────────────────

clean: ## Stop containers and remove volumes (WARNING: destroys data)
	@echo "$(RED)⚠️  WARNING: This will destroy all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "$(GREEN)✓ Cleanup complete$(NC)"; \
	fi

clean-images: ## Remove all service images
	@echo "$(YELLOW)Removing service images...$(NC)"
	docker-compose down --rmi all

prune: ## Remove unused Docker resources
	@echo "$(YELLOW)Pruning unused Docker resources...$(NC)"
	docker system prune -f
	@echo "$(GREEN)✓ Prune complete$(NC)"

# ──────────────────────────────────────────────────────────────────────────────
# Development Helpers
# ──────────────────────────────────────────────────────────────────────────────

setup: ## Initial setup - copy .env, install deps, migrate, seed
	@echo "$(GREEN)Setting up development environment...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)✓ Created .env file$(NC)"; \
	else \
		echo "$(YELLOW)⚠ .env already exists, skipping$(NC)"; \
	fi
	@echo "$(GREEN)Starting services...$(NC)"
	$(MAKE) up
	@echo "$(GREEN)Waiting for services to be healthy...$(NC)"
	@sleep 10
	$(MAKE) migrate
	$(MAKE) seed
	@echo ""
	@echo "$(GREEN)╔═══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║  ✓ Setup Complete!                                            ║$(NC)"
	@echo "$(GREEN)╚═══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(BLUE)Access your application:$(NC)"
	@echo "  Worker Portal:  http://localhost:3000"
	@echo "  Admin Portal:   http://localhost:3001"
	@echo "  API Docs:       http://localhost:8000/docs"
	@echo ""

dev: ## Start development environment (alias for up)
	$(MAKE) up

stop: ## Stop all services (alias for down)
	$(MAKE) down

restart-api: ## Restart API service only
	docker-compose restart api

restart-fraud: ## Restart Fraud service only
	docker-compose restart fraud

restart-trigger: ## Restart Trigger service only
	docker-compose restart trigger
