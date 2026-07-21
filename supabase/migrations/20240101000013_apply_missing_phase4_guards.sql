-- Migration 0009 (phase4_continue.sql) was never actually applied to the
-- remote database, even though it was present in the repo and the CLI's
-- migration history table had been (incorrectly) marked as applied.
-- A schema audit via a temporary debug function confirmed these three
-- guards were missing entirely. experiment_items_delete_owner (also part
-- of 0009) already exists because migration 0011 recreated it, so it is
-- intentionally not repeated here.

-- Guard: only draft / in_progress experiments may receive new items.
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

drop trigger if exists trg_check_experiment_editable on public.experiment_items;
create trigger trg_check_experiment_editable
before insert on public.experiment_items
for each row
execute function public.check_experiment_editable();

-- Guard: never allow two open sessions at once.
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

drop trigger if exists trg_prevent_overlapping_sessions on public.experiment_sessions;
create trigger trg_prevent_overlapping_sessions
before insert on public.experiment_sessions
for each row
execute function public.prevent_overlapping_sessions();

-- Guard: never allow finishing an experiment while a session is still open.
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

drop trigger if exists trg_prevent_finish_with_open_session on public.experiments;
create trigger trg_prevent_finish_with_open_session
before update of status on public.experiments
for each row
execute function public.prevent_finish_with_open_session();
