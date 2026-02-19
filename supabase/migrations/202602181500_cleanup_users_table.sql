-- Delete all data from public.users table (safe cleanup)
-- Migration: 202602181500_cleanup_users_table.sql

-- Remove all data from public.users table when present in legacy environments.
do $$
begin
  if to_regclass('public.users') is not null then
    delete from public.users;
  end if;
end
$$;

-- Note: Table structure kept for now in case any legacy code references it
-- No new data will be inserted since we removed all writes to this table
