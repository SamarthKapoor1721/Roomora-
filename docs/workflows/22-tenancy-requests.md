# Room visibility and tenancy requests

Tenant Browse rooms lists active rooms in active properties, including closed and full rooms. Only open rooms with available beds offer Apply. Owners open applications from Properties → room → Applications. Browse refreshes every 30 seconds and supports pagination.

Tenants submit LEAVE or CHANGE requests from Dashboard → Leave or change your room. Each active assignment allows one pending request. Tenants can cancel pending requests. Room changes are limited to open rooms with spare capacity managed by the current owner.

Owners review requests under Leases → Tenant move requests. Approval completes the move immediately after an explicit confirmation. Rejection leaves the current tenancy unchanged. Both parties receive notifications.

Leave approval ends the assignment and active leases and recomputes bed counts. Change approval also creates a new assignment and lease using the destination rent and deposit, existing rent due day, terms and lease end date. Room capacity and roommate limits are rechecked inside the approval transaction. Existing invoices are retained; deposit settlement and prorating require owner handling.

Routes:

- GET/POST `/tenant/tenancy-requests`
- GET `/tenant/tenancy-requests/options`
- POST `/tenant/tenancy-requests/:id/cancel`
- GET `/owner/tenancy-requests`
- POST `/owner/tenancy-requests/:id/review` with decision APPROVE/REJECT and optional ownerNote

Deployment requires `npm run db:generate` and `npm run db:push` before starting the new backend. Render's existing preDeployCommand runs db:push. The MongoDB setup installs uniqueness for active room assignments while allowing repeat historical stays. Deploy the frontend too. No production records are changed by generating the client or running the unit tests.
