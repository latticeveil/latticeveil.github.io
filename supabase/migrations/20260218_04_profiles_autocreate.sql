-- Auto-create profiles on signup with default usernames
-- Migration: 20260218_04_profiles_autocreate.sql

-- Add default username trigger for profiles
create or replace function public.set_default_username()
returns trigger as $$
begin
  if new.username is null or new.username = '' then
    new.username := 'user_' || left(new.id::text, 8);
  end if;
  -- Ensure username is lowercase
  new.username := lower(new.username);
  return new;
end;
$$ language plpgsql;

-- Create trigger to set default username before insert
create trigger set_default_username_trigger
  before insert on public.profiles
  for each row
  execute function public.set_default_username();

-- Add case-insensitive unique index on username
create unique index if not exists profiles_username_ci_unique 
  on public.profiles (lower(username)) 
  where username is not null;

-- Function to auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, picture)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email, 'Anonymous'),
    new.raw_user_meta_data->>'picture'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Ensure public.users is locked down (double-check)
drop policy if exists "users_select_public" on public.users;
revoke select on public.users from anon;
