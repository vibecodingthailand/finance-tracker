#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/finance-tracker
BACKUP_DIR=/opt/backups
LOG_FILE=/var/log/finance-backup.log
RETENTION_DAYS=30

export COMPOSE_PROJECT_NAME=finance-tracker

mkdir -p "$BACKUP_DIR"
touch "$LOG_FILE"

exec >>"$LOG_FILE" 2>&1

ts() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(ts)] $*"; }

trap 'log "ERROR: backup failed at line $LINENO (exit $?)"' ERR

DATE=$(date +%F)
OUT="$BACKUP_DIR/finance_${DATE}.sql.gz"

log "start backup -> $OUT"

cd "$APP_DIR"
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  | gzip > "$OUT"

if [[ ! -s "$OUT" ]]; then
  log "ERROR: backup file empty"
  rm -f "$OUT"
  exit 1
fi

SIZE=$(du -h "$OUT" | cut -f1)
log "backup ok ($SIZE)"

PRUNED=$(find "$BACKUP_DIR" -name 'finance_*.sql.gz' -type f -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
log "pruned ${PRUNED} old backup(s) (>${RETENTION_DAYS} days)"
log "done"
