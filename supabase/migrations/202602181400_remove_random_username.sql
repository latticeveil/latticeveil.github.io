-- Remove random username generation from auto-create trigger
-- Migration: 202602181400_remove_random_username.sql

-- Update auto-create trigger to NOT assign random username
create or replace function public.handle_new_user_profile()
returns trigger as $$
begin
  insert into public.profiles (id, picture)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;
