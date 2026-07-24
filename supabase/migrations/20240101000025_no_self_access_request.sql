-- BUG: the owner of an experiment could file an access request to accompany
-- their OWN experiment. experiment_participants_insert_by_user only checked
-- that the row belonged to the caller and that the experiment was in progress,
-- never that the caller wasn't already the owner — so the owner ended up
-- notifying themselves and appearing as a pending request on their own
-- experiment. The UI mostly hid this, but a render race (the experiment loads
-- before auth resolves, leaving isOwner momentarily false) exposed it.
drop policy if exists "experiment_participants_insert_by_user" on public.experiment_participants;

create policy "experiment_participants_insert_by_user" on public.experiment_participants
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and source = 'requested_by_user'
    and status = 'pending'
    -- You cannot ask to accompany an experiment you already run.
    and not public.is_experiment_owner(experiment_id)
    and exists (
      select 1 from public.experiments
      where experiments.id = experiment_participants.experiment_id
      and experiments.status = 'in_progress'
    )
  );
