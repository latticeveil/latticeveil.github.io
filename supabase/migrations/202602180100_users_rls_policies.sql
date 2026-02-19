-- Enable RLS and create policies for public.users
-- Migration: 20260218_01_users_rls_policies
do $$
begin
  -- Legacy compatibility: some environments no longer have public.users.
  if to_regclass('public.users') is null then
    raise notice 'Skipping legacy users policy migration: public.users does not exist.';
    return;
  end if;

  alter table public.users enable row level security;

  grant select on table public.users to anon;
  grant select on table public.users to authenticated;

  drop policy if exists "users_select_public" on public.users;
  drop policy if exists "users_select_own" on public.users;
  drop policy if exists "users_insert_own" on public.users;
  drop policy if exists "users_update_own" on public.users;

  create policy "users_select_public"
    on public.users for select
    to anon, authenticated
    using (true);

  create policy "users_select_own"
    on public.users for select
    to authenticated
    using (email = (auth.jwt() ->> 'email'));

  create policy "users_insert_own"
    on public.users for insert
    to authenticated
    with check (email = (auth.jwt() ->> 'email'));

  create policy "users_update_own"
    on public.users for update
    to authenticated
    using (email = (auth.jwt() ->> 'email'))
    with check (email = (auth.jwt() ->> 'email'));

  create unique index if not exists users_email_unique on public.users (email);
  create unique index if not exists users_username_unique on public.users (lower(username)) where username is not null;
end
$$;
