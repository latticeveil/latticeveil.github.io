-- Create public profiles table with RLS and auto-create trigger
-- Migration: 20260218_05_profiles_complete.sql

-- Create public.profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  picture text,
  aboutme text,
  statusmessage text,
  themecolor text,
  createdat timestamptz default now(),
  updatedat timestamptz default now()
);

-- Create trigger to auto-update updatedat
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updatedat = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- Create unique index on username (case-insensitive, null values allowed)
create unique index if not exists profiles_username_unique_idx 
  on public.profiles (lower(username)) 
  where username is not null;

-- Enable RLS on profiles table
alter table public.profiles enable row level security;

-- Drop existing policies if they exist
drop policy if exists "profiles_select_public" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

-- Create public read policy - anyone can view profiles
create policy "profiles_select_public"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- Create policies for authenticated users to manage their own rows by id
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Grants for public access
grant usage on schema public to anon;
grant select on public.profiles to anon;

-- Function to auto-create profile on user signup
create or replace function public.handle_new_user_profile()
returns trigger as $$
begin
  insert into public.profiles (id, username, picture)
  values (
    new.id,
    lower('user_' || left(new.id::text, 8)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user_profile();

-- Lock down public.users table (remove public access)
drop policy if exists "users_select_public" on public.users;
revoke select on public.users from anon;
