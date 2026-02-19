-- Create public profiles table with proper RLS
-- Migration: 20260218_03_create_profiles.sql

-- Create public.profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  name text,
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

-- Add case-insensitive unique index on username
create unique index if not exists profiles_username_ci_unique 
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

-- Migrate existing data from users table (safe UUID source)
insert into public.profiles (id, username, name, picture, aboutme, statusmessage, themecolor, createdat)
select 
  au.id,
  lower(u.username) as username,
  u.name,
  u.picture,
  u.aboutme,
  u.statusmessage,
  u.themecolor,
  coalesce(u.createdat, now())
from public.users u
join auth.users au on au.email = u.email
where u.username is not null and trim(u.username) <> ''
on conflict (id) do update set
  username      = excluded.username,
  name          = excluded.name,
  picture       = excluded.picture,
  aboutme       = excluded.aboutme,
  statusmessage = excluded.statusmessage,
  themecolor    = excluded.themecolor;

-- Lock down public.users table (remove public access)
drop policy if exists "users_select_public" on public.users;
revoke select on public.users from anon;
