drop extension if exists "pg_net";

create sequence "public"."game_hashes_id_seq";

drop policy "game_builds_read_all" on "public"."game_builds";

drop policy "launcher_link_codes_insert_own" on "public"."launcher_link_codes";

drop policy "launcher_link_codes_select_own_active" on "public"."launcher_link_codes";

drop policy "tickets_delete_own_expired" on "public"."online_tickets";

drop policy "tickets_insert_own" on "public"."online_tickets";

drop policy "tickets_select_own" on "public"."online_tickets";

revoke delete on table "public"."dev_testers" from "anon";

revoke insert on table "public"."dev_testers" from "anon";

revoke references on table "public"."dev_testers" from "anon";

revoke select on table "public"."dev_testers" from "anon";

revoke trigger on table "public"."dev_testers" from "anon";

revoke truncate on table "public"."dev_testers" from "anon";

revoke update on table "public"."dev_testers" from "anon";

revoke delete on table "public"."dev_testers" from "authenticated";

revoke insert on table "public"."dev_testers" from "authenticated";

revoke references on table "public"."dev_testers" from "authenticated";

revoke select on table "public"."dev_testers" from "authenticated";

revoke trigger on table "public"."dev_testers" from "authenticated";

revoke truncate on table "public"."dev_testers" from "authenticated";

revoke update on table "public"."dev_testers" from "authenticated";

revoke delete on table "public"."dev_testers" from "service_role";

revoke insert on table "public"."dev_testers" from "service_role";

revoke references on table "public"."dev_testers" from "service_role";

revoke select on table "public"."dev_testers" from "service_role";

revoke trigger on table "public"."dev_testers" from "service_role";

revoke truncate on table "public"."dev_testers" from "service_role";

revoke update on table "public"."dev_testers" from "service_role";

revoke delete on table "public"."game_builds" from "anon";

revoke insert on table "public"."game_builds" from "anon";

revoke references on table "public"."game_builds" from "anon";

revoke select on table "public"."game_builds" from "anon";

revoke trigger on table "public"."game_builds" from "anon";

revoke truncate on table "public"."game_builds" from "anon";

revoke update on table "public"."game_builds" from "anon";

revoke delete on table "public"."game_builds" from "authenticated";

revoke insert on table "public"."game_builds" from "authenticated";

revoke references on table "public"."game_builds" from "authenticated";

revoke select on table "public"."game_builds" from "authenticated";

revoke trigger on table "public"."game_builds" from "authenticated";

revoke truncate on table "public"."game_builds" from "authenticated";

revoke update on table "public"."game_builds" from "authenticated";

revoke delete on table "public"."game_builds" from "service_role";

revoke insert on table "public"."game_builds" from "service_role";

revoke references on table "public"."game_builds" from "service_role";

revoke select on table "public"."game_builds" from "service_role";

revoke trigger on table "public"."game_builds" from "service_role";

revoke truncate on table "public"."game_builds" from "service_role";

revoke update on table "public"."game_builds" from "service_role";

revoke delete on table "public"."launcher_link_codes" from "anon";

revoke insert on table "public"."launcher_link_codes" from "anon";

revoke references on table "public"."launcher_link_codes" from "anon";

revoke select on table "public"."launcher_link_codes" from "anon";

revoke trigger on table "public"."launcher_link_codes" from "anon";

revoke truncate on table "public"."launcher_link_codes" from "anon";

revoke update on table "public"."launcher_link_codes" from "anon";

revoke delete on table "public"."launcher_link_codes" from "authenticated";

revoke insert on table "public"."launcher_link_codes" from "authenticated";

revoke references on table "public"."launcher_link_codes" from "authenticated";

revoke select on table "public"."launcher_link_codes" from "authenticated";

revoke trigger on table "public"."launcher_link_codes" from "authenticated";

revoke truncate on table "public"."launcher_link_codes" from "authenticated";

revoke update on table "public"."launcher_link_codes" from "authenticated";

revoke delete on table "public"."launcher_link_codes" from "service_role";

revoke insert on table "public"."launcher_link_codes" from "service_role";

revoke references on table "public"."launcher_link_codes" from "service_role";

revoke select on table "public"."launcher_link_codes" from "service_role";

revoke trigger on table "public"."launcher_link_codes" from "service_role";

revoke truncate on table "public"."launcher_link_codes" from "service_role";

revoke update on table "public"."launcher_link_codes" from "service_role";

revoke delete on table "public"."online_tickets" from "anon";

revoke insert on table "public"."online_tickets" from "anon";

revoke references on table "public"."online_tickets" from "anon";

revoke select on table "public"."online_tickets" from "anon";

revoke trigger on table "public"."online_tickets" from "anon";

revoke truncate on table "public"."online_tickets" from "anon";

revoke update on table "public"."online_tickets" from "anon";

revoke delete on table "public"."online_tickets" from "authenticated";

revoke insert on table "public"."online_tickets" from "authenticated";

revoke references on table "public"."online_tickets" from "authenticated";

revoke select on table "public"."online_tickets" from "authenticated";

revoke trigger on table "public"."online_tickets" from "authenticated";

revoke truncate on table "public"."online_tickets" from "authenticated";

revoke update on table "public"."online_tickets" from "authenticated";

revoke delete on table "public"."online_tickets" from "service_role";

revoke insert on table "public"."online_tickets" from "service_role";

revoke references on table "public"."online_tickets" from "service_role";

revoke select on table "public"."online_tickets" from "service_role";

revoke trigger on table "public"."online_tickets" from "service_role";

revoke truncate on table "public"."online_tickets" from "service_role";

revoke update on table "public"."online_tickets" from "service_role";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."profiles" from "authenticated";

revoke references on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

alter table "public"."dev_testers" drop constraint "dev_testers_user_id_fkey";

alter table "public"."game_builds" drop constraint "game_builds_channel_check";

alter table "public"."launcher_link_codes" drop constraint "launcher_link_codes_code_hash_key";

alter table "public"."launcher_link_codes" drop constraint "launcher_link_codes_user_id_fkey";

alter table "public"."online_tickets" drop constraint "online_tickets_channel_check";

alter table "public"."online_tickets" drop constraint "online_tickets_user_id_fkey";

alter table "public"."dev_testers" drop constraint "dev_testers_pkey";

alter table "public"."game_builds" drop constraint "game_builds_pkey";

alter table "public"."launcher_link_codes" drop constraint "launcher_link_codes_pkey";

alter table "public"."online_tickets" drop constraint "online_tickets_pkey";

drop index if exists "public"."dev_testers_pkey";

drop index if exists "public"."game_builds_pkey";

drop index if exists "public"."launcher_link_codes_code_hash_idx";

drop index if exists "public"."launcher_link_codes_code_hash_key";

drop index if exists "public"."launcher_link_codes_pkey";

drop index if exists "public"."launcher_link_codes_user_id_expires_at_idx";

drop index if exists "public"."online_tickets_pkey";

drop index if exists "public"."profiles_username_unique_idx";

drop table "public"."dev_testers";

drop table "public"."game_builds";

drop table "public"."launcher_link_codes";

drop table "public"."online_tickets";


  create table "public"."game_hashes" (
    "id" bigint not null default nextval('public.game_hashes_id_seq'::regclass),
    "hash" text not null,
    "target" text not null,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."game_hashes" enable row level security;


  create table "public"."users" (
    "id" text not null,
    "email" text,
    "name" text,
    "picture" text,
    "username" text,
    "aboutme" text,
    "statusmessage" text,
    "themecolor" text,
    "createdat" timestamp with time zone default now()
      );


alter table "public"."users" enable row level security;

alter sequence "public"."game_hashes_id_seq" owned by "public"."game_hashes"."id";

CREATE UNIQUE INDEX game_hashes_pkey ON public.game_hashes USING btree (id);

CREATE INDEX idx_game_hashes_target_active_updated ON public.game_hashes USING btree (target, is_active, updated_at DESC);

CREATE UNIQUE INDEX profiles_username_ci_unique ON public.profiles USING btree (lower(username)) WHERE (username IS NOT NULL);

CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);

CREATE UNIQUE INDEX profiles_username_lower_uniq ON public.profiles USING btree (lower(username));

CREATE UNIQUE INDEX users_email_unique ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);

CREATE UNIQUE INDEX users_username_unique ON public.users USING btree (lower(username)) WHERE (username IS NOT NULL);

CREATE UNIQUE INDEX users_username_unique_idx ON public.users USING btree (lower(username)) WHERE (username IS NOT NULL);

CREATE UNIQUE INDEX ux_game_hashes_target ON public.game_hashes USING btree (target);

alter table "public"."game_hashes" add constraint "game_hashes_pkey" PRIMARY KEY using index "game_hashes_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."profiles" add constraint "profiles_username_key" UNIQUE using index "profiles_username_key";

alter table "public"."users" add constraint "users_email_unique" UNIQUE using index "users_email_unique";

alter table "public"."users" add constraint "users_username_key" UNIQUE using index "users_username_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.cleanup_expired_media()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.extend_media_expiry(p_media_id uuid, p_extend_days integer DEFAULT NULL::integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.extend_post_activity(p_post_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updatedat = now();
  return new;
end;
$function$
;

grant delete on table "public"."game_hashes" to "anon";

grant insert on table "public"."game_hashes" to "anon";

grant references on table "public"."game_hashes" to "anon";

grant select on table "public"."game_hashes" to "anon";

grant trigger on table "public"."game_hashes" to "anon";

grant truncate on table "public"."game_hashes" to "anon";

grant update on table "public"."game_hashes" to "anon";

grant delete on table "public"."game_hashes" to "authenticated";

grant insert on table "public"."game_hashes" to "authenticated";

grant references on table "public"."game_hashes" to "authenticated";

grant select on table "public"."game_hashes" to "authenticated";

grant trigger on table "public"."game_hashes" to "authenticated";

grant truncate on table "public"."game_hashes" to "authenticated";

grant update on table "public"."game_hashes" to "authenticated";

grant delete on table "public"."game_hashes" to "service_role";

grant insert on table "public"."game_hashes" to "service_role";

grant references on table "public"."game_hashes" to "service_role";

grant select on table "public"."game_hashes" to "service_role";

grant trigger on table "public"."game_hashes" to "service_role";

grant truncate on table "public"."game_hashes" to "service_role";

grant update on table "public"."game_hashes" to "service_role";

grant select on table "public"."users" to "anon";

grant insert on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


  create policy "users_insert_own"
  on "public"."users"
  as permissive
  for insert
  to authenticated
with check ((email = (auth.jwt() ->> 'email'::text)));



  create policy "users_select_own"
  on "public"."users"
  as permissive
  for select
  to authenticated
using ((email = (auth.jwt() ->> 'email'::text)));



  create policy "users_select_public"
  on "public"."users"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "users_update_own"
  on "public"."users"
  as permissive
  for update
  to authenticated
using ((email = (auth.jwt() ->> 'email'::text)))
with check ((email = (auth.jwt() ->> 'email'::text)));



  create policy "Avatar delete own"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Avatar insert own"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Avatar update own"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])))
with check (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Banner delete own"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'banners'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Banner insert own"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'banners'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Banner update own"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'banners'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])))
with check (((bucket_id = 'banners'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Public read avatars"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Public read banners"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'banners'::text));



