# Docker Development Environment

This document describes how to run and develop the `@reorderjs/reorder` plugin inside a containerized Docker environment.

## Overview

The Docker development setup spins up:
- **PostgreSQL 16**: Relational database (mapped to host port `5433:5432` to prevent collision with local instances).
- **Redis 7**: Key-value store and message broker (mapped to host port `6380:6379`).
- **Medusa Server (`reorder-medusa`)**: Node.js 20 container executing the Medusa v2 development server with the Reorder plugin loaded, hot reloading, automated database migrations, link synchronization, and Admin dashboard UI (mapped to host port `9005:9000`).

## Quick Start

### 1. Start Dev Environment

Run Docker Compose from the repository root:

```bash
docker compose up -d --build
```

This will:
1. Build the Node.js 20 container with all dependencies.
2. Start and wait for PostgreSQL and Redis health checks.
3. Compile the plugin source and Admin extensions (`yarn build`).
4. Run database migrations (`npx medusa db:migrate`) and sync links (`npx medusa db:sync-links`).
5. Provision the default admin user:
   - **Email**: `admin@reorder.local`
   - **Password**: `supersecret`
6. Start the Medusa development server on host port `9005` (container port `9000`).

### 2. Access the Application

- **Medusa Admin UI**: [http://localhost:9005/app](http://localhost:9005/app)
- **Health Check API**: [http://localhost:9005/health](http://localhost:9005/health)
- **Store & Admin API**: [http://localhost:9005/admin/...](http://localhost:9005/admin) / [http://localhost:9005/store/...](http://localhost:9005/store)

### 3. View Logs

```bash
docker compose logs -f medusa
```

### 4. Stop Dev Environment

```bash
docker compose down
```

To also remove persisted database volumes:
```bash
docker compose down -v
```

## Seeding Test Data

To seed comprehensive test scenarios across Subscriptions, Plan Offers, Renewals, Dunning, Cancellations, Activity Log, and Analytics:

```bash
docker compose exec medusa npx medusa exec ./scripts/seed-subscriptions-test-data.ts
```

Alternatively, set `SEED_DATABASE=true` in `docker-compose.yml` or your `.env` file before starting the container.

## Resetting Plugin Data

To reset only the Reorder plugin tables and data:

```bash
docker compose exec medusa npx medusa exec ./scripts/reset-reorder-plugin-data.ts
```
