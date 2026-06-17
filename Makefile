# ReviewRise OS V2 — Makefile (run from /opt/reviewrise)

.PHONY: up down restart logs shell db redis status health \
        migrate seed backup update build clean

APP_DIR := /opt/reviewrise

## ── Start all services ───────────────────────────────────────
up:
	docker compose up -d --remove-orphans

## ── Stop all services ────────────────────────────────────────
down:
	docker compose down

## ── Restart app only (zero-downtime) ─────────────────────────
restart:
	docker compose up -d --no-deps --build app
	docker compose restart worker

## ── Follow all logs ──────────────────────────────────────────
logs:
	docker compose logs -f

## ── Follow app logs only ─────────────────────────────────────
logs-app:
	docker compose logs -f app

## ── Follow worker logs ───────────────────────────────────────
logs-worker:
	docker compose logs -f worker

## ── App shell ────────────────────────────────────────────────
shell:
	docker compose exec app sh

## ── Postgres shell ───────────────────────────────────────────
db:
	docker compose exec postgres psql -U reviewrise reviewrise

## ── Redis shell ──────────────────────────────────────────────
redis:
	docker compose exec redis redis-cli -a $$(grep REDIS_PASSWORD .env.production | cut -d= -f2)

## ── Run database migrations ──────────────────────────────────
migrate:
	docker compose run --rm app sh -c "npx prisma migrate deploy"

## ── Seed database ────────────────────────────────────────────
seed:
	docker compose run --rm app sh -c "npx tsx scripts/seed.ts"

## ── Run backup now ───────────────────────────────────────────
backup:
	bash scripts/backup.sh

## ── Pull + redeploy ──────────────────────────────────────────
update:
	bash scripts/deploy.sh

## ── Full rebuild ─────────────────────────────────────────────
build:
	docker compose build --no-cache

## ── Container status ─────────────────────────────────────────
status:
	docker compose ps

## ── Health check ─────────────────────────────────────────────
health:
	@curl -sf http://localhost:3000/api/health | jq . || echo "App not responding"

## ── Clean Docker artifacts ───────────────────────────────────
clean:
	docker system prune -f
	docker image prune -f

## ── View Nginx logs ──────────────────────────────────────────
nginx-logs:
	docker compose exec nginx tail -f /var/log/nginx/access.log

## ── Reload Nginx config ──────────────────────────────────────
nginx-reload:
	docker compose exec nginx nginx -s reload

## ── Open Prisma Studio (local only) ─────────────────────────
studio:
	npx prisma studio

## ── Show resource usage ──────────────────────────────────────
stats:
	docker stats --no-stream
