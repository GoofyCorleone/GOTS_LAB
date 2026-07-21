-- Create experiment_legal_acceptance table (immutable audit record)
create table public.experiment_legal_acceptance (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null unique references public.experiments(id),
  accepted_by uuid not null references public.profiles(id),
  accepted_at timestamptz not null default now(),
  policy_version text not null default '1.0',
  ip_address inet,
  user_agent text
);

-- Create index
create index idx_experiment_legal_acceptance_experiment_id on public.experiment_legal_acceptance(experiment_id);

-- Enable RLS
alter table public.experiment_legal_acceptance enable row level security;

-- Immutable policy: SELECT only
create policy "legal_acceptance_select" on public.experiment_legal_acceptance
  for select to authenticated
  using (
    exists (
      select 1 from public.experiments
      where experiments.id = experiment_legal_acceptance.experiment_id
      and (experiments.owner_id = auth.uid() or experiments.created_by = auth.uid())
    ) or
    exists (
      select 1 from public.experiment_participants
      where experiment_participants.experiment_id = experiment_legal_acceptance.experiment_id
      and experiment_participants.user_id = auth.uid()
      and experiment_participants.status = 'approved'
    )
  );

create policy "legal_acceptance_insert" on public.experiment_legal_acceptance
  for insert to authenticated
  with check (
    auth.uid() = accepted_by and
    exists (
      select 1 from public.experiments
      where experiments.id = experiment_legal_acceptance.experiment_id
      and experiments.owner_id = auth.uid()
    )
  );

-- Explicitly deny UPDATE and DELETE at RLS level
create policy "legal_acceptance_deny_update" on public.experiment_legal_acceptance
  for update
  using (false);

create policy "legal_acceptance_deny_delete" on public.experiment_legal_acceptance
  for delete
  using (false);

-- Additional SQL-level protection: REVOKE UPDATE and DELETE
revoke update, delete on public.experiment_legal_acceptance from authenticated;

-- Create trigger to enforce legal acceptance before status change
create or replace function public.enforce_legal_acceptance()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'in_progress' and old.status = 'draft' then
    if not exists (
      select 1 from public.experiment_legal_acceptance
      where experiment_id = new.id
    ) then
      raise exception 'Legal acceptance must be signed before starting experiment';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_legal_acceptance
before update of status on public.experiments
for each row
execute function public.enforce_legal_acceptance();
