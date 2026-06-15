#!/bin/bash
set -e

echo "=== ReviewRise OS V2 - VPS Setup ==="

# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /opt/reviewrise/{nginx/ssl,scripts}
cd /opt/reviewrise

# Setup SSL with Certbot
apt-get install -y certbot
certbot certonly --standalone -d reviewrise.yourdomain.com --non-interactive --agree-tos -m admin@yourdomain.com
ln -sf /etc/letsencrypt/live/reviewrise.yourdomain.com/fullchain.pem /opt/reviewrise/nginx/ssl/fullchain.pem
ln -sf /etc/letsencrypt/live/reviewrise.yourdomain.com/privkey.pem /opt/reviewrise/nginx/ssl/privkey.pem

# Setup auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet && docker compose -f /opt/reviewrise/docker-compose.yml restart nginx" | crontab -

# Setup firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Setup backup cron
echo "0 2 * * * /opt/reviewrise/scripts/backup.sh >> /var/log/reviewrise-backup.log 2>&1" | crontab -

echo "=== Setup complete! ==="
echo "Next steps:"
echo "1. Copy your .env.production file to /opt/reviewrise/"
echo "2. Copy docker-compose.yml to /opt/reviewrise/"
echo "3. Run: docker compose up -d"
