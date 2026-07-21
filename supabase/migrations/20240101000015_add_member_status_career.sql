-- Adds the lab-specific academic status and program of study to profiles.
-- Distinct from the pre-existing `role` column (member/director/admin),
-- which is an authorization role and unrelated to this.
alter table public.profiles
  add column member_status text check (
    member_status in ('semillero', 'grupo_investigacion', 'tesista', 'profesor')
  ),
  add column career text;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, member_status, career)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'member_status',
    new.raw_user_meta_data->>'career'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
