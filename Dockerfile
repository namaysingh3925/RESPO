# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Stage 1: Base image with Node.js & native compilation build tools
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS base
WORKDIR /app

# Install native build tools for better-sqlite3 and OpenSSL for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    sqlite3 \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# Stage 2: Install dependencies and generate Prisma client
# -----------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# Install all dependencies (clean install)
RUN npm ci

# Generate Prisma Client for the application
RUN npx prisma generate

# -----------------------------------------------------------------------------
# Stage 3: Build the Next.js application
# -----------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/lib/generated ./lib/generated

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Create a throwaway SQLite DB so Next.js can prerender pages that query it.
# The real database is created at container startup by docker-entrypoint.sh.
ENV DATABASE_URL=file:/app/build-tmp.db
RUN npx prisma migrate deploy && npm run build && rm -f /app/build-tmp.db

# -----------------------------------------------------------------------------
# Stage 4: Production runner image
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install runtime dependencies for Prisma and SQLite
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    sqlite3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy built application and runtime dependencies
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Normalize line endings and ensure executable permissions
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

# Create persistent database folder
RUN mkdir -p /app/data

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
