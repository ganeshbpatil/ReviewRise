#!/bin/bash
# ============================================================
# ReviewRise OS V2 — Database Backup to Cloudflare R2
# Runs daily at 2am via cron
# ============================================================
set -euo pipefail

APP_DIR="/opt/reviewrise"
DATE=$(date +%Y-%m-%d-%H%M%S)
BACKUP_FILE="postgres-${DATE}.sql.gz"
BACKUP_PATH="/tmp/${BACKUP_FILE}"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

# Load env
set -a
source "$APP_DIR/.env.production"
set +a

echo "$LOG_PREFIX Starting backup..."

# ── Dump PostgreSQL ───────────────────────────────────────────
docker exec reviewrise-postgres \
  pg_dump -U reviewrise -d reviewrise \
  --clean --if-exists --no-owner --no-acl \
  | gzip -9 > "$BACKUP_PATH"

SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
echo "$LOG_PREFIX Dump complete: $BACKUP_FILE ($SIZE)"

# ── Upload to R2 ─────────────────────────────────────────────
aws s3 cp "$BACKUP_PATH" \
  "s3://${R2_BUCKET_NAME}/backups/postgres/${BACKUP_FILE}" \
  --endpoint-url "$R2_ENDPOINT" \
  --no-progress \
  --storage-class STANDARD

echo "$LOG_PREFIX Uploaded to R2: backups/postgres/$BACKUP_FILE"

# ── Clean local temp ─────────────────────────────────────────
rm -f "$BACKUP_PATH"

# ── Prune R2 backups older than 30 days ──────────────────────
CUTOFF=$(date -d '30 days ago' +%Y-%m-%d 2>/dev/null || date -v-30d +%Y-%m-%d)
echo "$LOG_PREFIX Pruning backups older than $CUTOFF..."

aws s3 ls "s3://${R2_BUCKET_NAME}/backups/postgres/" \
  --endpoint-url "$R2_ENDPOINT" \
  | awk '{print $4}' \
  | while read -r key; do
      KEY_DATE=$(echo "$key" | grep -oP '\d{4}-\d{2}-\d{2}' | head -1 || true)
      if [[ -n "$KEY_DATE" && "$KEY_DATE" < "$CUTOFF" ]]; then
        aws s3 rm "s3://${R2_BUCKET_NAME}/backups/postgres/$key" \
          --endpoint-url "$R2_ENDPOINT" --quiet
        echo "$LOG_PREFIX Deleted old backup: $key"
      fi
    done

echo "$LOG_PREFIX Backup complete"
