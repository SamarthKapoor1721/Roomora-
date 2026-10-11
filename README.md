# Roomora

Deployment instructions: [docs/deployment.md](docs/deployment.md).

Full-stack rental management platform with **AI-assisted (advisory-only) tenant screening**.
(Internal service slugs and the database still use the earlier `srms` name.)

**Brand:** white surfaces · Roomora green `#76C457` · cream accent `#FFF8CF`.

| Layer      | Stack                                             |
| ---------- | ------------------------------------------------- |
| Frontend   | React 18 + TypeScript + Tailwind CSS + Vite       |
| Backend    | Node.js + Express + TypeScript                    |
| Database   | MongoDB Atlas + Prisma ORM                           |
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

AI features use NVIDIA NIM with fallbacks on provider errors. Application screening
first inspects actual uploaded images and PDF pages using the vision model configured
by `NVIDIA_NIM_VISION_MODEL`. It checks proof type and applicant consistency and saves
per-file explanations. Failed or unavailable inspection never verifies a document.

Eligibility is a deterministic **evidence-based criteria match**, using document-supported
income (50 points), valid required proofs (30), and occupancy fit (20). Missing or invalid
proofs force manual review. It is not a probability of approval. See
[AI screening](docs/workflows/05-ai-screening.md) for scoring and file limits.

AI is used for document extraction/consistency, application summaries,
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
- MongoDB Atlas (or MongoDB configured as a replica set)

### 1. Install

```bash
npm install                       # installs backend + frontend workspaces
```

### 2. Database

```bash
cp backend/.env.example backend/.env
# Set DATABASE_URL to your MongoDB Atlas URI, including /srms before the query.
npm run db:generate
npm run db:push                   # sync collections/indexes; MongoDB uses no SQL migrations
npm run db:check                  # verify connection and database reads
```

Keep database credentials in the ignored `backend/.env` file. Atlas must allow your
machine's IP address, and the database user needs read/write access to `srms`.
Existing PostgreSQL data is not copied automatically. SQL migrations are retained
as historical files and are not used by the MongoDB setup.

MongoDB stores monetary fields as numbers; payment calculations round to two decimal
places. IDs remain CUID strings mapped to MongoDB `_id`, preserving API ID formats.
The setup script adds a partial unique index for application assignments, allowing
multiple manual assignments without an application.

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

### Google sign-in and super admin

Create a Google OAuth **Web application** client. Add the frontend origin (for example
`http://localhost:5173` and the production site origin) to its authorized JavaScript
origins. Set the same client ID as `GOOGLE_CLIENT_ID` on the API and
`VITE_GOOGLE_CLIENT_ID` on the frontend. Set `SUPER_ADMIN_EMAILS` on the API to a
comma-separated list of verified Google email addresses allowed to administer the
platform. An allowlisted account becomes a super admin on its first Google sign-in;
admin accounts cannot sign in with a password. Run `npm run db:push` after deploying
the updated Prisma schema. The `/super_admin` portal lets admins review platform
activity, add owner and tenant accounts, edit user details, and deactivate or reactivate
accounts. Permanent deletion requires the email as confirmation and is blocked for
accounts with property, tenancy, or task records; deactivate those accounts instead.

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
