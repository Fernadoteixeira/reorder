FROM node:20-bookworm-slim

# Install system dependencies needed for native builds and database health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    python3 \
    make \
    g++ \
    curl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Enable Corepack for Yarn Berry v4
RUN corepack enable && corepack prepare yarn@4.4.1 --activate

# Copy package management files first for efficient layer caching
COPY package.json .yarnrc.yml yarn.lock ./
COPY .yarn/ ./.yarn/

# Install dependencies with skip-build mode to prevent lifecycle patch conflicts
RUN corepack yarn install --mode=skip-build

# Copy application source code and configuration
COPY . .

# Ensure entrypoint script has Unix line endings and executable permission
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npx", "medusa", "develop", "--host", "0.0.0.0"]
