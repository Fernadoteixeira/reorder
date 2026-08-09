FROM node:20-bookworm-slim

# Install system dependencies needed for native builds, git/patch, and database health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    python3 \
    make \
    g++ \
    curl \
    ca-certificates \
    git \
    patch \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Enable Corepack for Yarn Berry v4
RUN corepack enable && corepack prepare yarn@4.4.1 --activate

# Copy package management files
COPY package.json .yarnrc.yml yarn.lock ./

# Install dependencies using BuildKit cache for instant builds
RUN --mount=type=cache,target=/root/.yarn/berry/cache \
    CI=1 YARN_ENABLE_TELEMETRY=0 YARN_ENABLE_IMMUTABLE_INSTALLS=false \
    corepack yarn install --mode=skip-build

# Copy application source code and configuration
COPY . .

# Ensure entrypoint script has Unix line endings and executable permission
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npx", "medusa", "develop", "--host", "0.0.0.0"]
