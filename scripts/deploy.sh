#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<EOF
Usage: SERVER_IP=<ip> DOMAIN=<domain> REMOTE_PATH=<path> bash $0

Required env:
  SERVER_IP    IP/hostname ของ VPS (ssh root@SERVER_IP)
  DOMAIN       domain ที่ route ผ่าน Cloudflare Tunnel (เช่น finance.example.com)
  REMOTE_PATH  path บน server ที่จะวาง compose stack (เช่น /opt/finance-tracker)

Optional env:
  SSH_PORT     ssh port (default: 22)
  SSH_KEY      path ของ ssh private key (default: ssh-agent / ~/.ssh defaults)
  RUN_SEED     ตั้งเป็น 1 เพื่อรัน prisma db seed (ใช้ครั้งแรกเท่านั้น)

Prerequisites:
  - VPS เคยรัน scripts/server-setup.sh + scripts/setup-tunnel.sh แล้ว
  - docker + docker compose ใน local
  - ssh root@SERVER_IP ได้โดยไม่ต้องใส่ password
EOF
  exit 1
}

: "${SERVER_IP:?}" 2>/dev/null || { echo "[deploy] missing SERVER_IP" >&2; usage; }
: "${DOMAIN:?}" 2>/dev/null || { echo "[deploy] missing DOMAIN" >&2; usage; }
: "${REMOTE_PATH:?}" 2>/dev/null || { echo "[deploy] missing REMOTE_PATH" >&2; usage; }

SSH_PORT="${SSH_PORT:-22}"
RUN_SEED="${RUN_SEED:-0}"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 -p "$SSH_PORT")
SCP_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 -P "$SSH_PORT")
if [[ -n "${SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "$SSH_KEY")
  SCP_OPTS+=(-i "$SSH_KEY")
fi

SSH_TARGET="root@${SERVER_IP}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -f docker-compose.yml ]]; then
  echo "[deploy] ไม่พบ docker-compose.yml ที่ $REPO_ROOT" >&2
  exit 1
fi
if [[ ! -f ./nginx.conf ]]; then
  echo "[deploy] ไม่พบ ./nginx.conf ที่ $REPO_ROOT/nginx" >&2
  exit 1
fi

export COMPOSE_PROJECT_NAME="finance-tracker"

IMAGES=(
  "${COMPOSE_PROJECT_NAME}-backend"
  "${COMPOSE_PROJECT_NAME}-frontend"
  "${COMPOSE_PROJECT_NAME}-migrator"
)

echo "[deploy] target: ${SSH_TARGET}:${REMOTE_PATH} (domain ${DOMAIN})"

echo "[deploy] 1/8 build images (linux/amd64)"
DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose --profile migrate build

echo "[deploy] 2/8 ship images -> server (docker save | gzip | ssh | docker load)"
docker save "${IMAGES[@]}" \
  | gzip \
  | ssh "${SSH_OPTS[@]}" "$SSH_TARGET" 'gunzip | docker load'

echo "[deploy] 3/8 sync config files -> ${REMOTE_PATH}"
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "install -d -m 0755 '${REMOTE_PATH}' '${REMOTE_PATH}/nginx'"
scp "${SCP_OPTS[@]}" docker-compose.yml "${SSH_TARGET}:${REMOTE_PATH}/docker-compose.yml"
scp "${SCP_OPTS[@]}" nginx.conf "${SSH_TARGET}:${REMOTE_PATH}/nginx.conf"

echo "[deploy] 4/8 docker compose up -d (ใช้ image ที่ load แล้ว — pull เฉพาะ postgres/nginx)"
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" \
  "cd '${REMOTE_PATH}' && COMPOSE_PROJECT_NAME='${COMPOSE_PROJECT_NAME}' docker compose pull postgres nginx && COMPOSE_PROJECT_NAME='${COMPOSE_PROJECT_NAME}' docker compose up -d"

echo "[deploy] 5/8 รัน database migration (prisma migrate deploy)"
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" \
  "cd '${REMOTE_PATH}' && COMPOSE_PROJECT_NAME='${COMPOSE_PROJECT_NAME}' docker compose --profile migrate run --rm migrator"

if [[ "$RUN_SEED" == "1" ]]; then
  echo "[deploy] 6/8 seed initial data (RUN_SEED=1)"
  ssh "${SSH_OPTS[@]}" "$SSH_TARGET" \
    "cd '${REMOTE_PATH}' && COMPOSE_PROJECT_NAME='${COMPOSE_PROJECT_NAME}' docker compose --profile migrate run --rm migrator pnpm exec prisma db seed"
else
  echo "[deploy] 6/8 ข้าม seed (set RUN_SEED=1 สำหรับ deploy ครั้งแรก)"
fi

echo "[deploy] 7/8 health check https://${DOMAIN}/api/health"
HEALTH_URL="https://${DOMAIN}/api/health"
attempts=0
max_attempts=20
until curl -fsS --max-time 10 "$HEALTH_URL" >/dev/null 2>&1; do
  attempts=$((attempts + 1))
  if (( attempts >= max_attempts )); then
    echo "[deploy] health check fail หลังพยายาม ${max_attempts} ครั้ง — ${HEALTH_URL}" >&2
    echo "[deploy] ลอง ssh เข้าไปดู logs: ssh ${SSH_TARGET} 'cd ${REMOTE_PATH} && docker compose logs --tail=100'" >&2
    exit 1
  fi
  echo "[deploy]   รอ service พร้อม... (${attempts}/${max_attempts})"
  sleep 5
done

echo "[deploy] 8/8 ทุก step ผ่าน"
echo "✅ Deploy สำเร็จ — https://${DOMAIN} พร้อมใช้งาน"
