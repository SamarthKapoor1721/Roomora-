# 17 · Dashboards & analytics

**Actors:** Owner, Tenant, Staff
**Code:** `backend/src/modules/analytics/*`
**Frontend:** `pages/owner/OwnerDashboard.tsx`, `pages/tenant/TenantDashboard.tsx`, `pages/staff/StaffDashboard.tsx`

---

All three are single aggregate endpoints, role-locked.

## Owner dashboard `[OWNER]`

`GET /analytics/owner/dashboard` → `ownerDashboard(ownerId)`

```jsonc
{
  "generatedAt": "…",
  "properties": { "total": 1 },
  "occupancy": { "totalCapacity", "totalOccupants", "vacantBeds",
                 "occupancyRate", "rooms", "vacantRooms" },
  "applications": { "byStatus": { "OWNER_REVIEW": 2, … }, "pendingApprovals": 2 },
  "leases": { "active": 3, "expiringSoon": 1 },        // expiringSoon = ≤30 days
  "revenue": { "billedAllTime", "collectedAllTime",
               "outstanding", "collectedThisMonth" },
  "payments": { "latePayments", "overduePayments" },
  "maintenance": { "open", "byStatus": { … } },        // open = OPEN+ASSIGNED+IN_PROGRESS
  "cleaning": { "pending", "byStatus": { … } },        // pending = SCHEDULED+ASSIGNED+IN_PROGRESS
  "warnings": { "active", "bySeverity": { … } }
}
```

Everything is scoped by `property.ownerId`. The frontend renders these as stat
cards: Properties, Occupancy %, Vacant rooms, Pending approvals, Revenue collected,
Outstanding rent, Late payments, Active leases (+ expiring), Open maintenance,
Pending cleaning, Active warnings, Applications total.

### Owner AI insights `[OWNER]`

`GET /analytics/owner/insights` → `{ metrics, ai }` where `metrics` is the dashboard
above and `ai` = `aiClient.insights(metrics)` → AI service `POST /ai/insights`
(**NVIDIA first, rule-based fallback** — [16](16-ai-fallback.md)). Rate-limited.

`ai = { source, insights[], risks[], opportunities[] }`, shown in three columns
under a **NVIDIA AI** / **Rule-Based Fallback** tag.

Fallback derives, from the metrics:

- insights: occupancy %, historical late payments, open maintenance count;
- risks: outstanding rent, overdue payments, leases expiring within 30 days, active warnings;
- opportunities: vacant beds (if occupancy < 70%), rent-raise headroom (if ≥ 95%), pending approvals.

## Tenant dashboard `[TENANT]`

`GET /analytics/tenant/dashboard` → `tenantDashboard(tenantId)`

```jsonc
{
  "room": { "id", "name", "floor", "property": {…}, "startDate" } | null,
  "roommates": [ { "id", "fullName", "phone" } ],
  "lease": { "id", "startDate", "endDate", "monthlyRent", "foodCharge" } | null,
  "food": { "enabled", "charge", "optedIn" },
  "rent": { "billed", "paid", "outstanding",
            "nextDue": { "id", "period", "amount", "dueDate", "status" } | null },
  "maintenance": { "OPEN": n, "IN_PROGRESS": n, … },
  "notifications": { "unread": n },
  "warnings": { "active": n }
}
```

- `room` / `lease` are `null` until the tenant is assigned ([07](07-assignment-roommates.md)).
- `food` is the *effective* setting for the assigned room + whether the tenant opted in ([18](18-food-option.md)).
- `nextDue` = the earliest `PENDING`/`PARTIAL`/`OVERDUE` payment.
- The UI shows "Pay now" linking to [09](09-rent-payments.md) when `nextDue` exists.

## Staff dashboard `[STAFF]`

`GET /analytics/staff/dashboard` → `staffDashboard(staffId)`

```jsonc
{
  "maintenance": { "open": n, "byStatus": { … } },
  "cleaning": { "byStatus": { … } },
  "overdue": {
    "maintenance": n,   // HIGH/URGENT, assigned, older than 2 days, not done
    "cleaning": n        // assigned, scheduledFor in the past, not done
  },
  "completedLast30Days": n   // maintenance completed in the last 30 days
}
```

Rendered as stat cards (Open maintenance, Overdue maintenance, Overdue cleaning,
Completed 30d) plus two status breakdown lists.

## Edge cases

| Situation | Result |
| --- | --- |
| Owner with no properties | all counts 0; insights say "Not enough data yet" |
| Tenant not yet assigned | `room` / `lease` null; rent section empty; UI shows "not assigned to a room yet" |
| Insights request while AI down | `ai.source = RULE_BASED_FALLBACK` |
| Staff with no assignments | zeros; status maps empty |
| Wrong role hits another role's dashboard | `403` (each route is `authorize`d) |
