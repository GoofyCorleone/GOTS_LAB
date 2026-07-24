-- Makes experiments discoverable by every registered (authenticated) user,
-- not just the owner/approved participants — per explicit product decision:
-- any lab member can see any experiment's photo, title, owner, collaborators,
-- status/stage, description, and equipment in use. Requesting to actually
-- join (experiment_participants_insert_by_user, still gated to
-- status='in_progress') and editing (still owner/participant-only) are
-- untouched by this migration.

alter table public.experiments
  add column photo_url text,
  add column stage text check (stage in ('montaje', 'toma_datos'));

-- ---------------------------------------------------------------------------
-- Storage bucket for experiment photos (separate from inventory-images for
-- clarity — different content, different lifecycle/ownership).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('experiment-photos', 'experiment-photos', true)
on conflict (id) do nothing;

create policy "experiment_photos_select" on storage.objects
  for select to public
  using (bucket_id = 'experiment-photos');

create policy "experiment_photos_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'experiment-photos');

create policy "experiment_photos_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'experiment-photos' and auth.uid() = owner);

create policy "experiment_photos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'experiment-photos' and auth.uid() = owner);

-- ---------------------------------------------------------------------------
-- experiments: replace the 3 narrow SELECT policies (own / in_progress /
-- approved participant) with one broad "any authenticated user" policy.
-- ---------------------------------------------------------------------------
drop policy if exists "experiments_select_own" on public.experiments;
drop policy if exists "experiments_select_in_progress" on public.experiments;
drop policy if exists "experiments_select_if_participant" on public.experiments;

create policy "experiments_select_all_authenticated" on public.experiments
  for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- experiment_items: same broadening — anyone can see what equipment an
-- experiment has reserved (public accountability), but INSERT/UPDATE/DELETE
-- stay restricted to owner + approved participants.
-- ---------------------------------------------------------------------------
drop policy if exists "experiment_items_select" on public.experiment_items;

create policy "experiment_items_select_all_authenticated" on public.experiment_items
  for select to authenticated
  using (true);

-- experiment_items_delete_owner was owner-only; approved participants should
-- be able to remove items too (same permission level they already have for
-- inserting/updating, per experiment_items_insert / experiment_items_update).
drop policy if exists "experiment_items_delete_owner" on public.experiment_items;

create policy "experiment_items_delete_owner_or_participant" on public.experiment_items
  for delete to authenticated
  using (
    experiment_items.status = 'active'
    and (
      public.is_experiment_owner(experiment_id)
      or public.is_experiment_participant(experiment_id)
    )
  );

-- ---------------------------------------------------------------------------
-- experiment_participants: expose *approved* collaborators publicly (needed
-- to show "quién está colaborando" on any experiment), without exposing
-- pending/rejected requests to anyone but the owner or the requester
-- themselves (already covered by the existing experiment_participants_select_own).
-- ---------------------------------------------------------------------------
create policy "experiment_participants_select_public_approved" on public.experiment_participants
  for select to authenticated
  using (status = 'approved');
