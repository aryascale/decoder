#!/bin/bash
# ==========================================
# LUMPAT - STAGING DEPLOYMENT SCRIPT
# ==========================================
# Script to automate deployment on VPS for Staging
# Execute with: bash scripts/deploy-staging.sh
# ==========================================

set -e

# Navigate to project root relative to script location
cd "$(dirname "$0")/.."

echo "[1/5] Fetching latest updates from Git repository..."
git fetch origin
git reset --hard origin/main

echo "[2/5] Navigating to docker directory..."
cd docker || exit 1

echo "[3/5] Rebuilding and starting staging containers..."
docker compose -f docker-compose.staging.yml up -d --build

echo "[4/5] Waiting for database to be ready..."
# Wait for MySQL to respond on its port inside the network
for i in {1..30}; do
  if docker exec lumpat-app-staging nc -z mysql-staging 3306; then
    echo "Staging Database is up and running!"
    break
  fi
  echo "Waiting for staging database... ($i/30)"
  sleep 2
done

echo "[5/5] Synchronizing database schema for staging..."
docker exec lumpat-app-staging npx prisma db push --accept-data-loss

echo "=========================================="
echo "Staging deployment process completed successfully."
echo "=========================================="
