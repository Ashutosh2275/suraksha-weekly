# Alembic Database Migrations

This directory contains SQLAlchemy database migrations managed by Alembic.

## Overview

Alembic is a lightweight database migration tool that works with SQLAlchemy ORM. It allows us to:
- Version control the database schema
- Track incremental changes
- Rollback to previous schema states
- Auto-generate migrations from model changes

## Setup

Alembic is initialized with the following structure:

```
alembic/
├── env.py                  # Migration environment config
├── versions/               # Migration scripts
│   └── 001_initial_schema.py
└── script.py.mako          # Migration template
```

## Initial Migration

The initial migration (`001_initial_schema.py`) creates all 8 tables:

1. **workers** - Gig delivery partner profiles
2. **policies** - Weekly insurance policies
3. **risk_profiles** - Risk assessments
4. **trigger_events** - Disruption events
5. **claims** - Insurance claims
6. **fraud_assessments** - Fraud evaluations
7. **payout_transactions** - Payout records
8. **audit_logs** - Immutable event logs

All tables include:
- Primary keys (UUID strings)
- Indexes on frequently queried columns
- Foreign key constraints
- Unique constraints for idempotency

## Running Migrations

### Automatic (Docker)

When the FastAPI container starts, migrations run automatically via the entrypoint script:

```bash
docker-compose -f infra/docker-compose.yml up -d api
```

### Manual

```bash
# Upgrade to latest migration
alembic upgrade head

# Downgrade one step
alembic downgrade -1

# Check current revision
alembic current

# View migration history
alembic history
```

## Creating New Migrations

### Auto-generate from model changes

```bash
# Detect changes in models and auto-generate migration
alembic revision --autogenerate -m "add_new_column_to_workers"
```

### Manual migration

```bash
# Create empty migration for manual scripting
alembic revision -m "custom_operation_description"
```

Then edit the generated file in `versions/` to add upgrade and downgrade logic.

## Migration Best Practices

1. **Always test downgrades**: Ensure `downgrade()` reverses changes properly
2. **Use explicit naming**: Message should describe the change (e.g., "add_fraud_score_column")
3. **One logical change per migration**: Avoid mixing unrelated schema changes
4. **Data migrations**: For data changes, add logic in `upgrade()` before/after schema changes
5. **Idempotency**: Migrations should be safe to run multiple times

## Troubleshooting

### Migration conflicts

If two migrations modify the same table, resolve by:
1. Rebase migrations
2. Combine conflicting migrations into one

### Database connection issues

If migrations fail to connect:
- Verify `DATABASE_URL` in `.env` or docker-compose environment
- Check PostgreSQL is running and healthy
- Ensure user credentials are correct

### Schema drift

If your database schema differs from migrations:
1. Check `alembic_version` table for current revision
2. Compare with model definitions in `services/api/models/`
3. Create a migration to sync schema if needed

## References

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy ORM Models](../models/__init__.py)
- [FastAPI Startup Hook](../app.py)
