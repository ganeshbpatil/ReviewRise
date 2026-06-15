#!/bin/bash
# ============================================================
# ReviewRise OS V2 — Deploy / Update Script
# Run as root or reviewrise user from /opt/reviewrise
# Usage: bash deploy.sh [--first-run]
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✘]${NC] $1"; exit 1; }
info() { echo -e "${BLUE}[→]${NC} $1"; }

APP_DIR="/opt/reviewrise"
FIRST_RUN=false
[[ "${1:-}" == "--first-run" ]] && FIRST_RUN=true

cd "$APP_DIR"

# ── Env check ────────────────────────────────────────────────
[[ ! -f .env.production ]] && err ".env.production not found. Copy and fill .env.example first."

# ── Pull latest code ─────────────────────────────────────────
info "Pulling latest code..."
if [[ -d .git ]]; then
  git fetch origin main
  git reset --hard origin/main
  log "Code updated"
else
  warn "Not a git repo — skipping pull (manual deployment mode)"
fi

# ── Build Docker images ───────────────────────────────────────
info "Building Docker images..."
docker compose build --no-cache
log "Images built"

# ── Database migrations ───────────────────────────────────────
info "Running database migrations..."
docker compose run --rm app sh -c "npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss"
log "Migrations complete"

# ── Seed (first run only) ─────────────────────────────────────
if $FIRST_RUN; then
  info "Running database seed..."
  docker compose run --rm app sh -c "npx tsx scripts/seed.ts"
  log "Seed complete"
fi

# ── Start / Restart services ──────────────────────────────────
info "Starting services..."
docker compose up -d --remove-orphans
log "Services started"

# ── Wait for health ───────────────────────────────────────────
info "Waiting for app to be healthy..."
attempt=0
until curl -sf http://localhost:3000/api/health >/dev/null 2>&1; do
  attempt=$((attempt+1))
  [[ $attempt -ge 30 ]] && err "App failed to start after 60s. Check logs: docker compose logs app"
  sleep 2
done
log "App is healthy"

# ── Show status ───────────────────────────────────────────────
echo ""
docker compose ps
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║   Deployment SUCCESS                             ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  App     : ${YELLOW}https://$(grep NEXTAUTH_URL .env.production | cut -d= -f2 | sed 's|https://||')${NC}"
echo -e "  Health  : ${YELLOW}https://$(grep NEXTAUTH_URL .env.production | cut -d= -f2 | sed 's|https://||')/api/health${NC}"
echo ""
echo -e "  Logs    : ${BLUE}docker compose logs -f app${NC}"
echo -e "  Shell   : ${BLUE}docker compose exec app sh${NC}"
echo -e "  DB      : ${BLUE}docker compose exec postgres psql -U reviewrise reviewrise${NC}"
echo ""
