# ReviewRise OS V2 — Hostinger VPS Deployment Guide

## Prerequisites

- Hostinger VPS: **Ubuntu 22.04 LTS**, minimum **2 vCPU / 4 GB RAM / 40 GB SSD**  
  *(KVM 2 or higher — avoid OpenVZ, Docker requires KVM)*
- A domain pointed at your VPS IP (A record)
- GitHub account with the ReviewRise repo
- Google Cloud Console project with OAuth 2.0 credentials
- Anthropic API key
- Cloudflare R2 bucket

---

## Step 1 — Buy & Access Hostinger VPS

1. Go to **hostinger.com → VPS Hosting**
2. Choose **KVM 2** (2 vCPU, 8 GB RAM) or higher
3. Select **Ubuntu 22.04** as the OS
4. Set root password during checkout
5. SSH into your server:
   ```bash
   ssh root@YOUR_VPS_IP
   ```

---

## Step 2 — Point Your Domain

In your domain registrar (or Hostinger DNS):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` or `app` | `YOUR_VPS_IP` | 300 |
| A | `www` | `YOUR_VPS_IP` | 300 |

Wait for DNS to propagate (up to 10 min). Verify:
```bash
dig +short app.yourdomain.com
```

---

## Step 3 — Run the Server Installer

```bash
# SSH into VPS as root
ssh root@YOUR_VPS_IP

# Download and run installer
curl -fsSL https://raw.githubusercontent.com/ganeshbpatil/ReviewRise/main/scripts/install.sh \
  | DOMAIN=app.yourdomain.com EMAIL=you@email.com bash
```

This installs: Docker, Docker Compose, Node.js, UFW firewall, Fail2ban, Certbot SSL, cron jobs, systemd service.

---

## Step 4 — Clone the Repository

```bash
cd /opt/reviewrise
git clone https://github.com/ganeshbpatil/ReviewRise.git .
```

---

## Step 5 — Configure Environment

```bash
bash scripts/generate-env.sh
```

This interactive wizard creates `/opt/reviewrise/.env.production`. You'll need:

| Variable | Where to get it |
|----------|----------------|
| `GOOGLE_CLIENT_ID` | console.cloud.google.com → APIs → Credentials → OAuth 2.0 Client |
| `GOOGLE_CLIENT_SECRET` | Same as above |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `R2_ENDPOINT` | Cloudflare → R2 → Manage API Tokens |
| `R2_ACCESS_KEY_ID` | Same as above |
| `R2_SECRET_ACCESS_KEY` | Same as above |
| `R2_PUBLIC_URL` | Cloudflare → R2 → bucket → Settings → Public URL |

**Google OAuth setup:**
1. console.cloud.google.com → Create Project
2. APIs & Services → Enable: **Google My Business API**, **OAuth 2.0**
3. Credentials → Create OAuth Client → Web App
4. Authorized redirect URIs: `https://app.yourdomain.com/api/google/callback`
5. Copy Client ID + Secret into env generator

---

## Step 6 — Update Nginx Domain

```bash
sed -i 's/REPLACE_WITH_YOUR_DOMAIN/app.yourdomain.com/g' /opt/reviewrise/nginx/nginx.conf
```

---

## Step 7 — Create Data Directories

```bash
mkdir -p /opt/reviewrise/data/{postgres,redis}
chown -R reviewrise:reviewrise /opt/reviewrise/data
```

---

## Step 8 — First Deploy

```bash
cd /opt/reviewrise
bash scripts/deploy.sh --first-run
```

This will:
1. Build Docker images
2. Start Postgres + Redis
3. Run `prisma migrate deploy`
4. Run database seed (creates demo admin)
5. Start all 5 containers
6. Verify health check

---

## Step 9 — Verify Deployment

```bash
# All containers running
docker compose ps

# App health
curl https://app.yourdomain.com/api/health

# View logs
docker compose logs -f app

# Check Nginx
docker compose logs nginx
```

Open `https://app.yourdomain.com` in your browser.

**Demo login:**
- Email: `admin@demo.agency`
- Password: `Password123!`

⚠️ Change the demo password immediately in Settings.

---

## Step 10 — GitHub Actions CI/CD (optional)

Add these secrets to your GitHub repo (Settings → Secrets → Actions):

| Secret | Value |
|--------|-------|
| `VPS_HOST` | Your VPS IP |
| `VPS_USER` | `root` or `reviewrise` |
| `VPS_SSH_KEY` | Your private SSH key |

Generate an SSH key pair:
```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/reviewrise_deploy
cat ~/.ssh/reviewrise_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/reviewrise_deploy   # paste this as VPS_SSH_KEY secret
```

Every push to `main` will now auto-deploy.

---

## Day-to-Day Operations

```bash
cd /opt/reviewrise

make status          # show container status
make logs            # follow all logs
make logs-app        # app logs only
make health          # check app health
make restart         # restart app + worker (zero-downtime)
make update          # pull latest code + redeploy
make db              # open Postgres shell
make redis           # open Redis shell
make backup          # run backup now
make stats           # show resource usage
make clean           # remove unused Docker images
```

---

## Monitoring

```bash
# CPU/Memory live
htop

# Disk usage
df -h

# Docker resource usage
docker stats

# Recent errors
docker compose logs app --since 1h | grep -i error

# Nginx access log
make nginx-logs
```

---

## Troubleshooting

| Symptom | Command |
|---------|---------|
| App not starting | `docker compose logs app` |
| Database error | `docker compose logs postgres` |
| SSL error | `certbot renew --dry-run` |
| Worker not processing | `docker compose logs worker` |
| Nginx 502 | `docker compose restart app && sleep 10 && make health` |
| Out of disk | `make clean && docker volume prune -f` |
| Out of memory | `free -h` then `make stats` |

---

## VPS Sizing Guide

| Clients | RAM | CPU | Storage |
|---------|-----|-----|---------|
| 1–50 | 4 GB | 2 vCPU | 40 GB |
| 50–200 | 8 GB | 4 vCPU | 80 GB |
| 200–500 | 16 GB | 6 vCPU | 160 GB |
| 500–1000 | 32 GB | 8 vCPU | 320 GB |
| 1000+ | Managed Postgres + separate Redis | | |
