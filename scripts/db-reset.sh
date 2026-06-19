#!/bin/bash

# Confirmation
echo "------------------------------------------------"
echo "DATABASE RESET PROCEDURE"
echo "------------------------------------------------"
echo "ATTENTION: This operation will:"
echo "1. Create an emergency backup"
echo "2. DELETE ALL DATA from the database"
echo "3. Re-initialize the Prisma schema"
echo "------------------------------------------------"
read -p "Proceed with database reset? (y/N): " confirm

if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
    echo "[ABORT] Operation cancelled by user."
    exit 0
fi

# Navigate to project root relative to script location
cd "$(dirname "$0")/.."

# 1. Emergency Backup
if [ -f "./scripts/db-backup.sh" ]; then
    echo "[PROCESS] Creating emergency backup..."
    bash ./scripts/db-backup.sh
else
    echo "[WARNING] Backup script not found, skipping emergency backup."
fi

# 2. Reset Database using Prisma
echo "[PROCESS] Wiping data and re-applying schema..."
npx prisma db push --force-reset

if [ $? -eq 0 ]; then
    echo "------------------------------------------------"
    echo "[SUCCESS] Database reset complete."
    echo "------------------------------------------------"
else
    echo "------------------------------------------------"
    echo "[ERROR] Database reset failed."
    echo "------------------------------------------------"
    exit 1
fi
