# Roomora

Roomora is a rental management web app for property owners, tenants, staff, and platform administrators. Owners can take a room from listing through application, screening, approval, lease, rent, and everyday maintenance in one workspace. AI helps explain documents and portfolio data, while people make the decisions.

The repository is an npm workspace for the React frontend and Express API, plus a separate Python AI service. Some internal names still use the original `srms` project name.

## What the app does

| Workspace | Main capabilities |
| --- | --- |
| **Property owner** | Manage properties and rooms, control applications, review tenant documents and AI screening, approve or reject applications, assign rooms, create leases, generate rent invoices, track payments, coordinate maintenance and cleaning, manage staff and warnings, and use an AI assistant. |
| **Tenant** | Browse rooms open for applications, apply and submit documents, follow application status, view a room, roommates and lease, record payments against invoices, report maintenance with photos, and read warnings and notifications. |
| **Staff** | See assigned maintenance and cleaning work, update progress, add notes, and upload before and after photos. |
| **Super admin** | View platform counts, integration status and recent activity; search and filter users; create owner or tenant accounts; edit, deactivate, reactivate or delete eligible accounts. |

The owner dashboard shows occupancy, revenue, pending approvals, expiring leases, warnings and open work. **AI Insights run only when the owner selects Generate insights**; a full screen analysis view then presents insights, risks and opportunities. The owner can refresh them on demand.

The responsive workspace uses a left sidebar on desktop and a menu on smaller screens. Public welcome, registration and sign-in pages sit outside the workspace.

## Rental workflow

1. An owner creates a property and rooms, sets capacity and rent, and opens a room for applications.
2. A tenant applies, uploads the required documents, and submits the application for screening.
3. Roomora produces an advisory eligibility assessment, document review, and application summary. Missing or unsupported evidence is flagged for manual review.
4. The **owner makes the final approve or reject decision**. Approval assigns the tenant to a room and creates a lease.
5. The owner generates rent invoices and manages payments, maintenance, cleaning, staff and warnings throughout the tenancy.

AI never approves or rejects an application. The screening score is a criteria match based on document-supported income, required proofs and occupancy fit; it is not a probability of approval. See [AI screening](docs/workflows/05-ai-screening.md) and the [end-to-end workflow](docs/workflows/00-end-to-end.md).

Optional food charges can be enabled per property or room. A tenant can opt in where food is available, and the charge is included in the lease and generated invoices. The owner can also run warning scans manually; an hourly scan checks for overdue rent, lease expiry, missing documents, delayed tasks and related issues.

**Payments are records within Roomora, not real money transfers.** The app has no payment gateway integration. Tenants can record a payment method and amount against an invoice, and owners can track the resulting balance.

## Sign-in and access

- Owners and tenants can create an account with email and password, or use Google sign-in when OAuth is configured. New Google users choose the owner or tenant role; existing users retain their assigned role.
- A password account can connect a Google account with the same email from **Account → Google sign-in**.
- Owners create staff accounts. A staff member sees only assigned work.
- Super admin access comes from verified Google accounts whose email is in `SUPER_ADMIN_EMAILS`. Super admins cannot sign in with a password.
- The admin portal is at `/super_admin`. Deleting a user requires email confirmation and is blocked when the user has related property, tenancy or task records; deactivate that account instead.
- No demo users are seeded by the normal database setup.

Role checks run on the API as well as in the frontend. Authentication uses short-lived access tokens, rotating refresh tokens and hashed passwords. See [authentication](docs/workflows/01-authentication.md) and the [API reference](docs/API.md).

## AI features

The Python service uses NVIDIA NIM when configured and falls back to rule-based responses when the provider is unavailable. Its features include document inspection, application summaries, maintenance classification, lease summaries, an owner assistant, and on-demand portfolio insights. The backend has a further fallback if the AI service cannot be reached.

Document inspection can review supported uploaded images and PDF pages, but it cannot establish authenticity. The owner must inspect uncertain evidence and make the final decision. See [AI fallback](docs/workflows/16-ai-fallback.md) and [architecture notes](docs/ARCHITECTURE.md).

## Technology

| Layer | Stack |
| --- | --- |
| Frontend | React 18, TypeScript, React Router, TanStack Query, Tailwind CSS, Vite |
| API | Node.js, Express, TypeScript, Zod, JWT |
| Data | MongoDB Atlas or a MongoDB replica set, Prisma ORM |
| AI service | Python, FastAPI, NVIDIA NIM with rule-based fallback |
| Deployment | Vercel frontend, Render API and AI service, MongoDB Atlas |

The API is served under `/api/v1`. Both server services expose `/health` for health checks. Listing images are public; application documents and work photos use authenticated file routes. The API also applies CORS, request limits, upload checks and audit logging for important actions.

## Run locally

### Requirements

- Node.js 20+ and npm
- Python 3.11+
- A MongoDB Atlas database or MongoDB replica set

Use a separate development database. Configure the connection string with a database name, for example `/srms` before its query parameters. Atlas must allow your machine's IP and the database user needs read/write access.

### First run

```bash
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env
```

Set `DATABASE_URL` and replace the JWT example secrets in `backend/.env`. You can leave `NVIDIA_NIM_API_KEY` empty to use the rule-based AI fallback. Roomora includes its public Google OAuth web client ID in the app and API as a default; `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` can override it when using a different client. Add `http://localhost:5173` to the Google OAuth web client's authorized JavaScript origins. Set `SUPER_ADMIN_EMAILS` in the backend environment for admin access.

Then run:

```bash
npm start
```

`npm start` installs Node and Python dependencies when needed, generates the Prisma client, synchronizes the MongoDB schema and indexes, checks the database connection, and starts all three services. It does **not** seed sample users. Once set up, `npm run dev` starts the services without repeating the setup steps.

| Service | Local address |
| --- | --- |
| Web app | `http://localhost:5173` |
| API | `http://localhost:4000/api/v1` |
| API health | `http://localhost:4000/health` |
| AI service | `http://localhost:8001` |
| AI health | `http://localhost:8001/health` |

The frontend uses a Vite proxy for local API requests. `VITE_API_ORIGIN` is only needed when the frontend calls a separately hosted API.

### Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start frontend, API and AI service after setup |
| `npm run build` | Build the API and frontend |
| `npm test` | Run backend tests |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:push` | Sync the MongoDB schema and custom indexes |
| `npm run db:check` | Verify database connectivity |

There are no SQL migrations for the current MongoDB setup. Historical SQL migration files do not run during `db:push`.

## Environment variables

The templates are [backend/.env.example](backend/.env.example), [frontend/.env.example](frontend/.env.example) and [ai-service/.env.example](ai-service/.env.example). Keep credentials out of Git.

| Service | Key settings |
| --- | --- |
| API | `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `GOOGLE_CLIENT_ID`, `SUPER_ADMIN_EMAILS`, `UPLOAD_DIR`, `AI_SERVICE_URL` or `AI_SERVICE_HOSTPORT` |
| Frontend | `VITE_API_ORIGIN` for hosted API access; `VITE_GOOGLE_CLIENT_ID` for Google sign-in |
| AI | Optional `NVIDIA_NIM_API_KEY`; model and timeout settings in its example environment file |

## Deployment

See the [deployment guide](docs/deployment.md) for Atlas, Render, Vercel, OAuth origins, upload storage and verification steps. The checked-in [Render Blueprint](render.yaml) specifies paid compute and a persistent disk for uploaded files. A manually created Free Render service can have different behavior, including sleeping after inactivity; its actual instance plan is set in Render, not by the README.

For production, set the Vercel origin in the API's `CORS_ORIGIN`, the public API URL in Vercel's `VITE_API_ORIGIN`, and add the Vercel origin to the Google OAuth client's authorized JavaScript origins. If overriding the built-in public Google client ID, set the same ID on both sides. The frontend uses SPA routing rules in [frontend/vercel.json](frontend/vercel.json). Uploads currently live on the API server's filesystem, so a persistent disk or an object-storage migration is needed to retain them across restarts.

## Repository map

```text
backend/       Express API, Prisma schema, authentication and business modules
frontend/      React pages for public, owner, tenant, staff and admin workspaces
ai-service/    FastAPI endpoints, NVIDIA client and rule-based fallbacks
docs/          Deployment, API, architecture and workflow guides
scripts/       Local startup script
render.yaml    Render service definition
```

For deeper detail, start with [docs/workflows/README.md](docs/workflows/README.md), then use the [API reference](docs/API.md) and [architecture guide](docs/ARCHITECTURE.md).
