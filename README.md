# NEWDEV Digital Solutions — Staff & Work Management

An admin assigns **works** to **staff**; one staff member can hold many works for many clients, and one client can have many works spread across staff. The admin tracks status, deadlines and workload; staff see and update only their own works. There is **no billing** of any kind (no invoices, payments, amounts or tax).

**Stack:** React + Vite + JSX + Tailwind v4 + React Router + TanStack Query + Axios + Framer Motion + Lucide · Node + Express · PostgreSQL / Supabase (Auth, Storage, RLS) · JWT.
Built on the structure and look of the NEWDEV Billing app, with the billing code removed.

## What's in it

| Area | Admin | Staff |
|---|---|---|
| Dashboard | totals, staff workload, deadlines, activity | My Works, Pending, In Progress, Completed, Overdue, Due Soon, urgent list |
| Works | create / edit / delete / assign / reassign, search, filters, sort, pagination, **Kanban board** (drag to change status) | own works only, quick views, search, update status / progress / note, mark completed |
| Work page | details, progress, client, staff, schedule, updates, files, activity timeline | same, plus the update form |
| Staff, Clients | full management, workload and per-client works | — |
| Calendar | start dates, deadlines, overdue, completed | own works |
| Files | upload / download / delete (private storage, validated) | on assigned works |
| Notifications | completed, put on hold, overdue | assigned, reassigned, deadline changes, due today/tomorrow, overdue |
| Other | activity log, company settings | profile, change password |

Phones: sidebar becomes a drawer, tables become cards, modals become bottom sheets, and staff get a bottom tab bar.

## Run it locally

You need Node 18+ and a Supabase project.

1. In Supabase's SQL editor run `supabase/migrations/0001_init.sql` then `0002_storage.sql`.
2. API: `cd server && cp .env.example .env` (fill in the three Supabase values) `&& npm install && npm run dev` → http://localhost:4000
3. First admin: `npm run create-admin -- you@company.com "Your Name" "password"`
   (or `npm run seed` for demo data: 1 admin, 4 staff, 4 clients, 8 works; it prints the generated password. Arun has works for ABC Technologies ×2, XYZ Solutions and Digital World.)
4. Frontend: `cd client && cp .env.example .env && npm install && npm run dev` → http://localhost:5173
5. Tests: `cd server && npm test` (24 tests: authorization, overdue rules, validation, file checks).

Deployment (Supabase + Render + Vercel/Netlify) is in **DEPLOYMENT.md**.

## Data model

`staff 1—N work_assignments N—1 works N—1 clients`. Assignment lives **only** in `work_assignments` (never a `staff_id` on `works`), so a work can have several staff. Also: `profiles`, `work_updates`, `work_attachments`, `notifications`, `activity_logs`, `company_settings`; views `staff_workload`, `client_work_summary`, `works_with_overdue`.

## API

All routes need `Authorization: Bearer <access_token>` except login and refresh. The role is always re-read from `profiles`.

| | |
|---|---|
| `POST /api/auth/login`, `refresh`, `logout`, `change-password` · `GET /api/auth/me` | auth (change-password needs the current password) |
| `GET/POST /api/staff`, `GET/PUT/DELETE /api/staff/:id`, `PATCH /api/staff/:id/status`, `GET /api/staff/options`, `GET /api/staff/:id/works` | admin (the works route: staff may read their own) |
| `GET/POST /api/clients`, `GET/PUT/DELETE /api/clients/:id`, `PATCH …/status`, `GET /api/clients/options`, `GET /api/clients/:id/works` | admin |
| `GET /api/works`, `GET /api/works/:id`, `POST /api/works/:id/updates` | admin + staff (staff scoped to own works) |
| `POST/PUT/DELETE /api/works`, `POST /api/works/:id/assign` (`mode: add\|replace`), `DELETE /api/works/:id/assign/:staffId` | admin |
| `POST /api/works/:id/attachments`, `GET …/attachments/:attId/download`, `DELETE …/attachments/:attId` | admin + assigned staff |
| `GET /api/dashboard`, `GET /api/dashboard/calendar?from&to` | both (different payloads) |
| `GET /api/notifications`, `PATCH …/:id/read`, `PATCH …/read-all` | own notifications |
| `GET /api/activity` | admin |
| `GET/PUT /api/settings` | read: any user; write: admin |

`GET /api/works` query: `search, status, priority, staff_id, client_id, deadline (overdue|today|tomorrow|soon|none), deadline_from, deadline_to, sort (newest|oldest|deadline|priority), page, pageSize`. `status` accepts a comma list.

## Rules worth knowing

- **Overdue** = deadline passed and status not Completed or Cancelled (cancelled work can't be late).
- Staff can only set In Progress / On Hold / Completed. Completing sets progress to 100% and notifies the admin.
- Internal admin notes on a work are never sent to staff.
- Deleting a staff member or client with history is refused (409): deactivate instead. Deactivating signs a staff member out.
- Deadline reminders and overdue alerts run hourly inside the API and fire once per work.

## Verification status

- The migrations were applied to a real PostgreSQL 16 (stub `auth` schema) and exercised: work codes, search triggers, workload/overdue views, notification de-duplication, constraints, RLS helpers.
- 24 unit tests; the client builds; every screen was checked in a headless browser against a mocked API.
- **Not yet run against a live Supabase project.** Follow the post-deploy checks in DEPLOYMENT.md on first run, especially: Supabase Auth login, file upload/download through Storage, and the embedded queries (`scope.staff_id`, `profile.is_active`).
