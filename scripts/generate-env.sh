#!/bin/bash
# ============================================================
# ReviewRise OS V2 — Interactive .env.production Generator
# Run: bash scripts/generate-env.sh
# ============================================================
set -euo pipefail

BOLD='\033[1m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; NC='\033[0m'

echo -e "${BOLD}ReviewRise OS V2 — Environment Setup${NC}"
echo "---------------------------------------"
echo "This will create /opt/reviewrise/.env.production"
echo ""

prompt() {
  local var=$1 prompt=$2 default=${3:-}
  if [[ -n $default ]]; then
    read -rp "$(echo -e "${YELLOW}$prompt${NC} [$default]: ")" val
    echo "${val:-$default}"
  else
    read -rp "$(echo -e "${YELLOW}$prompt${NC}: ")" val
    echo "$val"
  fi
}

secret() {
  # Generate a random 48-char secret
  openssl rand -base64 36 | tr -d '\n/+='
}

echo -e "${BOLD}── Domain & Email ──────────────────────────────${NC}"
DOMAIN=$(prompt DOMAIN "Your domain (e.g. app.reviewrise.com)")
ADMIN_EMAIL=$(prompt EMAIL "Admin email")

echo ""
echo -e "${BOLD}── Database ────────────────────────────────────${NC}"
POSTGRES_PASSWORD=$(prompt POSTGRES_PASSWORD "Postgres password" "$(secret)")

echo ""
echo -e "${BOLD}── Redis ───────────────────────────────────────${NC}"
REDIS_PASSWORD=$(prompt REDIS_PASSWORD "Redis password" "$(secret)")

echo ""
echo -e "${BOLD}── Auth ────────────────────────────────────────${NC}"
NEXTAUTH_SECRET=$(secret)
echo -e "  ${GREEN}NEXTAUTH_SECRET auto-generated${NC}"

echo ""
echo -e "${BOLD}── Google OAuth ────────────────────────────────${NC}"
echo "  Get credentials at: https://console.cloud.google.com/apis/credentials"
echo "  Redirect URI: https://$DOMAIN/api/google/callback"
GOOGLE_CLIENT_ID=$(prompt GOOGLE_CLIENT_ID "Google Client ID")
GOOGLE_CLIENT_SECRET=$(prompt GOOGLE_CLIENT_SECRET "Google Client Secret")

echo ""
echo -e "${BOLD}── AI APIs ─────────────────────────────────────${NC}"
ANTHROPIC_API_KEY=$(prompt ANTHROPIC_API_KEY "Anthropic API Key (sk-ant-...)")
OPENAI_API_KEY=$(prompt OPENAI_API_KEY "OpenAI API Key (sk-...) [optional]" "")

echo ""
echo -e "${BOLD}── Cloudflare R2 Storage ───────────────────────${NC}"
echo "  Get from: Cloudflare Dashboard → R2 → Manage API Tokens"
R2_ENDPOINT=$(prompt R2_ENDPOINT "R2 Endpoint (https://ACCOUNT_ID.r2.cloudflarestorage.com)")
R2_ACCESS_KEY=$(prompt R2_ACCESS_KEY_ID "R2 Access Key ID")
R2_SECRET_KEY=$(prompt R2_SECRET_ACCESS_KEY "R2 Secret Access Key")
R2_BUCKET=$(prompt R2_BUCKET_NAME "R2 Bucket Name" "reviewrise")
R2_PUBLIC_URL=$(prompt R2_PUBLIC_URL "R2 Public URL (https://pub-XXX.r2.dev)")

# ── Write file ───────────────────────────────────────────────
mkdir -p /opt/reviewrise
cat > /opt/reviewrise/.env.production << EOF
# ── Database ──────────────────────────────────────────────
DATABASE_URL=postgresql://reviewrise:${POSTGRES_PASSWORD}@postgres:5432/reviewrise
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# ── Redis ────────────────────────────────────────────────
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# ── Auth ─────────────────────────────────────────────────
NEXTAUTH_URL=https://${DOMAIN}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# ── Google ───────────────────────────────────────────────
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
GOOGLE_REDIRECT_URI=https://${DOMAIN}/api/google/callback

# ── AI ───────────────────────────────────────────────────
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
OPENAI_API_KEY=${OPENAI_API_KEY}

# ── Cloudflare R2 ────────────────────────────────────────
R2_ENDPOINT=${R2_ENDPOINT}
R2_ACCESS_KEY_ID=${R2_ACCESS_KEY}
R2_SECRET_ACCESS_KEY=${R2_SECRET_KEY}
R2_BUCKET_NAME=${R2_BUCKET}
R2_PUBLIC_URL=${R2_PUBLIC_URL}

# ── App ──────────────────────────────────────────────────
NODE_ENV=production
EOF

chmod 600 /opt/reviewrise/.env.production
echo ""
echo -e "${GREEN}✔ .env.production written to /opt/reviewrise/.env.production${NC}"
echo -e "${GREEN}✔ File permissions set to 600 (owner-only)${NC}"
echo ""
echo -e "  Next: update ${YELLOW}nginx/nginx.conf${NC} with your domain, then run ${YELLOW}bash scripts/deploy.sh --first-run${NC}"
