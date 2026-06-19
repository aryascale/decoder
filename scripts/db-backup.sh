#!/bin/bash

# Navigate to project root relative to script location
cd "$(dirname "$0")/.."

# Load environment variables from .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "❌ .env file not found!"
    exit 1
fi

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
DB_NAME=${MYSQL_DATABASE:-lumpat_db}
ROOT_PASS=${MYSQL_ROOT_PASSWORD:-lumpat2026}
CONTAINER_NAME="lumpat-mysql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "[BACKUP] Starting database backup for '$DB_NAME'..."

# Run mysqldump inside the container and pipe to local file
docker exec "$CONTAINER_NAME" mysqldump -u root -p"$ROOT_PASS" "$DB_NAME" > "$BACKUP_DIR/backup_$TIMESTAMP.sql" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "[SUCCESS] Database backup completed."
    echo "[INFO] File: $BACKUP_DIR/backup_$TIMESTAMP.sql"
    
    # Optional: Keep only last 10 backups
    ls -t "$BACKUP_DIR"/backup_*.sql | tail -n +11 | xargs rm -f 2>/dev/null
else
    echo "[ERROR] Database backup failed. Ensure container '$CONTAINER_NAME' is running."
    exit 1
fi
