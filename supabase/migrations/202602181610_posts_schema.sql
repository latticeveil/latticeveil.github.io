-- Posts table for community functionality
-- Migration: 202602181610_posts_schema.sql

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_activity_at timestamptz default now(), -- For auto-extend
  view_count integer default 0,
  like_count integer default 0,
  comment_count integer default 0
);

-- Indexes
create index if not exists idx_posts_author_id on public.posts(author_id);
create index if not exists idx_posts_created_at on public.posts(created_at);
create index if not exists idx_posts_last_activity_at on public.posts(last_activity_at);

-- RLS policies
alter table public.posts enable row level security;

-- Public read
create policy "posts_select_public"
  on public.posts for select
  to anon, authenticated
  using (true);

-- Authors can insert their own posts
create policy "posts_insert_own"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = author_id);

-- Authors can update their own posts
create policy "posts_update_own"
  on public.posts for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- Authors can delete their own posts
create policy "posts_delete_own"
  on public.posts for delete
  to authenticated
  using (auth.uid() = author_id);

-- Grants
grant usage on schema public to anon;
grant select on public.posts to anon;
grant all on public.posts to authenticated;
