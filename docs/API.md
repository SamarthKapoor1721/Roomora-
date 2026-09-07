# API reference

Base URL: `http://localhost:4000/api/v1`

All responses are `{ "data": ... }` or, for lists, `{ "data": [...], "meta": { page, pageSize, total, totalPages } }`.
Errors are `{ "error": { code, message, details? } }`.

Auth: `Authorization: Bearer <accessToken>` on every route except `/auth/*` and `/health`.

## Auth

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | `email, password, fullName, role?(OWNER\|TENANT)` | self-service; STAFF not allowed |
| POST | `/auth/login` | `email, password` | returns `accessToken, refreshToken, user` |
| POST | `/auth/refresh` | `refreshToken` | rotates the refresh token |
| POST | `/auth/logout` | `refreshToken` | revokes one session |
| POST | `/auth/logout-all` | — | revokes all sessions |
| GET | `/auth/me` | — | current user |
| POST | `/auth/change-password` | `currentPassword, newPassword` | revokes other sessions |

## Common

| Method | Path | Notes |
| --- | --- | --- |
| PATCH | `/users/me` | `fullName?, phone?` |
| GET | `/users/me/audit-logs` | owner only; `?action=&entityType=&entityId=` |
| GET | `/users/tenants` | owner only; `?search=` — tenants linked to the owner |
| GET | `/notifications` | `?unread=true` ; `meta.unreadCount` |
| POST | `/notifications/:id/read` | |
| POST | `/notifications/read-all` | |
| GET | `/ai/status` | `aiServiceReachable, nvidiaConfigured, effectiveMode` |
| GET | `/analytics/owner/dashboard` | owner metrics |
| GET | `/analytics/owner/insights` | metrics + AI insights (`ai.source`) |
| GET | `/analytics/tenant/dashboard` | room, roommates, rent, food, lease, maintenance |
| GET | `/analytics/staff/dashboard` | assigned/overdue tasks, completed-30d |

## Owner

### Properties — `/owner/properties`
`POST /` · `GET /` (`?search=&isActive=`) · `GET /:id` · `PATCH /:id` · `DELETE /:id` (soft)

### Rooms — `/owner/rooms`
`POST /` · `GET /` (`?propertyId=&status=&applicationsOpen=`) · `GET /:id` · `PATCH /:id`
`POST /:id/applications` `{ open: boolean }` — open/close applications
`DELETE /:id` (deactivate; blocked if occupied)

### Assignments — `/owner`
`GET /rooms/:roomId/assignments` · `POST /rooms/:roomId/assignments` `{ tenantId, lease:{startDate,endDate,rentDueDay,monthlyRent?,foodOptIn?,terms?} }`
`POST /assignments/:assignmentId/end` `{ reason? }`

### Applications — `/owner/applications`
`GET /` (`?status=&roomId=&propertyId=`) · `GET /:id`
`POST /:id/rerun-ai` — re-run advisory screening
`POST /:id/decision` `{ decision:"APPROVE"|"REJECT", reason?, lease?:{...} }` — **the only decision point**

### Leases — `/owner/leases`
`GET /` (`?status=&roomId=&tenantId=&expiringBefore=`) · `GET /:id` · `PATCH /:id`
`POST /:id/terminate` · `POST /:id/summarize` (AI, `source`)

### Payments — `/owner/payments`
`GET /` (`?status=&tenantId=&leaseId=&overdue=`) — includes `summary:{billed,collected,outstanding}`
`POST /generate` `{ year?, month? }` — bulk current-month invoices
`POST /leases/:leaseId/generate` `{ year?, month? }`
`POST /:id/record` `{ amount, method, reference?, paidDate?, notes? }`
`PATCH /:id` `{ otherAmount?, dueDate?, status?, notes? }` — adjust / waive

### Maintenance — `/owner/maintenance`
`GET /` (`?status=&priority=&roomId=&staffId=`) · `GET /:id`
`POST /:id/assign` `{ staffId }` · `PATCH /:id` `{ priority?, category?, status? }`

### Cleaning — `/owner/cleaning`
`POST /` `{ propertyId, roomId?, title, description?, frequency, scheduledFor, priority? }`
`GET /` (`?status=&propertyId=&staffId=`) · `GET /:id`
`POST /:id/assign` `{ staffId }` · `PATCH /:id` `{ title?, description?, scheduledFor?, priority?, status? }`

### Staff — `/owner/staff`
`POST /` `{ email, password, fullName, phone?, staffType, skills? }`
`GET /` (`?staffType=&isActive=`) · `GET /:id` · `PATCH /:id` · `DELETE /:id` (blocked if open tasks)

### Warnings — `/owner/warnings`
`GET /` (`?status=&type=&tenantId=`) · `POST /` `{ tenantId, title, message, severity? }` (manual)
`POST /scan` — run the scanner now · `PATCH /:id/status` `{ status }`

### AI assistant — `/owner/assistant`
`GET /conversations` · `GET /conversations/:id` · `DELETE /conversations/:id`
`POST /ask` `{ question, conversationId? }` → `{ conversationId, message, source, dataUsed:{tools,context} }`
Answers only from real DB data retrieved by deterministic tools.

## Tenant

| Path | Notes |
| --- | --- |
| `GET /tenant/rooms` | browse open rooms (`?city=&minRent=&maxRent=&foodEnabled=`) |
| `GET /tenant/rooms/:id` | one open room |
| `POST /tenant/applications` | `{ roomId, monthlyIncome?, employmentStatus?, employerName?, currentAddress?, moveInDate?, occupants?, hasPets?, smoker?, notes?, foodOptIn? }` |
| `GET /tenant/applications` · `GET /tenant/applications/:id` | |
| `PATCH /tenant/applications/:id` | edit while `DOCS_PENDING` |
| `POST /tenant/applications/:id/withdraw` | |
| `POST /tenant/applications/:id/documents` | multipart `file` + `type` |
| `DELETE /tenant/applications/:id/documents/:docId` | before screening |
| `POST /tenant/applications/:id/submit` | runs AI screening → `OWNER_REVIEW` |
| `GET /tenant/roommates` | |
| `GET /tenant/leases` · `GET /tenant/leases/:id` | |
| `GET /tenant/payments` (`?status=`) | |
| `POST /tenant/payments/:id/pay` | `{ amount, method, reference? }` |
| `POST /tenant/maintenance` | `{ title, description }` — AI classifies |
| `GET /tenant/maintenance` · `GET /tenant/maintenance/:id` | |
| `GET /tenant/warnings` · `PATCH /tenant/warnings/:id/status` | tenants may only `ACKNOWLEDGED` |

## Staff

| Path | Notes |
| --- | --- |
| `GET /staff/me` | profile + task counts |
| `GET /staff/maintenance` (`?status=&completed=true`) · `GET /staff/maintenance/:id` | assigned only |
| `PATCH /staff/maintenance/:id/status` | `{ status, resolutionNotes? }` — **AFTER photo required for COMPLETED** |
| `GET /staff/cleaning` (`?status=&completed=true`) · `GET /staff/cleaning/:id` | |
| `PATCH /staff/cleaning/:id/status` | `{ status, notes? }` — **AFTER photo required for COMPLETED** |
| `POST /staff/cleaning/:id/photos` | multipart `file` + `kind`(BEFORE\|AFTER) |

## Shared

| Path | Roles | Notes |
| --- | --- | --- |
| `POST /maintenance/:id/photos` | tenant / staff / owner | multipart `file` + `kind`; tenants forced to `ISSUE` |
| `POST /maintenance/:id/notes` | tenant / staff / owner | `{ body }` |

Uploaded files are served read-only from `/uploads/<path>`.

## AI service (internal, `http://localhost:8001`)

`GET /health` · `POST /ai/eligibility` · `POST /ai/verify-documents` ·
`POST /ai/summarize-application` · `POST /ai/summarize-lease` ·
`POST /ai/classify-maintenance` · `POST /ai/assistant` · `POST /ai/insights`

Every response includes `source: "NVIDIA_AI" | "RULE_BASED_FALLBACK"`.
