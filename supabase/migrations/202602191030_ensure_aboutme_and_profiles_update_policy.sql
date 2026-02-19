-- Ensure profiles.aboutme exists and owner-only update policy is present.
-- This migration is idempotent and does not modify unrelated policies.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aboutme text;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_own'
  ) THEN
    EXECUTE 'DROP POLICY "profiles_update_own" ON public.profiles';
  END IF;
END $$;

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
