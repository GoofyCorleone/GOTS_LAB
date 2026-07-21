-- Phase 4: Continue Experiment (multiple sessions)
-- Adds RLS policies and DB-level guards required to reopen, edit, re-session
-- and finish an in-progress experiment safely.

-- ---------------------------------------------------------------------------
-- 1. Allow the experiment OWNER to DELETE its (still active) reserved items.
--    Phase 3 shipped no DELETE policy for experiment_items, so removals were
--    silently blocked by RLS. Only active rows can be removed; returned rows
--    are historical and must stay.
-- ---------------------------------------------------------------------------
create policy "experiment_items_delete_owner" on public.experiment_items
  for delete to authenticated
  using (
    experiment_items.status = 'active'
    and exists (
      select 1 from public.experiments
      where experiments.id = experiment_items.experiment_id
      and experiments.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Guard: only draft / in_progress experiments may receive new items.
--    Defense in depth on top of the JS validation.
-- ---------------------------------------------------------------------------
create or replace function public.check_experiment_editable()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_status text;
begin
  select status into v_status
  from public.experiments
  where id = new.experiment_id;

  if v_status is null then
    raise exception 'Experiment not found';
  end if;

  if v_status not in ('draft', 'in_progress') then
    raise exception 'Cannot modify items of an experiment with status %', v_status;
  end if;

  return new;
end;
$$;

create trigger trg_check_experiment_editable
before insert on public.experiment_items
for each row
execute function public.check_experiment_editable();

-- ---------------------------------------------------------------------------
-- 3. Guard: never allow two open sessions at once. A session is "open" while
--    ended_at_actual is null. Continuing an experiment must always close the
--    running session before opening the next one. Atomic at the DB level.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_overlapping_sessions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.experiment_sessions
    where experiment_id = new.experiment_id
    and ended_at_actual is null
  ) then
    raise exception
      'Cannot open a new session while a previous session is still open (ended_at_actual is null)';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_overlapping_sessions
before insert on public.experiment_sessions
for each row
execute function public.prevent_overlapping_sessions();

-- ---------------------------------------------------------------------------
-- 4. Guard: never allow finishing an experiment while a session is still open.
--    Runs BEFORE the existing (AFTER) free_inventory_on_finish trigger, so a
--    blocked finish never releases inventory.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_finish_with_open_session()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished' and old.status <> 'finished' then
    if exists (
      select 1 from public.experiment_sessions
      where experiment_id = new.id
      and ended_at_actual is null
    ) then
      raise exception
        'Cannot finish experiment: there is at least one open session (ended_at_actual is null)';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_finish_with_open_session
before update of status on public.experiments
for each row
execute function public.prevent_finish_with_open_session();
