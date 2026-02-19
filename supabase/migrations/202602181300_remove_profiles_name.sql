-- Remove name column from profiles table
-- Migration: 202602181300_remove_profiles_name.sql

alter table public.profiles drop column if exists name;
