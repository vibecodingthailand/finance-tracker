#!/usr/bin/env bash
set -euo pipefail

step() { echo "==> $*"; }
note() { echo "    $*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root (use: sudo $0)" >&2
  exit 1
fi

if [ ! -r /etc/os-release ] || ! grep -q 'ID=ubuntu' /etc/os-release; then
  echo "This script targets Ubuntu (24.04). /etc/os-release does not look like Ubuntu." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

step "Setting system timezone to Asia/Bangkok"
if [ "$(timedatectl show -p Timezone --value)" = "Asia/Bangkok" ]; then
  note "already Asia/Bangkok — skipping"
else
  timedatectl set-timezone Asia/Bangkok
  note "now: $(timedatectl show -p Timezone --value)"
fi

step "apt-get update"
apt-get update -y

step "apt-get upgrade"
apt-get upgrade -y

step "Installing base packages (curl, ca-certificates, ufw)"
apt-get install -y curl ca-certificates ufw

step "Installing Docker Engine (via get.docker.com)"
if command -v docker >/dev/null 2>&1; then
  note "already installed: $(docker --version)"
else
  TMP_DOCKER_SH="$(mktemp --suffix=.sh)"
  trap 'rm -f "$TMP_DOCKER_SH"' EXIT
  curl -fsSL https://get.docker.com -o "$TMP_DOCKER_SH"
  sh "$TMP_DOCKER_SH"
  rm -f "$TMP_DOCKER_SH"
  trap - EXIT
  note "installed: $(docker --version)"
fi

step "Ensuring Docker Compose plugin is present"
if docker compose version >/dev/null 2>&1; then
  note "already present: $(docker compose version --short)"
else
  apt-get install -y docker-compose-plugin
  note "installed: $(docker compose version --short)"
fi

step "Ensuring docker service is enabled and running"
systemctl enable --now docker

step "Installing cloudflared (latest .deb from github releases)"
ARCH="$(dpkg --print-architecture)"
CLOUDFLARED_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}.deb"
TMP_DEB="$(mktemp --suffix=.deb)"
trap 'rm -f "$TMP_DEB"' EXIT

curl -fsSL "$CLOUDFLARED_URL" -o "$TMP_DEB"
NEW_VERSION="$(dpkg-deb -f "$TMP_DEB" Version)"
INSTALLED_VERSION="$(dpkg-query -W -f='${Version}' cloudflared 2>/dev/null || true)"

if [ "$NEW_VERSION" = "$INSTALLED_VERSION" ]; then
  note "cloudflared already at ${INSTALLED_VERSION} — skipping"
else
  note "installing cloudflared ${NEW_VERSION} (previous: ${INSTALLED_VERSION:-none})"
  dpkg -i "$TMP_DEB" || apt-get install -f -y
fi
rm -f "$TMP_DEB"
trap - EXIT

step "Configuring UFW (default deny incoming, allow 22/tcp, enable)"
ufw --force default deny incoming
ufw --force default allow outgoing
ufw allow 22/tcp
if ufw status | grep -q "Status: active"; then
  note "ufw already active — rules reconciled"
else
  ufw --force enable
fi
ufw status verbose

step "Creating /opt/finance-tracker"
mkdir -p /opt/finance-tracker
note "directory: /opt/finance-tracker (owner: $(stat -c '%U:%G' /opt/finance-tracker))"

step "Done"
echo
echo "Versions:"
echo "  docker:       $(docker --version)"
echo "  compose:      $(docker compose version --short)"
echo "  cloudflared:  $(cloudflared --version 2>/dev/null | head -n1)"
echo "  timezone:     $(timedatectl show -p Timezone --value)"
