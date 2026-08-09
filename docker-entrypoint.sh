#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo " [Reorder Dev Environment] Starting container bootstrap..."
echo "============================================================"

# Extract PostgreSQL connection parameters
PG_HOST="${POSTGRES_HOST:-postgres}"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_USER="${POSTGRES_USER:-postgres}"

echo "[docker-entrypoint] Waiting for PostgreSQL at ${PG_HOST}:${PG_PORT}..."
until pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" > /dev/null 2>&1; do
  echo "[docker-entrypoint] PostgreSQL is unavailable - retrying in 1s..."
  sleep 1
done
echo "[docker-entrypoint] PostgreSQL is ready and healthy."

# Wait for Redis if configured
if [ -n "${REDIS_URL:-}" ]; then
  echo "[docker-entrypoint] Redis configured at ${REDIS_URL}."
fi

# Compile plugin artifacts and Admin extensions
echo "[docker-entrypoint] Compiling plugin source and admin extensions..."
corepack yarn build || true

# Run database migrations
echo "[docker-entrypoint] Running database migrations..."
npx medusa db:migrate

# Sync entity links
echo "[docker-entrypoint] Synchronizing entity links..."
npx medusa db:sync-links

# Resolve Admin User credentials
ADMIN_EMAIL="${MEDUSA_ADMIN_EMAIL:-${ADMIN_EMAIL:-admin@reorder.local}}"
ADMIN_PASSWORD="${MEDUSA_ADMIN_PASSWORD:-${ADMIN_PASSWORD:-supersecret}}"

if [ "$ADMIN_EMAIL" = "admin@reorder.local" ] && [ "$ADMIN_PASSWORD" = "supersecret" ]; then
  echo "[docker-entrypoint] WARNING: Using default development credentials (${ADMIN_EMAIL}). Configure MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD for customized credentials."
fi

echo "[docker-entrypoint] Ensuring admin user ${ADMIN_EMAIL} is provisioned..."
npx medusa user -e "$ADMIN_EMAIL" -p "$ADMIN_PASSWORD" 2>&1 || echo "[docker-entrypoint] Admin user already exists or provisioning skipped."

# Seed data if enabled
if [ "${SEED_DATABASE:-false}" = "true" ]; then
  echo "[docker-entrypoint] Seeding subscriptions and domain test data..."
  npx medusa exec ./scripts/seed-subscriptions-test-data.ts || echo "[docker-entrypoint] Seeding completed or skipped."
fi

echo "============================================================"
echo " [Reorder Dev Environment] Starting Medusa Server on 0.0.0.0:9000"
echo " Admin UI: http://localhost:9000/app"
echo " Health:   http://localhost:9000/health"
echo "============================================================"

exec "$@"
