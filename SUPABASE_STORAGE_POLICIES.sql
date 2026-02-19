-- SUPABASE STORAGE POLICIES
-- Paste this in Supabase SQL Editor
-- Run AFTER creating 'avatars' and 'banners' buckets (public)

-- Drop any existing conflicting policies first
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'storage.objects' 
        AND (
            policyname LIKE '%avatars%' OR 
            policyname LIKE '%banners%'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    END LOOP;
END $$;

-- Public read policies (for displaying images)
CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Public read banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

-- Avatar bucket - owner-only write policies
CREATE POLICY "Avatar insert own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Avatar update own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Avatar delete own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Banner bucket - owner-only write policies
CREATE POLICY "Banner insert own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'banners'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Banner update own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'banners'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'banners'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Banner delete own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'banners'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- NOTE: 
-- 1. Create buckets 'avatars' and 'banners' in Supabase Dashboard first
-- 2. Set buckets to PUBLIC (for read access)
-- 3. These policies control write access only
-- 4. Users can only write to their own folder: {userId}/...
