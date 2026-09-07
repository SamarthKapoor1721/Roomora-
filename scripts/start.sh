#!/usr/bin/env bash
#
# One command to run the whole project from a clean checkout.
#
#   ./scripts/start.sh            # set up everything, then run all 3 services
#   ./scripts/start.sh --reset    # also drop & re-seed the database first
#
# Does: install deps, start Postgres (Docker), create .env files, run migrations,
# seed (first run), create the Python venv + install AI deps, then launch
# backend + frontend + ai-service together.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RESET=0
[ "${1:-}" = "--reset" ] && RESET=1

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$1"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
command -v node >/dev/null   || die "Node.js 20+ is required"
command -v npm >/dev/null    || die "npm is required"
command -v python3 >/dev/null || die "Python 3.11+ is required"
command -v docker >/dev/null || die "Docker is required (for PostgreSQL)"

# ---------------------------------------------------------------------------
# 1. Node dependencies — only reinstall when the manifests actually change
# ---------------------------------------------------------------------------
DEP_STAMP="node_modules/.roomora-deps-hash"
DEP_HASH="$(cat package.json package-lock.json backend/package.json frontend/package.json 2>/dev/null | shasum | cut -d' ' -f1)"
if [ ! -d node_modules ] || [ "$(cat "$DEP_STAMP" 2>/dev/null)" != "$DEP_HASH" ]; then
  say "Installing Node dependencies"
  npm install
  printf '%s' "$DEP_HASH" > "$DEP_STAMP"
else
  echo "Node dependencies up to date — skipping npm install."
fi

# ---------------------------------------------------------------------------
# 2. Env files
# ---------------------------------------------------------------------------
[ -f backend/.env ]    || { say "Creating backend/.env";    cp backend/.env.example backend/.env; }
[ -f ai-service/.env ] || { say "Creating ai-service/.env"; cp ai-service/.env.example ai-service/.env; }

# Read the DB port the backend expects, from its DATABASE_URL.
DB_PORT="$(sed -n 's#.*localhost:\([0-9]\+\)/srms.*#\1#p' backend/.env | head -1)"
DB_PORT="${DB_PORT:-5440}"

# ---------------------------------------------------------------------------
# 3. PostgreSQL (Docker)
# ---------------------------------------------------------------------------
say "Starting PostgreSQL (docker compose, port ${DB_PORT})"
docker compose up -d

printf 'Waiting for the database'
for i in $(seq 1 60); do
  if docker inspect --format '{{.State.Health.Status}}' srms-postgres 2>/dev/null | grep -q healthy; then
    printf ' ready\n'; break
  fi
  printf '.'; sleep 1
  [ "$i" = "60" ] && die "database did not become healthy"
done

# ---------------------------------------------------------------------------
# 4. Prisma: generate + migrate (+ optional reset), seed on first run
# ---------------------------------------------------------------------------
if [ "$RESET" = "1" ]; then
  say "Resetting database"
  npm --workspace backend exec -- prisma migrate reset --force
else
  say "Applying database migrations"
  npm --workspace backend exec -- prisma migrate deploy
  npm --workspace backend run db:generate >/dev/null

  # Seed only if there are no users yet.
  HAS_USERS="$(npm --workspace backend exec --silent -- node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.user.count().then(n => { console.log(n); return p.\$disconnect(); }).catch(() => { console.log('ERR'); process.exit(0); });
  " 2>/dev/null | tr -d '[:space:]')"

  if [ "$HAS_USERS" = "0" ]; then
    say "Seeding database (first run)"
    npm --workspace backend run db:seed
  else
    echo "Database already has data — skipping seed (use --reset to wipe)."
  fi
fi

# ---------------------------------------------------------------------------
# 5. Python venv + AI-service deps
# ---------------------------------------------------------------------------
if [ ! -d ai-service/.venv ]; then
  say "Creating Python virtualenv for the AI service"
  python3 -m venv ai-service/.venv
fi
AI_STAMP="ai-service/.venv/.roomora-req-hash"
AI_HASH="$(shasum ai-service/requirements.txt | cut -d' ' -f1)"
if [ "$(cat "$AI_STAMP" 2>/dev/null)" != "$AI_HASH" ]; then
  say "Installing AI-service dependencies"
  ai-service/.venv/bin/pip install -q -r ai-service/requirements.txt
  printf '%s' "$AI_HASH" > "$AI_STAMP"
else
  echo "AI-service dependencies up to date — skipping pip install."
fi

# ---------------------------------------------------------------------------
# 6. Run everything
# ---------------------------------------------------------------------------
say "Starting all services"
cat <<'EOF'

  Frontend    http://localhost:5173
  Backend API http://localhost:4000/api/v1   (health: /health)
  AI service  http://localhost:8001          (health: /health)

  Demo logins (password: Password123)
    owner@srms.test · tenant@srms.test · tenant2@srms.test
    maintenance@srms.test · cleaning@srms.test

  Press Ctrl+C to stop all three.

EOF

exec npm run dev
