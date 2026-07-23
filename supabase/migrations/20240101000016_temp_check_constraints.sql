create or replace function public.debug_list_constraints(p_table text)
returns table(constraint_name text, definition text)
language sql
security definer
set search_path = public
as $$
  select con.conname::text, pg_get_constraintdef(con.oid)::text
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = p_table;
$$;

grant execute on function public.debug_list_constraints(text) to authenticated;
