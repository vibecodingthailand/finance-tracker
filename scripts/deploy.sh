#!/usr/bin/env bash
set -euo pipefail

step() { echo "==> $*"; }
note() { echo "    $*"; }

: "${SERVER_IP:?SERVER_IP is required}"
: "${DOMAIN:?DOMAIN is required}"
: "${REMOTE_PATH:?REMOTE_PATH is required}"
RUN_SEED="${RUN_SEED:-0}"

PROJECT="finance-tracker"
IMAGES=("${PROJECT}-backend" "${PROJECT}-frontend" "${PROJECT}-migrator")
SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
REMOTE="root@${SERVER_IP}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

for f in docker-compose.yml nginx.conf; do
  if [ ! -f "$f" ]; then
    echo "Error: $f not found in $REPO_ROOT" >&2
    exit 1
  fi
done

step "Building images for linux/amd64"
DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose -p "$PROJECT" --profile migrate build

step "Saving and shipping images to ${SERVER_IP}"
note "images: ${IMAGES[*]}"
docker save "${IMAGES[@]}" | gzip | ssh "${SSH_OPTS[@]}" "$REMOTE" 'gunzip | docker load'

step "Copying config files to ${REMOTE_PATH}"
ssh "${SSH_OPTS[@]}" "$REMOTE" "mkdir -p ${REMOTE_PATH}"
scp "${SSH_OPTS[@]}" docker-compose.yml nginx.conf "${REMOTE}:${REMOTE_PATH}/"

step "Starting stack on server"
ssh "${SSH_OPTS[@]}" "$REMOTE" "cd ${REMOTE_PATH} && docker compose -p ${PROJECT} up -d"

step "Running database migrations"
ssh "${SSH_OPTS[@]}" "$REMOTE" "cd ${REMOTE_PATH} && docker compose -p ${PROJECT} --profile migrate run --rm migrator"

if [ "$RUN_SEED" = "1" ]; then
  step "Seeding initial data"
  ssh "${SSH_OPTS[@]}" "$REMOTE" "cd ${REMOTE_PATH} && docker compose -p ${PROJECT} --profile migrate run --rm migrator pnpm exec prisma db seed"
else
  note "RUN_SEED != 1 — skipping seed"
fi

step "Health check via https://${DOMAIN}/api/health"
curl -fsS "https://${DOMAIN}/api/health" >/dev/null

echo "✅ Deploy สำเร็จ"
