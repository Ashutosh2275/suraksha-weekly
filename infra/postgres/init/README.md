# PostgreSQL Init Scripts

These scripts run automatically when the PostgreSQL container is first created.

## Execution Order

Scripts are executed in alphabetical order:

1. **01-init-schema.sh** - Creates extensions, enum types, and initial tables
2. **02-seed-dev-data.sh** - Seeds initial development data

## What Gets Created

### Extensions
- `uuid-ossp` - UUID generation
- `pg_trgm` - Text search and similarity

### Enum Types
- `user_role` - worker, admin
- `policy_status` - pending, active, expired, cancelled
- `claim_status` - submitted, under_review, approved, rejected, paid

### Tables
- `audit_logs` - Audit trail for all important actions

## Notes

- Scripts only run on **initial container creation**
- To re-run: `make clean` then `make up`
- Main application tables are created by Alembic migrations
- Seed data for users, policies, etc. should be added via `make seed`

## Testing Scripts

```bash
# Reset and test initialization
make clean
make up
make shell-postgres

# In postgres shell:
\dt              # List tables
\dT+             # List enum types
\dx              # List extensions
SELECT * FROM audit_logs;
```
