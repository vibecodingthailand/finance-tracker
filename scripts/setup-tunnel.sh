#!/usr/bin/env bash
set -euo pipefail

step() { echo "==> $*"; }
note() { echo "    $*"; }

usage() {
  cat <<USAGE >&2
Usage: $0 <TUNNEL_ID> <DOMAIN>

  TUNNEL_ID   UUID of an existing cloudflared tunnel (from \`cloudflared tunnel create ...\`)
  DOMAIN      Hostname to route to the tunnel (root domain or subdomain)

Run as root after \`cloudflared login\` and \`cloudflared tunnel create <name>\` are done.
USAGE
  exit 1
}

if [ "$#" -ne 2 ]; then
  usage
fi

TUNNEL_ID="$1"
DOMAIN="$2"

if ! [[ "$TUNNEL_ID" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]]; then
  echo "Error: TUNNEL_ID must be a UUID (got: $TUNNEL_ID)" >&2
  usage
fi

if ! [[ "$DOMAIN" =~ ^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$ ]]; then
  echo "Error: DOMAIN does not look like a valid hostname (got: $DOMAIN)" >&2
  usage
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root (use: sudo $0 ...)" >&2
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Error: cloudflared not installed. Run scripts/server-setup.sh first." >&2
  exit 1
fi

CREDENTIALS_FILE="/root/.cloudflared/${TUNNEL_ID}.json"
if [ ! -f "$CREDENTIALS_FILE" ]; then
  echo "Error: credentials file not found at $CREDENTIALS_FILE" >&2
  echo "       did you run \`cloudflared tunnel create ...\` as this user?" >&2
  exit 1
fi

step "Writing /etc/cloudflared/config.yml"
mkdir -p /etc/cloudflared
cat > /etc/cloudflared/config.yml <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CREDENTIALS_FILE}
ingress:
  - hostname: ${DOMAIN}
    service: http://localhost:8080
  - service: http_status:404
EOF
note "wrote tunnel=${TUNNEL_ID}, hostname=${DOMAIN}"

step "Routing DNS for ${DOMAIN} to tunnel ${TUNNEL_ID}"
cloudflared tunnel route dns --overwrite-dns "$TUNNEL_ID" "$DOMAIN"

step "Installing cloudflared as a systemd service"
if [ -f /etc/systemd/system/cloudflared.service ] || systemctl list-unit-files cloudflared.service >/dev/null 2>&1 \
     && systemctl list-unit-files cloudflared.service | grep -q '^cloudflared\.service'; then
  note "service unit already present — skipping \`cloudflared service install\`"
else
  cloudflared service install
fi

step "Enabling and starting cloudflared"
systemctl daemon-reload
systemctl enable cloudflared
systemctl restart cloudflared

step "Verifying"
sleep 2
systemctl status cloudflared --no-pager
