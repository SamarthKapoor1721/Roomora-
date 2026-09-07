# 00 · End-to-end: the whole lifecycle

How the individual workflows chain together, from an empty system to a running tenancy
with rent, maintenance and warnings.

```mermaid
flowchart TD
  subgraph Setup
    A1[01 Auth: owner registers] --> A2[02 Create property + rooms]
    A2 --> A3[12 Create staff accounts]
    A2 --> A4[03 Open applications on a room]
  end

  subgraph Onboarding
    B1[01 Auth: tenant registers] --> B2[04 Browse + apply]
    A4 --> B2
    B2 --> B3[04 Upload documents]
    B3 --> B4[04 Submit for screening]
    B4 --> B5[05 AI screening: eligibility + docs + summary]
    B5 -->|advisory results| B6[06 Owner reviews]
    B6 -->|APPROVE + lease terms| B7[07 Assignment + roommates]
    B7 --> B8[08 Lease ACTIVE created]
    B6 -->|REJECT| BR[Tenant notified; may re-apply]
  end

  subgraph Living
    B8 --> C1[09 Owner generates monthly rent]
    C1 --> C2[09 Tenant pays / owner records]
    B8 --> C3[10 Tenant raises maintenance]
    C3 --> C4[10 AI classifies category + priority]
    C4 --> C5[10 Owner assigns staff]
    C5 --> C6[10 Staff works + before/after photos + COMPLETED]
    A2 --> C7[11 Owner schedules cleaning]
    C7 --> C8[11 Staff completes with proof]
  end

  subgraph Oversight
    D1[13 Hourly scanner] --> D2[Warnings: rent, lease expiry, missing docs, delays]
    D2 --> D3[14 Notifications to owner + tenant]
    C2 --> D4[17 Owner dashboard: revenue, occupancy, arrears]
    D2 --> D4
    D4 --> D5[15 Owner AI assistant answers from this data]
    ALL[every state change] --> D6[19 Audit log]
  end
```

## The critical separation

Steps **05** (AI screening) and **06** (owner decision) are deliberately distinct:

| Step | Who | Output |
| --- | --- | --- |
| 05 | AI service | advisory score / recommendation / warnings — **changes nothing** |
| 06 | Owner (human) | `APPROVED` or `REJECTED` — the **only** decision point |

The AI never approves or rejects. See [16 · AI fallback](16-ai-fallback.md) for how
the advisory result is produced (NVIDIA NIM, or rule-based "Criteria Match %").

## Try it end-to-end

```bash
npm start          # Postgres + backend + frontend + AI service
```

Then, signed in as the seeded accounts (password `Password123`):

1. **owner@srms.test** — create a property & room, open applications.
2. **tenant@srms.test** — browse, apply, upload 3 docs, submit for screening.
3. **owner@srms.test** — open the application, read the AI results, approve with lease terms.
4. **tenant@srms.test** — see the room, roommates, lease, food on the dashboard; pay rent.
5. **tenant2@srms.test** — raise a maintenance request (already has overdue rent seeded).
6. **owner@srms.test** — assign it to **maintenance@srms.test**; run the AI assistant ("Which tenants have overdue rent?"); run a warning scan.
7. **maintenance@srms.test** — progress the task, upload an AFTER photo, complete it.

`scripts/../smoke test` in the repo history exercises exactly this path via the API.
