# Spec: Docker Development Environment for Reorder Plugin

## TLDR & Overview
Provide a complete, containerized Docker development environment for the `@reorderjs/reorder` plugin and its Medusa v2 runtime. The environment runs PostgreSQL 16, Redis 7, and the Medusa server with the Reorder plugin and its Admin dashboard UI, with live-reload support, automated migrations, default admin user creation, and optional deterministic test data seeding.

## Proposed Architecture & Components

### 1. Dockerfile
- Base image: `node:20-bookworm-slim` for stable native compilation and compatibility with SWC / Medusa toolchains.
- Includes `corepack` enabled for Yarn Berry (v4.4.1), `postgresql-client` for connection healthchecks, and essential build tooling.
- Sets working directory to `/app`.
- Configures environment and copies entrypoint script.

### 2. Docker Compose (`docker-compose.yml`)
- `postgres`: `postgres:16-alpine` database service with persistent volume `postgres_data`, custom host port `5433:5432` to avoid host collision, and healthcheck.
- `redis`: `redis:7-alpine` cache/queue service with persistent volume `redis_data`, custom host port `6380:6379`, and healthcheck.
- `medusa`: Node 20 application service running Medusa v2 development server with Reorder plugin loaded, mapped to port `9000:9000`.

### 3. Entrypoint Script (`docker-entrypoint.sh`)
- Waits for PostgreSQL and Redis to be healthy.
- Runs `corepack yarn build` to compile plugin exports and Admin extensions.
- Executes `npx medusa db:migrate` and `npx medusa db:sync-links`.
- Auto-provisions admin credentials (`admin@reorder.local` / `supersecret`) if not present.
- Executes `scripts/seed-subscriptions-test-data.ts` if `SEED_DATABASE=true`.
- Launches `npx medusa develop --host 0.0.0.0` for hot reloading and Admin UI serving at `http://localhost:9000/app`.

### 4. Root Medusa Configuration (`medusa-config.ts`)
- Loads environment variables using `@medusajs/framework/utils`.
- Sets up project configuration with `databaseUrl`, `redisUrl`, and CORS settings.
- Resolves the local plugin package to enable all domain modules, API routes, workflows, links, jobs, and Admin extensions.

### 5. Environment & Ignore Files
- `.dockerignore`: Excludes `node_modules`, `.medusa`, `.git`, coverage, and build artifacts from the build context.
- `.env.example`: Provides standardized environment configuration for Docker and local setups.

## Step-by-Step Implementation Plan

### Phase 1: Configuration & Container Definitions
- Create `medusa-config.ts` in root directory.
- Create `Dockerfile` and `docker-entrypoint.sh`.
- Create `docker-compose.yml`, `.dockerignore`, and `.env.example`.

### Phase 2: Execution & Dev Environment Startup
- Build Docker images using `docker compose build`.
- Spin up the services using `docker compose up -d`.
- Verify database migrations, links sync, admin user creation, and dev server readiness.

### Phase 3: Verification & Documentation
- Test API endpoints: `/health`, `/admin/subscriptions`, `/admin/plan-offers`, etc.
- Verify Medusa Admin UI accessibility at `http://localhost:9000/app`.
- Update runtime documentation in `docs/` with instructions for running and managing the Docker dev environment.
