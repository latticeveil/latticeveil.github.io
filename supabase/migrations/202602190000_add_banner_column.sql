-- Add banner column to profiles table
-- Migration: 202602190000_add_banner_column.sql

alter table public.profiles add column if not exists banner text;
