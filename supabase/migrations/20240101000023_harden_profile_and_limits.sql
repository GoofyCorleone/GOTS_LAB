-- SECURITY FIX (found by the E2E audit): profiles_update_own let a user update
-- ANY column of their own row, including `role`. A plain lab member could send
--   PATCH /rest/v1/profiles?id=eq.<self>  {"role":"admin"}
-- and become an administrator. That role is consulted for privileged reads
-- (e.g. bug_reports triage), so this was a real privilege-escalation path.
--
-- RLS WITH CHECK can't compare against the OLD row, so the invariant is
-- enforced with a BEFORE UPDATE trigger instead: over the API nobody can change
-- their own id/email/role. Legitimate role changes are done by an administrator
-- through the Supabase dashboard / service_role, where auth.uid() is NULL.

create or replace function public.protect_profile_identity_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- No JWT ⇒ service_role or a direct DB session: trusted admin tooling.
  if auth.uid() is null then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'No puedes modificar el rol de autorización de un perfil';
  end if;

  if new.id is distinct from old.id then
    raise exception 'No puedes modificar el identificador de un perfil';
  end if;

  -- profiles.email mirrors auth.users.email; letting it drift would break the
  -- institutional-domain guarantee and the email notifications.
  if new.email is distinct from old.email then
    raise exception 'No puedes modificar el correo desde el perfil';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_identity_columns on public.profiles;
create trigger trg_protect_profile_identity_columns
before update on public.profiles
for each row execute function public.protect_profile_identity_columns();

-- Revert the escalation the audit performed on the seeded test account.
update public.profiles set role = 'member' where role <> 'member';

-- Data-quality limits: experiments.title/description were unbounded `text`,
-- so a 100k-character title was accepted and would break every list view.
alter table public.experiments
  add constraint experiments_title_length
    check (char_length(trim(title)) between 3 and 200),
  add constraint experiments_description_length
    check (description is null or char_length(description) <= 5000);
