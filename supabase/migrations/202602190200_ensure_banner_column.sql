-- Ensure banner column exists in profiles table
alter table public.profiles add column if not exists banner text;
