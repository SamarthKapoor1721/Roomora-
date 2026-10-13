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

The Blueprint uses paid compute and a persistent disk. The disk is necessary because uploads are currently stored on the API server's filesystem. Do not remove it unless uploads are moved to object storage. Database setup uses `prisma db push` and the custom index setup script; no sample accounts are created.

If the API was created manually, the checked-in Blueprint does not automatically change that service. In the Render dashboard, open the **API web service** (not the frontend or AI service) and verify its plan supports disks. Attach a persistent disk with mount path `/opt/render/project/src/backend/uploads`, and set `UPLOAD_DIR` to that exact path. Files written elsewhere are lost on redeploy. A Free web service cannot attach a persistent disk; move it to a disk-capable plan or move uploads to object storage. [Render's disk documentation](https://render.com/docs/disks) explains mount paths and persistence.

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

### If listing photos disappear after a push

The database stores image paths, while the image bytes live in `UPLOAD_DIR`. A push can redeploy the API and erase those bytes if the running service has no persistent disk or uses a different mount path. From the **API service's Shell page** in Render, run `npm --workspace backend run images:check` to show the active upload directory and count missing property and room image files. Running the check on a laptop checks the laptop's files, not Render's disk.

Fix the disk and `UPLOAD_DIR` first, then restore missing files. If an older API instance still serves the images, `npm --workspace backend run images:sync -- https://OLD-API-ORIGIN` can copy public listing images to the current upload directory, using the same database; run it from the API service's Shell page with the persistent disk mounted. If the old files are gone, the database paths alone cannot reconstruct them. Remove the broken photos in the owner workspace and upload the originals again, or restore a Render disk snapshot if one exists. Re-run `images:check`, then redeploy once and verify the photos still load. Private documents require their own backup; `images:sync` only handles public listing photos.

Roomora includes its public Google OAuth web client ID in the frontend and API as a
default, so the Google button remains available if a Vercel build omits the optional
client ID variable. To use another client, set `GOOGLE_CLIENT_ID` on Render and
`VITE_GOOGLE_CLIENT_ID` on Vercel to the same value. Set `SUPER_ADMIN_EMAILS` on
Render to enable the admin portal. Add the Vercel site origin to the Google OAuth
web client's authorized JavaScript origins, then redeploy both services.

For Atlas IP access and host configuration, see [MongoDB Atlas network access](https://www.mongodb.com/docs/atlas/security/ip-access-list/). For the deployment settings, see [Render Blueprints](https://render.com/docs/blueprint-spec), [Render persistent disks](https://render.com/docs/disks), and [Vercel Vite deployments](https://vercel.com/docs/frameworks/frontend/vite).

## Slow first sign-in

If the first API `/health` request after inactivity takes tens of seconds but a repeat request is fast, check the API service's **actual instance plan** in Render. Free web services spin down while idle and can take about a minute to wake. The Blueprint above specifies paid compute for the API, but a manually created service can have a different plan. The frontend starts a health request as soon as the welcome, sign-in, or registration page opens and allows a longer auth request for a sleeping API.

The backend also wakes the AI service in the background on startup, `/health`, sign-in attempts, and authenticated activity. It combines simultaneous requests, caches a successful health check for one minute, and retries failed wake checks up to three times. Sign-in does not wait for AI. The API health response includes `ai.status` to show the latest warmup result. A `ready` result verifies the AI web service's health, not the availability of NVIDIA inference.

For manually created public AI services, set **the backend's** `AI_SERVICE_URL` to the AI service's HTTPS origin (for this deployment, `https://roomora-9wyb.onrender.com`), without `/health` or `/ai`. The Blueprint uses `AI_SERVICE_HOSTPORT` for its private service instead. Redeploy the backend after changing environment variables. Cold starts can still delay the first AI request, even when both services are being woken.
