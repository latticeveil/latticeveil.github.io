-- Media storage schema for ImageKit integration
-- Migration: 202602181600_media_schema.sql

-- Media types
create type media_type as enum ('chat', 'post', 'avatar', 'banner');

-- Media table for ImageKit integration
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  file_id text not null, -- ImageKit file ID
  owner_id uuid not null references auth.users(id) on delete cascade,
  media_type media_type not null,
  post_id uuid references public.posts(id) on delete cascade, -- Only for post media
  file_url text not null,
  file_name text not null,
  file_size integer not null,
  width integer,
  height integer,
  mime_type text not null,
  created_at timestamptz default now(),
  expires_at timestamptz, -- Auto-deletion time
  hard_delete_at timestamptz, -- Final deletion time
  last_viewed_at timestamptz, -- For auto-extend
  updated_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_media_owner_id on public.media(owner_id);
create index if not exists idx_media_post_id on public.media(post_id);
create index if not exists idx_media_expires_at on public.media(expires_at);
create index if not exists idx_media_hard_delete_at on public.media(hard_delete_at);

-- RLS policies
alter table public.media enable row level security;

-- Users can only access their own media
create policy "media_select_own"
  on public.media for select
  to authenticated
  using (auth.uid() = owner_id);

-- Users can insert their own media
create policy "media_insert_own"
  on public.media for insert
  to authenticated
  with check (auth.uid() = owner_id);

-- Users can update their own media
create policy "media_update_own"
  on public.media for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Users can delete their own media
create policy "media_delete_own"
  on public.media for delete
  to authenticated
  using (auth.uid() = owner_id);

-- Public read for avatars and banners (profiles)
create policy "media_select_public_profiles"
  on public.media for select
  to anon, authenticated
  using (media_type in ('avatar', 'banner'));

-- Public read for posts and chat (with expiry check)
create policy "media_select_public_content"
  on public.media for select
  to anon, authenticated
  using (media_type in ('post', 'chat') and (expires_at is null or expires_at > now()));

-- Grants
grant usage on schema public to anon;
grant select on public.media to anon;
grant all on public.media to authenticated;
