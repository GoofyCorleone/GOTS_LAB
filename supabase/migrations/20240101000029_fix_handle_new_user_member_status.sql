-- Migration 27's handle_new_user() dropped member_status/career from the
-- INSERT while the column stayed NOT NULL (set in migration 17) — every
-- signup since has been failing at the DB trigger with a NOT NULL violation.
-- Restores those two fields, and relaxes the NOT NULL since external
-- (non-UIS) accounts introduced in migration 28 have no member_status at
-- all: it's now required only when access_scope = 'uis'.
alter table public.profiles
  alter column member_status drop not null;

alter table public.profiles
  add constraint profiles_member_status_required_for_uis
  check (access_scope = 'external' or member_status is not null);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (
    id, email, full_name, first_name, last_name, member_status, career, access_scope, institution
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'member_status',
    new.raw_user_meta_data->>'career',
    case when new.raw_user_meta_data->>'account_type' = 'external_requester' then 'external' else 'uis' end,
    new.raw_user_meta_data->>'institution'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
