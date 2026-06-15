#!/bin/bash
# ============================================================
# ReviewRise OS V2 — Hostinger VPS Full Install Script
# Run as root: bash install.sh
# ============================================================
set -euo pipefail

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✘]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[→]${NC} $1"; }

# ── Require root ─────────────────────────────────────────────
[[ $EUID -ne 0 ]] && err "Run this script as root: sudo bash install.sh"

# ── Config ───────────────────────────────────────────────────
APP_DIR="/opt/reviewrise"
APP_USER="reviewrise"
DOMAIN="${DOMAIN:-your-domain.com}"
EMAIL="${EMAIL:-admin@your-domain.com}"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     ReviewRise OS V2 — VPS Installer             ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Domain : ${YELLOW}$DOMAIN${NC}"
echo -e "  Email  : ${YELLOW}$EMAIL${NC}"
echo -e "  AppDir : ${YELLOW}$APP_DIR${NC}"
echo ""
read -rp "Continue? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || exit 0

# ── 1. System update ─────────────────────────────────────────
info "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget git unzip gnupg lsb-release ca-certificates \
  ufw fail2ban htop nano jq cron awscli

log "System packages installed"

# ── 2. Docker ────────────────────────────────────────────────
info "Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  log "Docker installed"
else
  log "Docker already installed ($(docker --version))"
fi

# ── 3. Docker Compose v2 ─────────────────────────────────────
info "Installing Docker Compose..."
if ! docker compose version &>/dev/null; then
  COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)
  curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  log "Docker Compose $COMPOSE_VERSION installed"
else
  log "Docker Compose already installed"
fi

# ── 4. App user ──────────────────────────────────────────────
info "Creating app user..."
if ! id "$APP_USER" &>/dev/null; then
  useradd -m -s /bin/bash -G docker "$APP_USER"
  log "User '$APP_USER' created"
else
  usermod -aG docker "$APP_USER"
  log "User '$APP_USER' already exists"
fi

# ── 5. App directory ─────────────────────────────────────────
info "Setting up app directory..."
mkdir -p "$APP_DIR"/{nginx/ssl,logs,backups,scripts}
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
chmod 750 "$APP_DIR"
log "Directory $APP_DIR ready"

# ── 6. Node.js 20 (for running migrations) ───────────────────
info "Installing Node.js 20..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
  log "Node.js $(node --version) installed"
else
  log "Node.js $(node --version) already installed"
fi

# ── 7. Firewall ──────────────────────────────────────────────
info "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
log "Firewall configured"

# ── 8. Fail2ban ──────────────────────────────────────────────
info "Configuring Fail2ban..."
cat > /etc/fail2ban/jail.local << 'FAIL2BAN'
[sshd]
enabled  = true
port     = ssh
maxretry = 5
bantime  = 3600
findtime = 600

[nginx-http-auth]
enabled  = true
FAIL2BAN
systemctl enable --now fail2ban
log "Fail2ban configured"

# ── 9. Certbot SSL ───────────────────────────────────────────
info "Installing Certbot..."
if ! command -v certbot &>/dev/null; then
  apt-get install -y -qq certbot
  log "Certbot installed"
fi

info "Obtaining SSL certificate for $DOMAIN..."
if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  # Stop nginx if running on 80
  systemctl stop nginx 2>/dev/null || true
  docker stop reviewrise-nginx 2>/dev/null || true

  certbot certonly --standalone \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    -m "$EMAIL" \
    --expand
  log "SSL certificate obtained"
else
  log "SSL certificate already exists"
fi

# Link certs for Docker
ln -sf "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$APP_DIR/nginx/ssl/fullchain.pem"
ln -sf "/etc/letsencrypt/live/$DOMAIN/privkey.pem"   "$APP_DIR/nginx/ssl/privkey.pem"
log "SSL certs linked to $APP_DIR/nginx/ssl/"

# ── 10. Auto-renew SSL ───────────────────────────────────────
cat > /etc/cron.d/certbot-renew << CRON
0 3 * * * root certbot renew --quiet --post-hook "docker compose -f $APP_DIR/docker-compose.yml restart nginx"
CRON
log "SSL auto-renewal cron set"

# ── 11. Backup cron ──────────────────────────────────────────
cat > /etc/cron.d/reviewrise-backup << CRON
0 2 * * * $APP_USER $APP_DIR/scripts/backup.sh >> $APP_DIR/logs/backup.log 2>&1
CRON
log "Backup cron scheduled (2am daily)"

# ── 12. Log rotation ─────────────────────────────────────────
cat > /etc/logrotate.d/reviewrise << LOGROTATE
$APP_DIR/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 $APP_USER $APP_USER
}
LOGROTATE
log "Log rotation configured"

# ── 13. Systemd watchdog ─────────────────────────────────────
cat > /etc/systemd/system/reviewrise.service << SERVICE
[Unit]
Description=ReviewRise OS V2
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
User=$APP_USER
ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose down
Restart=on-failure
RestartSec=10s
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
SERVICE
systemctl daemon-reload
systemctl enable reviewrise.service
log "Systemd service enabled (auto-start on boot)"

# ── 14. Swap (for low-RAM VPS) ───────────────────────────────
if [[ ! -f /swapfile ]]; then
  RAM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
  if [[ $RAM_MB -lt 2048 ]]; then
    info "Low RAM detected (${RAM_MB}MB). Creating 2GB swap..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    log "Swap created"
  fi
fi

# ── Done ─────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║   Server setup COMPLETE                          ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Next step: run ${YELLOW}bash deploy.sh${NC}"
echo ""
