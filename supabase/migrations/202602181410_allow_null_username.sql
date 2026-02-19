-- Allow null usernames in profiles table
-- Migration: 202602181410_allow_null_username.sql

-- Make username nullable temporarily for new users
alter table public.profiles alter column username drop not null;
alter table public.profiles alter column username set default null;
