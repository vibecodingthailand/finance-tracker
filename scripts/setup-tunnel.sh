#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<EOF
Usage: sudo bash $0 <TUNNEL_ID> <DOMAIN>

Args:
  TUNNEL_ID   UUID ของ tunnel ที่สร้างไว้แล้วด้วย 'cloudflared tunnel create'
  DOMAIN      root domain หรือ subdomain ที่จะ route เข้า tunnel
              (เช่น finance.example.com หรือ example.com)

Prerequisites (รันก่อน script นี้):
  1. cloudflared tunnel login
  2. cloudflared tunnel create finance-tracker
     -> ได้ UUID มาใส่เป็น TUNNEL_ID
EOF
  exit 1
}

if [[ $EUID -ne 0 ]]; then
  echo "[setup-tunnel] ต้องรันด้วย root (sudo bash $0 ...)" >&2
  exit 1
fi

if [[ $# -ne 2 ]]; then
  usage
fi

TUNNEL_ID="$1"
DOMAIN="$2"

if [[ -z "$TUNNEL_ID" || -z "$DOMAIN" ]]; then
  usage
fi

if [[ ! "$TUNNEL_ID" =~ ^[0-9a-fA-F-]{36}$ ]]; then
  echo "[setup-tunnel] TUNNEL_ID ไม่ใช่ UUID ที่ถูกต้อง: $TUNNEL_ID" >&2
  exit 1
fi

CREDENTIALS_FILE="/root/.cloudflared/${TUNNEL_ID}.json"
if [[ ! -f "$CREDENTIALS_FILE" ]]; then
  echo "[setup-tunnel] ไม่พบ credentials file: $CREDENTIALS_FILE" >&2
  echo "[setup-tunnel] รัน 'cloudflared tunnel create finance-tracker' ก่อน" >&2
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "[setup-tunnel] ไม่พบ cloudflared — รัน scripts/server-setup.sh ก่อน" >&2
  exit 1
fi

echo "[setup-tunnel] 1/5 สร้าง /etc/cloudflared/config.yml"
install -d -m 0755 /etc/cloudflared
cat >/etc/cloudflared/config.yml <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CREDENTIALS_FILE}
ingress:
  - hostname: ${DOMAIN}
    service: http://localhost:8080
  - service: http_status:404
EOF
chmod 0644 /etc/cloudflared/config.yml

echo "[setup-tunnel] 2/5 route DNS: ${DOMAIN} -> finance-tracker tunnel"
cloudflared tunnel route dns finance-tracker "${DOMAIN}"

echo "[setup-tunnel] 3/5 ติดตั้ง cloudflared เป็น systemd service"
if systemctl list-unit-files cloudflared.service >/dev/null 2>&1 \
   && systemctl is-enabled cloudflared >/dev/null 2>&1; then
  echo "[setup-tunnel]   service ติดตั้งแล้ว — restart เพื่อ reload config ใหม่"
  systemctl restart cloudflared
else
  cloudflared service install
fi

echo "[setup-tunnel] 4/5 enable + start cloudflared"
systemctl enable cloudflared
systemctl start cloudflared

echo "[setup-tunnel] 5/5 verify status"
systemctl status cloudflared --no-pager || true

echo "[setup-tunnel] เสร็จเรียบร้อย — tunnel ${TUNNEL_ID} -> ${DOMAIN} -> http://localhost:8080"
