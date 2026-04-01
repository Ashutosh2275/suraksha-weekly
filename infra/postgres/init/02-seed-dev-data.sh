#!/bin/bash
# Development seed data
# This only runs on initial database creation

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "Seeding Development Data"
echo "═══════════════════════════════════════════════════════════════"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Insert development audit log entry
    INSERT INTO audit_logs (entity_type, action, actor, payload)
    VALUES (
        'System',
        'DATABASE_INITIALIZED',
        'init-script',
        '{"environment": "development", "timestamp": "now"}'::jsonb
    );
    
    -- Note: Main seed data should be inserted via Alembic migrations
    -- or the application seed script after models are defined
EOSQL

echo "✓ Development data seeded"
echo "═══════════════════════════════════════════════════════════════"
echo "Seed complete - ready for migrations!"
echo "═══════════════════════════════════════════════════════════════"
