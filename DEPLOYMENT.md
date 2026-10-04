# Deployment guide

Three pieces: **Supabase** (database, auth, file storage), the **API** (`server/`, Node 18+) and the **frontend** (`client/`, static files).

## 1. Supabase

1. Create a project at supabase.com.
2. SQL editor: run `supabase/migrations/0001_init.sql`, then `0002_storage.sql` (creates the private `work-files` bucket).
3. Project Settings -> API: copy the **Project URL**, the **anon key**, and the **service_role key**.
   The service_role key bypasses all security rules. It goes only into the API's environment, never into the frontend, a repo or a chat.
4. Authentication -> Providers -> Email: keep it enabled. Under Auth settings you may switch **off** "Allow new users to sign up": accounts here are created by the admin, never self-registered.

## 2. API (Render, or any Node host)

Render: New -> Blueprint, point it at this repo (`render.yaml` is included), then fill in the secrets it asks for.
Any other host: root directory `server`, build `npm install`, start `npm start`, health check `/api/health`.

| Variable | Value |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | from step 1 |
| `CLIENT_ORIGIN` | exact URL of the deployed frontend, no trailing slash (CORS allows only this origin) |
| `NODE_ENV` | `production` |
| `APP_TIMEZONE` | IANA zone used for "due today" and overdue (default `Asia/Kolkata`) |
| `ATTACHMENTS_ENABLED` | `false` to turn file uploads off (default on) |
| `AUTH_RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_WINDOW_MS` | login attempts per IP per window (default 10 per 15 min) |

The API runs the deadline reminder check inside the process every hour, so keep **one instance** running (a free plan that sleeps will skip reminders while asleep).

## 3. First admin

From `server/` with your `.env` filled in:

```bash
npm run create-admin -- you@company.com "Your Name" "a-strong-password"
```

Then sign in and add staff and clients from the app. (`npm run seed` is for development only; never run it against production, it creates accounts with known emails.)

## 4. Frontend (Vercel, Netlify, Cloudflare Pages)

- Root directory `client`, build `npm run build`, output `dist`.
- Environment variable `VITE_API_URL` = your API URL including `/api`, e.g. `https://newdev-api.onrender.com/api`. It is baked in at build time, so redeploy after changing it.
- Single-page-app routing is already configured (`vercel.json` for Vercel, `public/_redirects` for Netlify/Cloudflare).

Then set the API's `CLIENT_ORIGIN` to the frontend's final URL and redeploy the API.

## 5. After deploying: quick checks

1. `GET <api>/api/health` returns `{"status":"ok"}`.
2. Sign in as admin; add a client, a staff member and a work; assign it.
3. Sign in as that staff member (private window): they see only their work. Update progress; the admin gets a notification.
4. Upload a PDF to the work, download it, delete it.

## Security notes

- Role checks happen in the API on every request (`requireRole`, and staff are scoped to their own assignments in the data layer). Hiding a menu item is never relied on.
- The database also has row-level security as a second layer, but the API is the one that enforces rules: use the service-role key on the server only.
- Uploaded files are stored in a private bucket, checked by extension **and** content, capped at 10 MB, and downloaded through 60-second signed links that force a download.
- Rotate the service-role key immediately if it is ever exposed.
- Back up: Supabase's built-in daily backups (paid plans) or `pg_dump` on a schedule. Files in Storage are not part of a database dump.
