-- Temporary diagnostic function to audit what actually exists in the remote
-- database vs. what migration files claim. Dropped by the next migration
-- once the audit is done.
create or replace function public.debug_schema_info()
returns table(kind text, name text, detail text)
language sql
security definer
set search_path = public
as $$
  select 'policy'::text, schemaname || '.' || tablename || '.' || policyname, cmd::text
  from pg_policies where schemaname = 'public'
  union all
  select 'trigger'::text, event_object_table || '.' || trigger_name, action_timing || ' ' || event_manipulation
  from information_schema.triggers where trigger_schema = 'public'
  union all
  select 'function'::text, routine_name, routine_type
  from information_schema.routines where routine_schema = 'public' and routine_type = 'FUNCTION'
  union all
  select 'table'::text, table_name, table_type
  from information_schema.tables where table_schema = 'public';
$$;

grant execute on function public.debug_schema_info() to authenticated;
