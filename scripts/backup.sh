#!/bin/bash
set -e

DATE=$(date +%Y-%m-%d-%H%M)
BACKUP_DIR="/tmp/reviewrise-backup"
R2_BUCKET="${R2_BUCKET_NAME:-reviewrise-backups}"

mkdir -p "$BACKUP_DIR"

echo "[$DATE] Starting backup..."

# PostgreSQL backup
docker exec reviewrise-postgres pg_dump -U reviewrise reviewrise | gzip > "$BACKUP_DIR/postgres-$DATE.sql.gz"
echo "[$DATE] PostgreSQL dumped"

# Upload to R2 using rclone or aws cli
if command -v aws &> /dev/null; then
  aws s3 cp "$BACKUP_DIR/postgres-$DATE.sql.gz" \
    "s3://$R2_BUCKET/postgres/$DATE.sql.gz" \
    --endpoint-url "${R2_ENDPOINT}" \
    --no-progress
  echo "[$DATE] Uploaded to R2"
fi

# Clean local backup
rm -rf "$BACKUP_DIR"

# Remove backups older than 30 days from R2
echo "[$DATE] Backup complete"
