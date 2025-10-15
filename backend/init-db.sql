-- Initialize PostgreSQL database with pgvector extension

-- Create pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension is installed
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Set timezone
SET timezone = 'UTC';

-- Create initial schema (will be managed by Alembic migrations later)
-- This file is mainly for extension setup
