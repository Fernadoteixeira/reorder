#!/bin/sh
set -e

echo "[docker-entrypoint] Starting Reorder Medusa dev container..."

# Extract Postgres host and port from DATABASE_URL if available
PG_HOST="${POSTGRES_HOST:-postgres}"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_USER="${POSTGRES_USER:-postgres}"

echo "[docker-entrypoint] Waiting for PostgreSQL at ${PG_HOST}:${PG_PORT}..."
until pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" > /dev/null 2>&1; do
  echo "[docker-entrypoint] PostgreSQL is unavailable - sleeping 1s"
  sleep 1
done
echo "[docker-entrypoint] PostgreSQL is up and ready!"

# Build plugin and admin extensions
echo "[docker-entrypoint] Compiling plugin source and admin extensions..."
corepack yarn build

# Run database migrations
echo "[docker-entrypoint] Running database migrations..."
npx medusa db:migrate

# Sync entity links
echo "[docker-entrypoint] Synchronizing entity links..."
npx medusa db:sync-links

# Provision default admin user if configured
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@reorder.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-supersecret}"

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo "[docker-entrypoint] Ensuring admin user ${ADMIN_EMAIL} exists..."
  npx medusa user -e "$ADMIN_EMAIL" -p "$ADMIN_PASSWORD" || echo "[docker-entrypoint] Admin user already exists or skipped."
fi

# Optional data seeding
if [ "$SEED_DATABASE" = "true" ]; then
  echo "[docker-entrypoint] Seeding subscriptions and domain test data..."
  npx medusa exec ./scripts/seed-subscriptions-test-data.ts || echo "[docker-entrypoint] Seeding encountered an error or already seeded."
fi

echo "[docker-entrypoint] Starting Medusa development server..."
exec "$@"
