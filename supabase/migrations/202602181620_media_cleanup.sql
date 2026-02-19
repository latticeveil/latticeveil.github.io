-- Media cleanup function for expired content
-- Migration: 202602181620_media_cleanup.sql

-- Function to clean up expired media
create or replace function public.cleanup_expired_media()
returns void as $$
declare
  expired_media record;
begin
  -- Find expired media and delete from ImageKit and database
  for expired_media in 
    select id, file_id, file_url
    from public.media
    where expires_at < now()
  loop
    -- TODO: Call ImageKit API to delete file
    -- This should be called from an edge function with ImageKit credentials
    -- For now, just remove from database
    
    delete from public.media where id = expired_media.id;
  end loop;
end;
$$ language plpgsql security definer;

-- Function to auto-extend media expiry
create or replace function public.extend_media_expiry(
  p_media_id uuid,
  p_extend_days integer default null
)
returns boolean as $$
declare
  media_record record;
  new_expires_at timestamptz;
  extend_days_val integer;
begin
  -- Get media record
  select * into media_record 
  from public.media 
  where id = p_media_id 
    and (expires_at is null or expires_at > now());
  
  if not found then
    return false;
  end if;
  
  -- Determine extend days based on media type
  if p_extend_days is not null then
    extend_days_val := p_extend_days;
  elsif media_record.media_type = 'chat' then
    extend_days_val := 30;
  elsif media_record.media_type = 'post' then
    extend_days_val := 180;
  else
    extend_days_val := 30; -- default
  end if;
  
  -- Calculate new expiry time
  new_expires_at := least(
    now() + (extend_days_val || ' days')::interval,
    media_record.hard_delete_at
  );
  
  -- Update expiry and last viewed
  update public.media 
  set 
    expires_at = new_expires_at,
    last_viewed_at = now(),
    updated_at = now()
  where id = p_media_id;
  
  return true;
end;
$$ language plpgsql security definer;

-- Function to auto-extend post activity
create or replace function public.extend_post_activity(
  p_post_id uuid
)
returns boolean as $$
declare
  post_record record;
  media_records record;
begin
  -- Update post last activity
  update public.posts 
  set 
    last_activity_at = now(),
    updated_at = now()
  where id = p_post_id;
  
  -- Extend all post media
  for media_records in 
    select id 
    from public.media 
    where post_id = p_post_id 
      and media_type = 'post'
  loop
    perform public.extend_media_expiry(media_records.id, 180);
  end loop;
  
  return true;
end;
$$ language plpgsql security definer;
