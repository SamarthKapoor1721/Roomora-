# 19 · Audit logging

**Actors:** System (writes); Owner (reads their own)
**Code:** `backend/src/lib/audit.ts`; read route in `backend/src/modules/users/users.routes.ts`

---

## Model

`AuditLog` = `{ actorId, action, entityType, entityId, ip, userAgent, metadata (JSON), createdAt }`.

Written by `audit()` — **fire-and-forget**: any failure is logged to the console,
never thrown into the request path. `actorId` defaults to `req.user.id`.

## Actions recorded

| Domain | Actions |
| --- | --- |
| Auth | `auth.register`, `auth.login`, `auth.logout_all`, `auth.change_password` |
| Properties | `property.create`, `property.update`, `property.deactivate` |
| Rooms | `room.create`, `room.update`, `room.applications_open`, `room.applications_close`, `room.deactivate` |
| Applications | `application.create`, `application.withdraw`, `application.document_upload`, `application.submit_screening`, `application.ai_rerun`, `application.approve`, `application.reject` |
| Assignments | `assignment.manual_create`, `assignment.end` |
| Leases | `lease.update`, `lease.terminate` |
| Payments | `payment.generate`, `payment.generate_bulk`, `payment.record`, `payment.adjust`, `payment.tenant_pay` |
| Maintenance | `maintenance.create`, `maintenance.photo`, `maintenance.assign`, `maintenance.owner_update`, `maintenance.staff_status` |
| Cleaning | `cleaning.create`, `cleaning.assign`, `cleaning.owner_update`, `cleaning.staff_status`, `cleaning.photo` |
| Staff | `staff.create`, `staff.update`, `staff.deactivate` |
| Warnings | `warning.create`, `warning.scan`, `warning.status` |
| Assistant | `assistant.ask` (metadata includes the question) |

Most entries carry useful `metadata` (e.g. the decision reason, the payment amount,
the new status, the assigned staff id).

## Reading the log `[OWNER]`

`GET /users/me/audit-logs?action=&entityType=&entityId=&page=&pageSize=`

Returns the **caller's own** actions (`actorId = req.user.id`), newest first, with
`action` / `entityType` / `entityId` filters. Paginated.

> Scope note: this returns actions the owner *performed*. It does not currently
> return actions performed by others on the owner's entities (e.g. a tenant's
> application upload) — see [ARCHITECTURE.md](../ARCHITECTURE.md#known-simplifications).

## Retention

No automatic pruning — rows accumulate. Indexed on `actorId`, `(entityType, entityId)`
and `createdAt` for query performance.

## Edge cases

| Situation | Result |
| --- | --- |
| `audit()` DB write fails | console error, request succeeds |
| Unauthenticated action (e.g. failed login) | not logged (only successful `auth.login` is) |
| Tenant / staff request `/users/me/audit-logs` | `403` (owner-only route) |
| Very large `metadata` | stored as JSON; no size guard beyond the request body limit |
