-- Fix RLS policies for avatars and banners storage
-- Apply with: supabase db push

-- Drop existing policies if they exist
drop policy if exists "avatars_upload_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;
drop policy if exists "banners_upload_own" on storage.objects;
drop policy if exists "banners_update_own" on storage.objects;
drop policy if exists "banners_delete_own" on storage.objects;

-- Avatar bucket policies - owner-only write access
create policy "avatars_upload_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Banner bucket policies - owner-only write access
create policy "banners_upload_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'banners'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "banners_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'banners'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'banners'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "banners_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'banners'
  and (storage.foldername(name))[1] = auth.uid()::text
);
