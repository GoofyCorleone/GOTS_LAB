-- 1) Per-session observations (what the team noticed about the setup that day)
--    and per-user profile photos.
alter table public.experiment_sessions add column observations text;
alter table public.profiles add column avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_select" on storage.objects
  for select to public using (bucket_id = 'avatars');
create policy "avatars_upload_own" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');
create policy "avatars_update_own" on storage.objects
  for update to authenticated using (bucket_id = 'avatars' and auth.uid() = owner);
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars' and auth.uid() = owner);

-- 2) Sessions are now readable by any authenticated user, matching the
--    decision that experiments themselves are public (0021): anyone looking at
--    an experiment must be able to see how many sessions it has had.
drop policy if exists "experiment_sessions_select_participant" on public.experiment_sessions;
create policy "experiment_sessions_select_all_authenticated" on public.experiment_sessions
  for select to authenticated using (true);

-- 3) Collaborators (approved participants) may now write observations, so the
--    UPDATE policy widens from owner-only. Column-level limits are enforced by
--    the trigger below — the policy alone can't express "only this column".
drop policy if exists "experiment_sessions_update_owner" on public.experiment_sessions;
create policy "experiment_sessions_update_owner_or_participant" on public.experiment_sessions
  for update to authenticated
  using (
    public.is_experiment_owner(experiment_id)
    or public.is_experiment_participant(experiment_id)
  )
  with check (
    public.is_experiment_owner(experiment_id)
    or public.is_experiment_participant(experiment_id)
  );

create or replace function public.restrict_session_updates()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- service_role / direct DB access: trusted tooling.
  if auth.uid() is null then
    return new;
  end if;

  -- System auto-close (close_overdue_sessions): the only change is stamping
  -- ended_at_actual with the planned end, on a session whose planned end has
  -- already passed. Self-validating, so it needs no privileged flag.
  if old.ended_at_actual is null
     and new.ended_at_actual is not distinct from old.ended_at_planned
     and old.ended_at_planned < now()
     and new.observations is not distinct from old.observations
     and new.started_at = old.started_at then
    return new;
  end if;

  -- Historical facts are never rewritable by anyone through the API.
  if new.experiment_id is distinct from old.experiment_id
     or new.started_at is distinct from old.started_at
     or new.created_by is distinct from old.created_by then
    raise exception 'No se puede alterar el registro histórico de la sesión';
  end if;

  if public.is_experiment_owner(new.experiment_id) then
    return new;  -- owner may close the session and write observations
  end if;

  if public.is_experiment_participant(new.experiment_id) then
    if new.ended_at_actual is distinct from old.ended_at_actual
       or new.ended_at_planned is distinct from old.ended_at_planned then
      raise exception 'Los colaboradores solo pueden agregar observaciones';
    end if;
    return new;
  end if;

  raise exception 'No tienes permiso para modificar esta sesión';
end;
$$;

drop trigger if exists trg_restrict_session_updates on public.experiment_sessions;
create trigger trg_restrict_session_updates
before update on public.experiment_sessions
for each row execute function public.restrict_session_updates();

-- 4) Auto-close sessions whose planned end time has passed. This project is a
--    static export with no server or scheduler, so instead of cron the app
--    calls this opportunistically when it loads an experiment. Idempotent, and
--    it stamps the planned end (not now()) because that is when the session
--    actually lapsed — nobody extended it.
create or replace function public.close_overdue_sessions()
returns integer language plpgsql security definer set search_path = public as $$
declare
  closed integer;
begin
  update public.experiment_sessions
  set ended_at_actual = ended_at_planned
  where ended_at_actual is null
    and ended_at_planned < now();
  get diagnostics closed = row_count;
  return closed;
end;
$$;

grant execute on function public.close_overdue_sessions() to authenticated;
