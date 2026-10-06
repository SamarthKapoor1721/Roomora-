# Deploy Roomora

This project deploys as a Render API and private AI service, a Vercel frontend, and a MongoDB Atlas database. No credentials belong in Git.

## 1. Prepare Atlas

Create a production database user with read/write access to the `srms` database. Use a connection string with the database name, for example `mongodb+srv://USER:PASSWORD@HOST/srms?retryWrites=true&w=majority`. URL-encode special characters in the username or password. Add the Render service's outbound IP range to the Atlas IP access list. If you use broad access temporarily during setup, replace it with the narrowest available range afterward.

Rotate any database password that has been shared in chat or a ticket before using it for production.

## 2. Create the Render Blueprint

Create a Blueprint from the repository's [`render.yaml`](../render.yaml). It defines:

- `roomora-api`: Node API, persistent upload disk, health check at `/health`, and database setup before each deploy.
- `roomora-ai`: private Python service, reachable only by the API. It runs the rule-based fallback without an NVIDIA key.

Render prompts for `DATABASE_URL` and `CORS_ORIGIN`. Set `CORS_ORIGIN` to the exact Vercel production origin, such as `https://roomora.example.com`, with no trailing slash. Render generates separate JWT secrets. Once the services exist, optionally set `NVIDIA_NIM_API_KEY` on `roomora-ai` for NVIDIA inference. The backend receives the AI service's private host and port automatically.

The Blueprint uses paid compute and a persistent disk. The disk is necessary because uploads are currently stored on the API server's filesystem. Do not remove it unless uploads are moved to object storage. Database setup uses `prisma db push` and the custom index setup script; it does not seed demo users.

## 3. Create the Vercel project

Import the same repository into Vercel. Set **Root Directory** to `frontend`, **Framework Preset** to Vite, **Build Command** to `npm run build`, and **Output Directory** to `dist`. Set the build-time environment variable `VITE_API_ORIGIN` to the API's public HTTPS URL, such as `https://roomora-api.onrender.com`, with no path or trailing slash. This URL is public configuration, not a secret.

[`frontend/vercel.json`](../frontend/vercel.json) makes React Router deep links load correctly. The frontend sends API requests and loads public listing images from `VITE_API_ORIGIN`. Private documents and work photos are fetched through authenticated API routes.

When the final Vercel domain is known, update `CORS_ORIGIN` on Render if it differs from the value entered during Blueprint setup. Set multiple allowed origins as a comma-separated list only when each origin is trusted. Redeploy the frontend after changing `VITE_API_ORIGIN`; Vite embeds it at build time.

## 4. Verify the deployment

1. Open the API's `/health` endpoint and the AI service's `/health` endpoint from within Render.
2. Load `/welcome`, then refresh `/login` directly to verify the SPA fallback.
3. Register or sign in, create a property and room, and upload a listing photo.
4. Upload an application document and verify that an authorized owner or tenant can open it, while the public `/uploads/application-documents/...` path returns 404.
5. Restart or redeploy the API and confirm the uploaded file is still available.

Only seed the sample accounts in an isolated demo database. `npm run db:seed` creates accounts with a publicly documented password.

For Atlas IP access and host configuration, see [MongoDB Atlas network access](https://www.mongodb.com/docs/atlas/security/ip-access-list/). For the deployment settings, see [Render Blueprints](https://render.com/docs/blueprint-spec), [Render persistent disks](https://render.com/docs/disks), and [Vercel Vite deployments](https://vercel.com/docs/frameworks/frontend/vite).
