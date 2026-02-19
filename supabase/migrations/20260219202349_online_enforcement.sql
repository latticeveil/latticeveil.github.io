create extension if not exists pgcrypto;

create table if not exists public.game_builds (
  channel text primary key check (channel in ('dev', 'release')),
  sha256 text not null,
  updated_at timestamptz not null default now()
);

insert into public.game_builds (channel, sha256)
values
  ('dev', '0000000000000000000000000000000000000000000000000000000000000000'),
  ('release', '0000000000000000000000000000000000000000000000000000000000000000')
on conflict (channel) do nothing;

create table if not exists public.online_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text null,
  build_hash text not null,
  channel text not null check (channel in ('dev', 'release')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.dev_testers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.game_builds enable row level security;
alter table public.online_tickets enable row level security;
alter table public.dev_testers enable row level security;

drop policy if exists "game_builds_read_all" on public.game_builds;
create policy "game_builds_read_all"
on public.game_builds
for select
using (true);

drop policy if exists "tickets_insert_own" on public.online_tickets;
create policy "tickets_insert_own"
on public.online_tickets
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "tickets_select_own" on public.online_tickets;
create policy "tickets_select_own"
on public.online_tickets
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "tickets_delete_own_expired" on public.online_tickets;
create policy "tickets_delete_own_expired"
on public.online_tickets
for delete
to authenticated
using (auth.uid() = user_id and expires_at < now());
