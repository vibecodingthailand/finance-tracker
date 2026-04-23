#!/usr/bin/env bash
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "[server-setup] ต้องรันด้วย root (sudo bash $0)" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "[server-setup] 1/8 apt update + upgrade"
apt-get update -y
apt-get upgrade -y

echo "[server-setup] 2/8 ติดตั้ง prerequisite packages (curl, ca-certificates, ufw)"
apt-get install -y curl ca-certificates ufw

echo "[server-setup] 3/8 ตั้ง timezone เป็น Asia/Bangkok"
current_tz="$(timedatectl show -p Timezone --value 2>/dev/null || echo "")"
if [[ "$current_tz" != "Asia/Bangkok" ]]; then
  timedatectl set-timezone Asia/Bangkok
  echo "[server-setup]   timezone เปลี่ยนเป็น Asia/Bangkok แล้ว"
else
  echo "[server-setup]   timezone เป็น Asia/Bangkok อยู่แล้ว ข้าม"
fi

echo "[server-setup] 4/8 ติดตั้ง Docker (get.docker.com)"
if command -v docker >/dev/null 2>&1; then
  echo "[server-setup]   Docker ติดตั้งแล้ว ($(docker --version)) ข้าม"
else
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sh /tmp/get-docker.sh
  rm -f /tmp/get-docker.sh
fi

systemctl enable --now docker

echo "[server-setup] 5/8 ตรวจสอบ docker compose plugin"
if docker compose version >/dev/null 2>&1; then
  echo "[server-setup]   docker compose plugin มีอยู่แล้ว ($(docker compose version --short)) ข้าม"
else
  apt-get install -y docker-compose-plugin
fi

echo "[server-setup] 6/8 ติดตั้ง cloudflared (.deb ล่าสุดจาก GitHub)"
if command -v cloudflared >/dev/null 2>&1; then
  echo "[server-setup]   cloudflared ติดตั้งแล้ว ($(cloudflared --version 2>&1 | head -n1)) ข้าม"
else
  arch="$(dpkg --print-architecture)"
  deb_url="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${arch}.deb"
  tmp_deb="$(mktemp --suffix=.deb)"
  echo "[server-setup]   ดาวน์โหลด $deb_url"
  curl -fsSL -o "$tmp_deb" "$deb_url"
  apt-get install -y "$tmp_deb"
  rm -f "$tmp_deb"
fi

echo "[server-setup] 7/8 ตั้งค่า ufw (default deny incoming, allow 22/tcp)"
ufw --force default deny incoming
ufw --force default allow outgoing
ufw allow 22/tcp
if ufw status | grep -q "Status: active"; then
  echo "[server-setup]   ufw active อยู่แล้ว reload rules"
  ufw --force reload
else
  ufw --force enable
fi

echo "[server-setup] 8/8 สร้าง /opt/finance-tracker"
install -d -m 0755 /opt/finance-tracker

echo "[server-setup] เสร็จเรียบร้อย"
echo "[server-setup]   docker:        $(docker --version)"
echo "[server-setup]   compose:       $(docker compose version --short 2>/dev/null || echo 'n/a')"
echo "[server-setup]   cloudflared:   $(cloudflared --version 2>&1 | head -n1)"
echo "[server-setup]   timezone:      $(timedatectl show -p Timezone --value)"
echo "[server-setup]   app dir:       /opt/finance-tracker"
