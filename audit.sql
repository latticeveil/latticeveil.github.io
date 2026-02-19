-- 1) RLS enabled + forced
select
  n.nspname as schema,
  c.relname as table,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles','users');

-- 2) Policies on profiles/users
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles','users')
order by tablename, policyname;

-- 3) Table grants (who can do what)
select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and table_name in ('profiles','users')
order by table_name, grantee, privilege_type;

-- 4) Triggers that might sync auth/public data
select
  event_object_schema,
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema in ('public','auth')
order by event_object_schema, event_object_table, trigger_name;

-- 5) profiles columns (confirm no email)
select column_name, data_type
from information_schema.columns
where table_schema='public'
  and table_name='profiles'
order by ordinal_position;

-- 6) Duplicate usernames (case-insensitive)
select lower(username) as uname_norm, count(*)
from public.profiles
where username is not null and username <> ''
group by lower(username)
having count(*) > 1;

-- 7) Constraints on profiles
select
  conname,
  contype,
  pg_get_constraintdef(c.oid) as def
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname='public'
  and t.relname='profiles'
order by contype, conname;

-- 8) Indexes on profiles
select
  indexname,
  indexdef
from pg_indexes
where schemaname='public'
  and tablename='profiles'
order by indexname;
