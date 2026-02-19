-- Auto-create profiles on user signup
-- Migration: 20260218_11_profiles_autocreate_trigger.sql

-- Function to auto-create profile on user signup
create or replace function public.handle_new_user_profile()
returns trigger as $$
begin
  -- Only create if profile doesn't exist
  if not exists (
    select 1 from public.profiles where id = new.id limit 1
  ) then
    insert into public.profiles (id, username, name, picture)
    values (
      new.id,
      lower('user_' || left(new.id::text, 8)),
      coalesce(new.raw_user_meta_data->>'name', null),
      coalesce(new.raw_user_meta_data->>'picture', new.raw_user_meta_data->>'avatar_url', null)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user_profile();

-- Remove any public access from users table (security)
drop policy if exists "users_select_public" on public.users;
revoke select on public.users from anon;
