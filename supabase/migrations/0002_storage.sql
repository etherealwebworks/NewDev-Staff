-- ============================================================
-- Private storage bucket for work attachments.
-- Files are written and read only by the Express API (service role) and
-- handed to users as short-lived signed URLs. No storage policies are
-- created on purpose, so nobody can reach the bucket directly.
-- Guarded so the migration also runs on plain Postgres (no storage schema).
-- ============================================================
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('work-files', 'work-files', false, 10485760)
    on conflict (id) do update set public = false, file_size_limit = 10485760;
  end if;
end
$$;
