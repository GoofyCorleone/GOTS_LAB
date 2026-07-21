-- Fix: infinite recursion in RLS policies for "experiments" and related tables.
--
-- Root cause: experiments_select_if_participant (on experiments) subqueries
-- experiment_participants, while experiment_participants_select_own (on
-- experiment_participants) subqueries experiments back. Postgres evaluates
-- RLS on every table touched by a subquery, so any SELECT against either
-- table re-entered the other table's policy set forever
-- ("infinite recursion detected in policy for relation experiments").
-- The same owner/participant subquery pattern was duplicated across
-- experiment_sessions and experiment_items, which are equally exposed
-- once experiments' RLS is entered.
--
-- Fix: move the cross-table checks into SECURITY DEFINER functions. Being
-- SECURITY DEFINER (owned by the migration role, which owns these tables),
-- the internal SELECTs bypass RLS entirely instead of re-entering it, which
-- breaks the cycle in both directions.

create or replace function public.is_experiment_owner(p_experiment_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.experiments
    where experiments.id = p_experiment_id
    and experiments.owner_id = auth.uid()
  );
$$;

create or replace function public.is_experiment_owner_or_creator(p_experiment_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.experiments
    where experiments.id = p_experiment_id
    and (experiments.owner_id = auth.uid() or experiments.created_by = auth.uid())
  );
$$;

create or replace function public.is_experiment_participant(p_experiment_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.experiment_participants
    where experiment_participants.experiment_id = p_experiment_id
    and experiment_participants.user_id = auth.uid()
    and experiment_participants.status = 'approved'
  );
$$;

grant execute on function public.is_experiment_owner(uuid) to authenticated;
grant execute on function public.is_experiment_owner_or_creator(uuid) to authenticated;
grant execute on function public.is_experiment_participant(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- experiments
-- ---------------------------------------------------------------------------
drop policy if exists "experiments_select_if_participant" on public.experiments;
create policy "experiments_select_if_participant" on public.experiments
  for select to authenticated
  using (public.is_experiment_participant(id));

-- ---------------------------------------------------------------------------
-- experiment_participants
-- ---------------------------------------------------------------------------
drop policy if exists "experiment_participants_select_own" on public.experiment_participants;
create policy "experiment_participants_select_own" on public.experiment_participants
  for select to authenticated
  using (
    auth.uid() = user_id or
    public.is_experiment_owner(experiment_id)
  );

drop policy if exists "experiment_participants_insert_by_owner" on public.experiment_participants;
create policy "experiment_participants_insert_by_owner" on public.experiment_participants
  for insert to authenticated
  with check (
    source = 'invited_by_owner' and
    status = 'approved' and
    public.is_experiment_owner(experiment_id)
  );

drop policy if exists "experiment_participants_update_owner" on public.experiment_participants;
create policy "experiment_participants_update_owner" on public.experiment_participants
  for update to authenticated
  using (
    public.is_experiment_owner(experiment_id) and
    source = 'requested_by_user'
  )
  with check (
    public.is_experiment_owner(experiment_id)
  );

-- experiment_participants_insert_by_user is left untouched: it only
-- subqueries experiments.status = 'in_progress' (no ownership/participant
-- check), which does not participate in the recursive cycle.

-- ---------------------------------------------------------------------------
-- experiment_sessions
-- ---------------------------------------------------------------------------
drop policy if exists "experiment_sessions_select_participant" on public.experiment_sessions;
create policy "experiment_sessions_select_participant" on public.experiment_sessions
  for select to authenticated
  using (
    public.is_experiment_owner_or_creator(experiment_id) or
    public.is_experiment_participant(experiment_id)
  );

drop policy if exists "experiment_sessions_insert_owner" on public.experiment_sessions;
create policy "experiment_sessions_insert_owner" on public.experiment_sessions
  for insert to authenticated
  with check (public.is_experiment_owner(experiment_id));

drop policy if exists "experiment_sessions_update_owner" on public.experiment_sessions;
create policy "experiment_sessions_update_owner" on public.experiment_sessions
  for update to authenticated
  using (public.is_experiment_owner(experiment_id))
  with check (public.is_experiment_owner(experiment_id));

-- ---------------------------------------------------------------------------
-- experiment_items
-- ---------------------------------------------------------------------------
drop policy if exists "experiment_items_select" on public.experiment_items;
create policy "experiment_items_select" on public.experiment_items
  for select to authenticated
  using (
    public.is_experiment_owner_or_creator(experiment_id) or
    public.is_experiment_participant(experiment_id)
  );

drop policy if exists "experiment_items_insert" on public.experiment_items;
create policy "experiment_items_insert" on public.experiment_items
  for insert to authenticated
  with check (
    auth.uid() = added_by and
    (
      public.is_experiment_owner(experiment_id) or
      public.is_experiment_participant(experiment_id)
    )
  );

drop policy if exists "experiment_items_update" on public.experiment_items;
create policy "experiment_items_update" on public.experiment_items
  for update to authenticated
  using (
    public.is_experiment_owner_or_creator(experiment_id) or
    public.is_experiment_participant(experiment_id)
  );

drop policy if exists "experiment_items_delete_owner" on public.experiment_items;
create policy "experiment_items_delete_owner" on public.experiment_items
  for delete to authenticated
  using (
    experiment_items.status = 'active'
    and public.is_experiment_owner(experiment_id)
  );
