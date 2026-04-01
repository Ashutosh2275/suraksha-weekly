#!/bin/bash
# PostgreSQL initialization script
# This runs automatically when the container is first created

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "Initializing Suraksha Weekly Database"
echo "═══════════════════════════════════════════════════════════════"

# Create extensions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- UUID extension for generating UUIDs
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- PostGIS extension (if needed for geo data)
    -- CREATE EXTENSION IF NOT EXISTS postgis;
    
    -- pg_trgm for text search
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
EOSQL

echo "✓ Extensions created successfully"

# Create initial schema (basic tables - Alembic will handle the rest)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create enum types
    DO \$\$ BEGIN
        CREATE TYPE user_role AS ENUM ('worker', 'admin');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END \$\$;
    
    DO \$\$ BEGIN
        CREATE TYPE policy_status AS ENUM ('pending', 'active', 'expired', 'cancelled');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END \$\$;
    
    DO \$\$ BEGIN
        CREATE TYPE claim_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'paid');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END \$\$;
    
    -- Create audit log table for tracking changes
    CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100),
        action VARCHAR(50) NOT NULL,
        actor VARCHAR(100),
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        payload JSONB
    );
    
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor);
    
    COMMENT ON TABLE audit_logs IS 'Audit trail for all important actions';
EOSQL

echo "✓ Initial schema created successfully"

echo "═══════════════════════════════════════════════════════════════"
echo "Database initialization complete!"
echo "═══════════════════════════════════════════════════════════════"
