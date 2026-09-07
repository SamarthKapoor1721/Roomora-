# Workflows

One document per end-to-end flow in the Smart Rental Management System. Each
covers the actors, the step-by-step sequence, the API calls, the state changes,
and the failure/edge cases — as actually implemented.

| # | Workflow | Primary actors |
| --- | --- | --- |
| 00 | [End-to-end: the whole lifecycle](00-end-to-end.md) | all |
| 01 | [Authentication & sessions](01-authentication.md) | anyone |
| 02 | [Property & room setup](02-property-room-setup.md) | Owner |
| 03 | [Opening & closing applications](03-open-close-applications.md) | Owner |
| 04 | [Tenant application & documents](04-tenant-application.md) | Tenant |
| 05 | [AI screening (eligibility, documents, summary)](05-ai-screening.md) | System / AI |
| 06 | [Owner review & decision](06-owner-review-decision.md) | Owner |
| 07 | [Room assignment & roommates](07-assignment-roommates.md) | Owner |
| 08 | [Leases](08-leases.md) | Owner, Tenant |
| 09 | [Rent & payments](09-rent-payments.md) | Owner, Tenant |
| 10 | [Maintenance](10-maintenance.md) | Tenant, Owner, Staff |
| 11 | [Cleaning](11-cleaning.md) | Owner, Staff |
| 12 | [Staff management](12-staff-management.md) | Owner, Staff |
| 13 | [Warnings (automatic & manual)](13-warnings.md) | System, Owner, Tenant |
| 14 | [Notifications](14-notifications.md) | anyone |
| 15 | [Owner AI assistant](15-ai-assistant.md) | Owner |
| 16 | [AI fallback (NVIDIA → rule-based)](16-ai-fallback.md) | System / AI |
| 17 | [Dashboards & analytics](17-dashboards-analytics.md) | Owner, Tenant, Staff |
| 18 | [Food option](18-food-option.md) | Owner, Tenant |
| 19 | [Audit logging](19-audit-logging.md) | System |

## Conventions used in these docs

- **API paths** are relative to `http://localhost:4000/api/v1`.
- **Roles** in a step header show who may call it: `[OWNER]`, `[TENANT]`, `[STAFF]`.
- **State** lines show enum transitions, e.g. `Application: DOCS_PENDING → UNDER_AI_REVIEW`.
- Diagrams use Mermaid.
- "Advisory only" means the AI result never changes state on its own — a human acts on it.

## The one rule that shapes everything

> The AI provides an **advisory score / recommendation only**. It never approves
> or rejects a tenant. The **owner always makes the final decision**.

Workflows 05 and 06 are deliberately separate steps for this reason.
