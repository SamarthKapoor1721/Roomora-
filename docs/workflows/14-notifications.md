# 14 · Notifications

**Actors:** anyone (recipients); the system creates them
**Code:** `backend/src/lib/notify.ts`, `backend/src/modules/notifications/notifications.routes.ts`
**Frontend:** unread count in `Layout.tsx` (polls every 30 s)

---

## Model

`Notification` = `{ userId, type, title, body, readAt, relatedType, relatedId, createdAt }`.

`type` ∈ `APPLICATION_UPDATE`, `PAYMENT_REMINDER`, `MAINTENANCE_UPDATE`,
`CLEANING_UPDATE`, `WARNING`, `LEASE_UPDATE`, `TASK_ASSIGNED`, `GENERAL`.

Created via `notify()` / `notifyMany()` — **fire-and-forget**: failures are logged,
never thrown into the request path.

## Who gets notified, and when

| Event | Recipient | type | Source workflow |
| --- | --- | --- | --- |
| Tenant applies | Owner | `APPLICATION_UPDATE` | [04](04-tenant-application.md) |
| AI screening completes | Owner | `APPLICATION_UPDATE` | [05](05-ai-screening.md) |
| Application approved | Tenant | `APPLICATION_UPDATE` | [06](06-owner-review-decision.md) |
| Application rejected | Tenant | `APPLICATION_UPDATE` | [06](06-owner-review-decision.md) |
| Manual assignment | Tenant | `APPLICATION_UPDATE` | [07](07-assignment-roommates.md) |
| Tenancy / lease ended | Tenant | `LEASE_UPDATE` | [07](07-assignment-roommates.md), [08](08-leases.md) |
| Payment recorded (owner) | Tenant | `PAYMENT_REMINDER` | [09](09-rent-payments.md) |
| Tenant self-pays | Owner | `PAYMENT_REMINDER` | [09](09-rent-payments.md) |
| Maintenance request raised | Owner | `MAINTENANCE_UPDATE` | [10](10-maintenance.md) |
| Maintenance assigned | Staff (`TASK_ASSIGNED`) + Tenant (`MAINTENANCE_UPDATE`) | | [10](10-maintenance.md) |
| Maintenance status change | Owner + Tenant | `MAINTENANCE_UPDATE` | [10](10-maintenance.md) |
| Cleaning assigned | Staff | `TASK_ASSIGNED` | [11](11-cleaning.md) |
| Cleaning status change | Owner | `CLEANING_UPDATE` | [11](11-cleaning.md) |
| Warning raised (with tenant) | Tenant | `WARNING` | [13](13-warnings.md) |
| Staff account created | Staff | `GENERAL` | [12](12-staff-management.md) |

## Endpoints `[authenticated]`

| Endpoint | Effect |
| --- | --- |
| `GET /notifications?unread=true&page=&pageSize=` | the caller's notifications, newest first; `meta` includes `unreadCount` |
| `POST /notifications/:id/read` | mark one read (`readAt = now`); scoped to the caller |
| `POST /notifications/read-all` | mark all the caller's unread as read |

## Frontend behaviour

`Layout.tsx` calls `GET /notifications?unread=true&pageSize=1` on a 30 s interval and
shows `"<n> unread"` / `"No alerts"` in the header. There is no separate
notifications page in the minimal frontend — the count is the signal; details live
on the relevant workflow page (application, payment, maintenance, …).

## Edge cases

| Situation | Result |
| --- | --- |
| `notify()` DB write fails | logged to console, request unaffected |
| Mark another user's notification read | no-op (query is `{ id, userId: caller }`) |
| Warning with no tenant (cleaning delay) | no notification (nobody to notify); owner sees it in the warnings list |
