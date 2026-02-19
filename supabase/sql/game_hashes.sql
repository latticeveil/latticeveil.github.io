create table if not exists public.game_hashes (
  channel text primary key check (channel in ('dev', 'release')),
  hash_sha256 text not null check (hash_sha256 ~ '^[0-9a-f]{64}$'),
  version text null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

alter table public.game_hashes enable row level security;

grant select on public.game_hashes to anon, authenticated;
revoke insert, update, delete on public.game_hashes from anon, authenticated;

drop policy if exists "game_hashes_select_public" on public.game_hashes;
create policy "game_hashes_select_public"
on public.game_hashes
for select
to anon, authenticated
using (true);

insert into public.game_hashes (channel, hash_sha256, version)
values
  ('dev', repeat('0', 64), 'placeholder-dev'),
  ('release', repeat('0', 64), 'placeholder-release')
on conflict (channel) do nothing;
