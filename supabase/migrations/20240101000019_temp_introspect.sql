-- TEMPORARY introspection function to verify live DB state. Dropped in 0020.
create or replace function public.__introspect()
returns jsonb language sql security definer set search_path = public, pg_catalog as $$
  select jsonb_build_object(
    'rls', (
      select jsonb_agg(jsonb_build_object('table', c.relname, 'rls', c.relrowsecurity))
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    ),
    'policies', (
      select jsonb_agg(jsonb_build_object(
        'table', tablename, 'policy', policyname, 'cmd', cmd,
        'roles', roles, 'qual', qual, 'withcheck', with_check))
      from pg_policies where schemaname = 'public'
    ),
    'triggers', (
      select jsonb_agg(jsonb_build_object(
        'table', c.relname, 'trigger', t.tgname, 'enabled', t.tgenabled,
        'func', p.proname))
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_proc p on p.oid = t.tgfoid
      where n.nspname = 'public' and not t.tgisinternal
    ),
    'functions', (
      select jsonb_agg(jsonb_build_object(
        'name', p.proname, 'secdef', p.prosecdef))
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
    ),
    'constraints', (
      select jsonb_agg(jsonb_build_object(
        'table', c.relname, 'name', con.conname, 'type', con.contype,
        'def', pg_get_constraintdef(con.oid)))
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and con.contype in ('c','n')
    ),
    'columns', (
      select jsonb_agg(jsonb_build_object(
        'table', table_name, 'col', column_name,
        'nullable', is_nullable, 'default', column_default))
      from information_schema.columns
      where table_schema = 'public'
        and table_name in ('profiles','inventory_items')
    ),
    'storage_policies', (
      select jsonb_agg(jsonb_build_object(
        'policy', policyname, 'cmd', cmd, 'roles', roles,
        'qual', qual, 'withcheck', with_check))
      from pg_policies where schemaname = 'storage' and tablename = 'objects'
    ),
    'storage_buckets', (
      select jsonb_agg(jsonb_build_object('id', id, 'public', public))
      from storage.buckets
    ),
    'table_grants', (
      select jsonb_agg(jsonb_build_object(
        'table', table_name, 'grantee', grantee, 'priv', privilege_type))
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = 'experiment_legal_acceptance'
    )
  );
$$;
