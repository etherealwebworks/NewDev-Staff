-- ============================================================
-- NEWDEV Digital Solutions — Staff & Work Management
-- Initial schema. Staff <-> Works <-> Clients, many-to-many via
-- work_assignments. No billing tables of any kind.
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------- ENUMS ----------
create type user_role as enum ('admin', 'staff');
create type work_status as enum ('pending', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled');
create type work_priority as enum ('low', 'medium', 'high', 'urgent');

-- ---------- PROFILES ----------
-- One row per auth.users entry. Role lives here, never on the client.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  role user_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- STAFF ----------
-- Staff-specific details. id == profiles.id (one staff row per staff profile).
create table staff (
  id uuid primary key references profiles(id) on delete cascade,
  job_role text,
  department text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- CLIENTS ----------
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text,
  email text,
  phone text,
  address text,
  is_active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_clients_active on clients(is_active);
create index idx_clients_name on clients(lower(name));

-- ---------- WORKS ----------
create sequence work_code_seq start 1;

create table works (
  id uuid primary key default gen_random_uuid(),
  work_code text not null unique default ('WRK-' || lpad(nextval('work_code_seq')::text, 4, '0')),
  client_id uuid not null references clients(id) on delete restrict,
  title text not null,
  description text,
  notes text,
  search_text text not null default '',   -- maintained by triggers; powers fast search
  priority work_priority not null default 'medium',
  status work_status not null default 'pending',
  progress integer not null default 0 check (progress between 0 and 100),
  start_date date,
  deadline date,
  completed_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (deadline is null or start_date is null or deadline >= start_date)
);

create index idx_works_client on works(client_id);
create index idx_works_status on works(status);
create index idx_works_priority on works(priority);
create index idx_works_deadline on works(deadline);
create index idx_works_created on works(created_at desc);
create index idx_works_search on works using gin (search_text gin_trgm_ops);

-- ---------- WORK ASSIGNMENTS ----------
-- The ONLY assignment mechanism. A staff member can hold many works (for
-- many clients); a work can have one or several staff.
create table work_assignments (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete restrict,
  assigned_by uuid references profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (work_id, staff_id)
);

create index idx_assignments_staff on work_assignments(staff_id);
create index idx_assignments_work on work_assignments(work_id);

-- ---------- WORK UPDATES ----------
create table work_updates (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works(id) on delete cascade,
  staff_id uuid references profiles(id) on delete set null,
  status work_status,
  progress integer check (progress between 0 and 100),
  comment text,
  created_at timestamptz not null default now()
);

create index idx_updates_work on work_updates(work_id, created_at desc);

-- ---------- WORK ATTACHMENTS ----------
-- Files live in the private Supabase Storage bucket "work-files";
-- file_path is the object path inside that bucket.
create table work_attachments (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works(id) on delete cascade,
  uploaded_by uuid references profiles(id) on delete set null,
  file_name text not null,
  file_path text not null,
  mime_type text,
  size_bytes integer check (size_bytes is null or size_bytes <= 10485760),
  created_at timestamptz not null default now()
);

create index idx_attachments_work on work_attachments(work_id);

-- ---------- NOTIFICATIONS ----------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  message text,
  type text not null,            -- e.g. 'work_assigned', 'deadline_approaching', 'work_completed'
  work_id uuid references works(id) on delete cascade,
  dedupe_key text,               -- prevents repeat deadline/overdue alerts
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id, is_read, created_at desc);
-- NULL dedupe_keys never collide, so no partial predicate is needed (and upsert can target it).
create unique index idx_notifications_dedupe on notifications(user_id, dedupe_key);

-- ---------- ACTIVITY LOGS ----------
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  action text not null,          -- e.g. 'work.create', 'work.assign', 'work.status_change'
  entity_type text not null,     -- 'work', 'staff', 'client'
  entity_id uuid,
  work_id uuid references works(id) on delete cascade,  -- set when the entry belongs on a work timeline
  description text not null,
  created_at timestamptz not null default now()
);

create index idx_activity_work on activity_logs(work_id, created_at desc);
create index idx_activity_entity on activity_logs(entity_type, entity_id);
create index idx_activity_created on activity_logs(created_at desc);

-- ---------- COMPANY SETTINGS (single row) ----------
create table company_settings (
  id integer primary key default 1 check (id = 1),
  company_name text not null default 'NEWDEV Digital Solutions',
  logo_url text,
  email text,
  phone text,
  address text,
  default_theme text not null default 'system' check (default_theme in ('light', 'dark', 'system')),
  updated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into company_settings (id) values (1);

-- ---------- updated_at TRIGGER ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on profiles for each row execute function set_updated_at();
create trigger trg_staff_updated before update on staff for each row execute function set_updated_at();
create trigger trg_clients_updated before update on clients for each row execute function set_updated_at();
create trigger trg_works_updated before update on works for each row execute function set_updated_at();


-- ---------- SEARCH TEXT MAINTENANCE ----------
-- One searchable string per work: title, code, client, and assigned staff
-- names. Lets the API search "work title / client / staff / work ID" with a
-- single indexed ILIKE instead of cross-table id lists.
create or replace function refresh_work_search(p_work_id uuid)
returns void language sql security definer set search_path = public as $$
  update works w set search_text = lower(concat_ws(' ',
    w.title, w.work_code, c.name, c.company_name,
    (select string_agg(p.full_name, ' ')
       from work_assignments a join profiles p on p.id = a.staff_id
      where a.work_id = w.id)
  ))
  from clients c
  where w.id = p_work_id and c.id = w.client_id;
$$;

create or replace function trg_works_search() returns trigger language plpgsql as $$
begin
  perform refresh_work_search(new.id);
  return null;
end;
$$;

create or replace function trg_assignments_search() returns trigger language plpgsql as $$
begin
  perform refresh_work_search(coalesce(new.work_id, old.work_id));
  return null;
end;
$$;

create or replace function trg_clients_search() returns trigger language plpgsql as $$
declare r record;
begin
  for r in select id from works where client_id = new.id loop
    perform refresh_work_search(r.id);
  end loop;
  return null;
end;
$$;

create or replace function trg_profiles_search() returns trigger language plpgsql as $$
declare r record;
begin
  for r in select work_id as id from work_assignments where staff_id = new.id loop
    perform refresh_work_search(r.id);
  end loop;
  return null;
end;
$$;

-- "update of title, client_id" means writing search_text itself never re-fires this.
create trigger trg_works_search after insert or update of title, client_id on works
  for each row execute function trg_works_search();
create trigger trg_assignments_search after insert or delete on work_assignments
  for each row execute function trg_assignments_search();
create trigger trg_clients_search after update of name, company_name on clients
  for each row execute function trg_clients_search();
create trigger trg_profiles_search after update of full_name on profiles
  for each row execute function trg_profiles_search();

-- ---------- HELPER VIEWS ----------
-- A work is overdue when its deadline has passed and it is neither
-- completed nor cancelled. Computed live so it can never go stale.
create or replace view works_with_overdue as
select
  w.*,
  (w.deadline is not null
    and w.deadline < current_date
    and w.status not in ('completed', 'cancelled')) as is_overdue
from works w;

-- Per-staff workload. "Active" = assigned work that is not completed/cancelled.
create or replace view staff_workload as
select
  s.id as staff_id,
  count(w.id) filter (where w.status not in ('completed', 'cancelled')) as active_works,
  count(w.id) filter (where w.status = 'completed') as completed_works,
  count(w.id) filter (where w.is_overdue) as overdue_works,
  coalesce(round(avg(w.progress) filter (where w.status not in ('completed', 'cancelled'))), 0) as avg_progress
from staff s
left join work_assignments a on a.staff_id = s.id
left join works_with_overdue w on w.id = a.work_id
group by s.id;

-- Per-client work counts.
create or replace view client_work_summary as
select
  c.id as client_id,
  count(w.id) as total_works,
  count(w.id) filter (where w.status not in ('completed', 'cancelled')) as active_works,
  count(w.id) filter (where w.status = 'pending') as pending_works,
  count(w.id) filter (where w.status = 'in_progress') as in_progress_works,
  count(w.id) filter (where w.status = 'completed') as completed_works,
  count(w.id) filter (where w.is_overdue) as overdue_works
from clients c
left join works_with_overdue w on w.client_id = c.id
group by c.id;

-- ---------- ROW LEVEL SECURITY ----------
-- The Express API uses the service-role key and enforces authorization in
-- middleware. RLS is a second layer in case a request ever reaches the
-- database directly with a user token.
alter table profiles enable row level security;
alter table staff enable row level security;
alter table clients enable row level security;
alter table works enable row level security;
alter table work_assignments enable row level security;
alter table work_updates enable row level security;
alter table work_attachments enable row level security;
alter table notifications enable row level security;
alter table activity_logs enable row level security;
alter table company_settings enable row level security;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

create or replace function is_assigned_to(p_work_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from work_assignments where work_id = p_work_id and staff_id = auth.uid()
  );
$$;

-- profiles
create policy profiles_self_read on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_admin_write on profiles for insert with check (is_admin());
create policy profiles_admin_update on profiles for update using (is_admin());

-- staff
create policy staff_self_read on staff for select using (id = auth.uid() or is_admin());
create policy staff_admin_all on staff for all using (is_admin()) with check (is_admin());

-- clients: admin full; staff may read a client only through a work assigned to them
create policy clients_admin_all on clients for all using (is_admin()) with check (is_admin());
create policy clients_staff_read on clients for select using (
  exists (
    select 1 from works w
    join work_assignments a on a.work_id = w.id
    where w.client_id = clients.id and a.staff_id = auth.uid()
  )
);

-- works: admin full; staff read their assigned works only
create policy works_admin_all on works for all using (is_admin()) with check (is_admin());
create policy works_staff_read on works for select using (is_assigned_to(id));

-- assignments
create policy assignments_admin_all on work_assignments for all using (is_admin()) with check (is_admin());
create policy assignments_staff_read on work_assignments for select using (staff_id = auth.uid());

-- updates: staff read/insert on their own works
create policy updates_admin_all on work_updates for all using (is_admin()) with check (is_admin());
create policy updates_staff_read on work_updates for select using (is_assigned_to(work_id));
create policy updates_staff_insert on work_updates for insert with check (is_assigned_to(work_id) and staff_id = auth.uid());

-- attachments
create policy attachments_admin_all on work_attachments for all using (is_admin()) with check (is_admin());
create policy attachments_staff_read on work_attachments for select using (is_assigned_to(work_id));
create policy attachments_staff_insert on work_attachments for insert with check (is_assigned_to(work_id) and uploaded_by = auth.uid());

-- notifications: each user sees and updates only their own
create policy notifications_own_read on notifications for select using (user_id = auth.uid());
create policy notifications_own_update on notifications for update using (user_id = auth.uid());
create policy notifications_admin_all on notifications for all using (is_admin()) with check (is_admin());

-- activity: admin sees all; staff see entries on works assigned to them
create policy activity_admin_read on activity_logs for select using (is_admin());
create policy activity_staff_read on activity_logs for select using (work_id is not null and is_assigned_to(work_id));

-- settings: everyone signed in can read (branding); only admin updates
create policy settings_read on company_settings for select using (auth.uid() is not null);
create policy settings_admin_write on company_settings for update using (is_admin());
