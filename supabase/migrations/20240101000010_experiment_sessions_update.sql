-- Phase 4 frontend follow-up: closing a session (stamping ended_at_actual)
-- via updateSessionEndTime() requires an UPDATE policy on experiment_sessions.
-- Migration 003 only shipped SELECT + INSERT policies for this table, so any
-- update was silently blocked by RLS (default deny). Mirrors the ownership
-- rule already used by experiment_sessions_insert_owner.

create policy "experiment_sessions_update_owner" on public.experiment_sessions
  for update to authenticated
  using (
    exists (
      select 1 from public.experiments
      where experiments.id = experiment_sessions.experiment_id
      and experiments.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.experiments
      where experiments.id = experiment_sessions.experiment_id
      and experiments.owner_id = auth.uid()
    )
  );
