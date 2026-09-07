# Roomora

Full-stack rental management platform with **AI-assisted (advisory-only) tenant screening**.
(Internal service slugs and the database still use the earlier `srms` name.)

**Brand:** white surfaces · Roomora green `#76C457` · cream accent `#FFF8CF`.

| Layer      | Stack                                             |
| ---------- | ------------------------------------------------- |
| Frontend   | React 18 + TypeScript + Tailwind CSS + Vite       |
| Backend    | Node.js + Express + TypeScript                    |
| Database   | PostgreSQL + Prisma ORM                           |
| AI service | Python + FastAPI, **NVIDIA NIM** primary provider |

Monorepo via npm workspaces: [`backend/`](backend), [`frontend/`](frontend), plus the standalone Python [`ai-service/`](ai-service).

---

## Roles

- **Owner** — properties & rooms, open/close applications, review AI results, **make the final approve/reject decision**, assign tenants & roommates, manage leases, rent, payments, maintenance, cleaning, staff, warnings, analytics, AI assistant.
- **Tenant** — browse open rooms, apply, upload documents, track screening, view room/roommates/lease/food, pay rent, raise maintenance with photos, see warnings & notifications.
- **Staff** — view assigned maintenance & cleaning tasks, update status, add notes, upload **before/after** photos as proof.

## Tenant application workflow

```
Owner opens applications for a room
  → Tenant applies
  → Tenant uploads required documents (ID, address, income)
  → Tenant submits for screening
      → AI eligibility assessment   (advisory score + reasons/warnings/missing)
      → AI document verification    (extraction + consistency)
      → AI application summary
  → Results shown to Owner
  → Owner manually reviews and approves / rejects   ← the ONLY decision point
  → If approved: tenant assigned to room, lease created, occupancy & roommates updated
```

The AI **never** approves or rejects. It only advises; the owner always decides.

## AI provider & fallback

Every AI call in [`ai-service/app/services.py`](ai-service/app/services.py) tries **NVIDIA NIM** first
([`nvidia_client.py`](ai-service/app/nvidia_client.py)). If the key is missing, or the call
times out / rate-limits / errors, it automatically switches to a
**rule-based / keyword-matching fallback** ([`fallback.py`](ai-service/app/fallback.py)).

Every AI result carries a `source` field — `NVIDIA_AI` or `RULE_BASED_FALLBACK` — and the UI
shows a **"NVIDIA AI"** / **"Rule-Based Fallback"** tag on every result.

For eligibility, the fallback percentage is a **criteria match** (how well the applicant
matches letting criteria), *not* a probability of approval:

```
NVIDIA AI unavailable
        ↓
Keyword + rule matching
        ↓
Criteria Match: 82%
```

AI is used for: eligibility, document extraction/consistency, application summary,
maintenance classification & priority, lease summary, the owner AI assistant, and
management insights.

## Food

Food is optional, controlled per **property** and per **room** (`effective = property.foodEnabled || room.foodEnabled`).
When enabled, tenants can opt in and the food charge is added to rent on the lease and every generated invoice.
When disabled, food options are hidden and no charge is added.

## Warnings (automatic)

An hourly scanner ([`warnings/scheduler.ts`](backend/src/modules/warnings/scheduler.ts) →
[`runWarningScan`](backend/src/modules/warnings/warnings.service.ts)) raises de-duplicated warnings for:
upcoming/overdue rent, repeated late payments, lease expiry, missing documents,
maintenance delays, and cleaning delays. Owners can also run it on demand and create manual warnings.

---

## Getting started

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker (for PostgreSQL) — or your own Postgres

### 1. Install

```bash
npm install                       # installs backend + frontend workspaces
```

### 2. Database

```bash
docker compose up -d              # Postgres on localhost:5440 (see docker-compose.yml)
cp backend/.env.example backend/.env
npm run db:migrate                # prisma migrate
npm run db:seed                   # demo data + accounts
```

> The compose file publishes Postgres on **5440** to avoid clashing with a local Postgres.
> If you change it, update `DATABASE_URL` in `backend/.env`.

### 3. AI service

```bash
cp ai-service/.env.example ai-service/.env
# optional: set NVIDIA_NIM_API_KEY in ai-service/.env  (get one at https://build.nvidia.com/)
# without a key it runs fully on the rule-based fallback
```

### 4. Run everything

```bash
npm run dev
```

- Frontend  → http://localhost:5173
- Backend   → http://localhost:4000  (`/api/v1`, `/health`)
- AI service → http://localhost:8001  (`/health`)

`npm run dev` creates the Python venv on first run and installs `ai-service/requirements.txt`.

### Demo accounts (password `Password123`)

| Role                 | Email                    |
| -------------------- | ------------------------ |
| Owner                | `owner@srms.test`        |
| Tenant (no room)     | `tenant@srms.test`       |
| Tenant (assigned)    | `tenant2@srms.test`      |
| Maintenance staff    | `maintenance@srms.test`  |
| Cleaning staff       | `cleaning@srms.test`     |

---

## Security

- JWT access tokens (15 min) + rotating refresh tokens; only SHA-256 hashes of refresh tokens are stored.
- Passwords hashed with bcrypt (cost 12); password change revokes all sessions.
- Role-based access control middleware on every route; ownership checks in services
  (owner → property → room → application/lease/payment/task).
- Zod validation on every body/query/param; unknown keys stripped.
- File uploads: MIME allow-list (images + PDF), size cap, random stored filenames,
  path-traversal rejection, `X-Content-Type-Options: nosniff` on static serving.
- `helmet`, CORS allow-list, global + auth + AI rate limiters.
- Audit log for every state-changing action.

## Project layout

```
backend/
  prisma/schema.prisma        all entities & enums
  src/
    config/        env
    lib/           prisma, auth, errors, http, audit, notify, access, aiClient
    middleware/    authenticate, authorize, validate, upload, rateLimit, error
    modules/       auth, users, properties, rooms, applications, assignments,
                   leases, payments, maintenance, cleaning, staff, warnings,
                   notifications, analytics, assistant, ai
    routes.ts      API router
    app.ts, server.ts
frontend/
  src/
    lib/           api (axios + refresh), auth context, hooks
    components/     Layout, ui primitives
    pages/owner/*   dashboard, properties, applications, leases, payments,
                    maintenance, cleaning, staff, warnings, assistant
    pages/tenant/*  dashboard, browse, applications, payments, maintenance
    pages/staff/*   dashboard, maintenance, cleaning
ai-service/
  app/
    nvidia_client.py   NVIDIA NIM chat client (raises NvidiaUnavailable)
    fallback.py        rule-based engine (criteria match, classification, assistant, insights)
    services.py        NVIDIA-first, fallback-on-failure, tags source
    prompts.py         advisory-only system prompts
    main.py            FastAPI endpoints
```

## Documentation

- [`docs/workflows/`](docs/workflows/) — one document per end-to-end flow (auth, application,
  AI screening, owner decision, assignment, leases, rent, maintenance, cleaning, staff,
  warnings, notifications, AI assistant, AI fallback, dashboards, food, audit). Start with
  [`docs/workflows/00-end-to-end.md`](docs/workflows/00-end-to-end.md).
- [`docs/API.md`](docs/API.md) — endpoint reference.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — design notes & known simplifications.
