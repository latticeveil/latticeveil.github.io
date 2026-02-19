create extension if not exists pgcrypto;

create table if not exists public.launcher_link_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz null,
  issued_ip text null,
  user_agent text null
);

alter table public.launcher_link_codes enable row level security;

drop policy if exists "launcher_link_codes_insert_own" on public.launcher_link_codes;
create policy "launcher_link_codes_insert_own"
on public.launcher_link_codes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "launcher_link_codes_select_own_active" on public.launcher_link_codes;
create policy "launcher_link_codes_select_own_active"
on public.launcher_link_codes
for select
to authenticated
using (auth.uid() = user_id and used_at is null and expires_at > now());

create index if not exists launcher_link_codes_user_id_expires_at_idx
on public.launcher_link_codes (user_id, expires_at);

create index if not exists launcher_link_codes_code_hash_idx
on public.launcher_link_codes (code_hash);
