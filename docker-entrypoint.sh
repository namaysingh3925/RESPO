#!/bin/sh
set -e

echo "=== Ember House Container Startup ==="

# Ensure storage directories exist
mkdir -p /app/data /app/prisma

# Run Prisma database migrations
echo "[1/3] Applying database migrations..."
npx prisma migrate deploy

# Run seed script to ensure categories, menu items, and admin accounts exist
echo "[2/3] Seeding initial data..."
npm run db:seed

echo "[3/3] Starting Next.js application server on port ${PORT:-3000}..."
exec "$@"
