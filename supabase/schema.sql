-- VoxWave demo: shared data across devices (D114). Run once in the Supabase SQL editor.
--
-- No accounts: every device uses the public (publishable) key and sees the same data. Only what the demo creates
-- lives here (demo patient, its sessions, synced device sessions, notes, scheduled visits, demo settings);
-- the 24 seeded patients are rebuilt in the browser from today's date and are never stored, so
-- "Reset demo" simply empties these tables and the audio bucket.
--
-- Anyone holding the publishable key (it ships in the web bundle) can read and wipe this data. Fine for a demo
-- with fictitious patients; never put real patient data in this project.

-- ---- Tables --------------------------------------------------------------------------------------------

create table if not exists public.demo_sessions (
  id          text primary key check (char_length(id) between 1 and 120),
  patient_id  text not null check (char_length(patient_id) between 1 and 60),
  started_at  timestamptz not null,
  -- The full Session object of the app (src/data/types.ts).
  data        jsonb not null check (pg_column_size(data) < 64000),
  created_at  timestamptz not null default now()
);

-- Small values keyed by name: demoName, nextResult, rehearsal, note:<patientId>, visit:<patientId>,
-- device:<deviceId>. One row per value, so two devices editing different things never overwrite each other.
create table if not exists public.demo_kv (
  key         text primary key check (char_length(key) between 1 and 120),
  value       jsonb not null check (pg_column_size(value) < 16000),
  updated_at  timestamptz not null default now()
);

-- Newer projects no longer grant table privileges to the API roles by default; RLS below still applies.
grant select, insert, update, delete on public.demo_sessions, public.demo_kv to anon, authenticated;

alter table public.demo_sessions enable row level security;
alter table public.demo_kv enable row level security;

drop policy if exists "demo shared access" on public.demo_sessions;
create policy "demo shared access" on public.demo_sessions
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "demo shared access" on public.demo_kv;
create policy "demo shared access" on public.demo_kv
  for all to anon, authenticated using (true) with check (true);

-- ---- Audio bucket ----------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('demo-audio', 'demo-audio', false, 10485760, array['audio/*', 'application/octet-stream'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "demo audio read" on storage.objects;
create policy "demo audio read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'demo-audio');

drop policy if exists "demo audio insert" on storage.objects;
create policy "demo audio insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'demo-audio');

drop policy if exists "demo audio update" on storage.objects;
create policy "demo audio update" on storage.objects
  for update to anon, authenticated using (bucket_id = 'demo-audio') with check (bucket_id = 'demo-audio');

drop policy if exists "demo audio delete" on storage.objects;
create policy "demo audio delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'demo-audio');
