-- Ensure per-user theme preference column exists.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme text;
