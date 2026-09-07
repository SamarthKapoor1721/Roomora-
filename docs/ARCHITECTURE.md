# Architecture notes

## Services

```
┌────────────┐   /api/v1    ┌────────────┐   /ai/*     ┌──────────────┐
│  Frontend  │─────────────▶│  Backend   │────────────▶│  AI service  │
│ React+Vite │◀─────────────│ Express+TS │◀────────────│ FastAPI+NIM  │
└────────────┘              └─────┬──────┘             └──────┬───────┘
                                 │ Prisma                    │ httpx
                           ┌─────▼──────┐            ┌────────▼────────┐
                           │ PostgreSQL │            │  NVIDIA NIM API │
                           └────────────┘            └─────────────────┘
```

The frontend never talks to the AI service directly. The backend owns all data,
retrieves what the AI needs, calls the AI service, persists the advisory result,
and returns it tagged with its `source`.

## Backend module shape

Each domain module is `*.schema.ts` (Zod) → `*.service.ts` (business logic, all
ownership/authorization checks, Prisma) → `*.controller.ts` (thin, `asyncHandler`,
audit) → `*.routes.ts` (router + `authenticate` + `authorize(role)` + `validate`).
`src/routes.ts` mounts them under role-prefixed paths (`/owner/*`, `/tenant/*`, `/staff/*`).

Cross-cutting helpers in `src/lib`: `prisma`, `auth` (bcrypt + JWT + refresh-token
hashing), `errors` (typed `AppError`), `http` (`asyncHandler`, `ok`, `paginated`),
`audit`, `notify`, `access` (ownership resolvers), `aiClient` (AI-service client
with a last-resort local fallback if the AI service itself is down).

## Data model highlights (`prisma/schema.prisma`)

- `User` carries `role` and optional `staffType`; `StaffProfile` links a staff user to the owner who manages them.
- `Property` → `Room` → (`Application`, `RoomAssignment`, `Lease`, `MaintenanceRequest`, `CleaningTask`).
- `Application` has 1:1 `EligibilityAssessment`, `DocVerificationResult`, `ApplicationSummary`, each with an `AiResultSource`.
- `RoomAssignment` is unique on `(roomId, tenantId, isActive)`; `Room.occupantCount`/`status`/`applicationsOpen` are recomputed in a transaction whenever assignments change.
- `Payment` is unique on `(leaseId, periodYear, periodMonth)` so invoice generation is idempotent; `derivePaymentState` computes `status` + `daysLate` from amounts/dates.
- `Warning.dedupeKey` is unique so the hourly scanner refreshes rather than duplicates.
- `AuditLog` records actor, action, entity, ip, ua, metadata for every state change.

## Application workflow states

`DOCS_PENDING → UNDER_AI_REVIEW → OWNER_REVIEW → APPROVED | REJECTED`
(`SUBMITTED`, `AI_COMPLETE`, `WITHDRAWN` also exist).

`submitForScreening` requires the three required document types, moves to
`UNDER_AI_REVIEW`, runs `runAiScreening` (eligibility + doc verification + summary,
each independently fault-tolerant), then moves to `OWNER_REVIEW`. Approval is only
possible from `OWNER_REVIEW`/`AI_COMPLETE` via `applications.decide`, which delegates
to `assignmentsService.assignFromApplication` inside a transaction:
create assignment → create lease (with food charge if opted in) → mark `APPROVED` →
withdraw the tenant's other pending apps for that room → recompute room occupancy.

## AI: NVIDIA-first with rule-based fallback

`ai-service/app/services.py` — each function:

1. builds an advisory-only system prompt (`prompts.py`) that forbids stating a final decision;
2. calls `nvidia_client.chat_json` (NVIDIA NIM `chat/completions`, `response_format: json_object`);
3. on `NvidiaUnavailable` (no key, timeout, 429, 5xx, malformed JSON) calls the matching `fallback.*`;
4. returns the result with `source` set accordingly and validated/clamped fields.

`fallback.py` implements:

- **eligibility** — weighted criteria (income-to-rent 40, documents 30, employment 15, occupancy fit 10, lifestyle 5) → a **Criteria Match %**, plus reasons/warnings/missing.
- **verify_documents** — presence + naïve name-matching → status + consistency score.
- **classify_maintenance** — keyword rules → category + priority, with an urgency-language bump; safety keywords force `URGENT`.
- **assistant** — formats the real DB context the backend passed in into a markdown answer; never invents data.
- **insights** — turns dashboard metrics into insights / risks / opportunities.

## AI assistant data retrieval

`assistant/assistant.tools.ts` has deterministic retrievers (`overdueRent`,
`vacantRooms`, `leasesExpiring`, `revenueSummary`, `maintenanceFrequency`,
`pendingApplications`, `occupancyOverview`, `activeWarnings`), all owner-scoped.
`selectTools` keyword-routes the question to a subset; `gatherContext` runs them and
passes the rows as `context` to the AI service. The model (or fallback) answers only
from that context. The response records `dataUsed` for transparency.

## Scheduled work

`warnings/scheduler.ts` runs `runWarningScan` ~10 s after boot and hourly.
Set `DISABLE_SCHEDULER=true` to turn it off (used in tests). No external queue —
AI screening runs inline within the submit request because each AI call is fast and
independently fault-tolerant; a production deployment would move it to a job queue.

## Known simplifications

- Document OCR is out of scope — the AI verifies presence/consistency from filenames and applicant fields, not authenticity.
- Payments record intent; no real payment-gateway integration.
- AI screening is synchronous (see above).
- Refresh tokens are stored per-session but not bound to a device fingerprint.

## Dependency notes

`npm audit` reports 3 transitive production advisories, each fixable only by a major
upgrade and not exploitable as used here:

| Package | Via | Why it's deferred |
| --- | --- | --- |
| `qs` (moderate) | `express@4` | Express 4 is the maintained LTS line; the fix ships in Express 5. Request bodies are size-capped and Zod-validated. |
| `deepmerge-ts` (high) | `prisma` CLI | Dev/build-time tooling only — the runtime uses `@prisma/client`, which is unaffected. |
| `react-router` (moderate) | `react-router-dom@6` | Advisories are SSR-hydration / open-redirect; this is a client-only SPA with no SSR and no user-controlled navigation targets. |
