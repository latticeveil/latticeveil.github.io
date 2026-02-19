-- Enable RLS and create policies for public.users
-- Migration: 20260218_01_users_rls_policies

-- Enable RLS on users table
alter table public.users enable row level security;

-- Drop existing policies if they exist
drop policy if exists "users_select_public" on public.users;
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_insert_own" on public.users;
drop policy if exists "users_update_own" on public.users;

-- Create public read policy - anyone can view profiles
create policy "users_select_public"
  on public.users for select
  to anon, authenticated
  using (true);

-- Create policies for authenticated users to manage their own rows by email
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

-- Add unique constraints
create unique index if not exists users_email_unique on public.users (email);
create unique index if not exists users_username_unique on public.users (lower(username)) where username is not null;
