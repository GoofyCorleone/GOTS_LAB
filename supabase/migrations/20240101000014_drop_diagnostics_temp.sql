-- Cleanup: remove the temporary schema-introspection function used to
-- audit which migrations had actually been applied to the remote database.
drop function if exists public.debug_schema_info();
