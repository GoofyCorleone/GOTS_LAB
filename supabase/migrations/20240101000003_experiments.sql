-- Create experiments table
create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  owner_id uuid not null references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'finished', 'cancelled')),
  fecha_inicio date,
  fecha_fin_tentativa date,
  fecha_fin_real timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create experiment_sessions table
create table public.experiment_sessions (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments(id),
  started_at timestamptz not null,
  ended_at_planned timestamptz not null,
  ended_at_actual timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Create experiment_participants table
create table public.experiment_participants (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments(id),
  user_id uuid not null references public.profiles(id),
  status text not null check (status in ('pending', 'approved', 'rejected')),
  source text not null check (source in ('invited_by_owner', 'requested_by_user')),
  requested_at timestamptz not null default now(),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  unique(experiment_id, user_id)
);

-- Create indexes
create index idx_experiments_owner_id on public.experiments(owner_id);
create index idx_experiments_created_by on public.experiments(created_by);
create index idx_experiments_status on public.experiments(status);
create index idx_experiment_sessions_experiment_id on public.experiment_sessions(experiment_id);
create index idx_experiment_participants_experiment_id on public.experiment_participants(experiment_id);
create index idx_experiment_participants_user_id on public.experiment_participants(user_id);

-- Enable RLS
alter table public.experiments enable row level security;
alter table public.experiment_sessions enable row level security;
alter table public.experiment_participants enable row level security;

-- Policies for experiments
create policy "experiments_select_own" on public.experiments
  for select to authenticated
  using (auth.uid() = owner_id or auth.uid() = created_by);

create policy "experiments_select_in_progress" on public.experiments
  for select to authenticated
  using (status = 'in_progress');

create policy "experiments_select_if_participant" on public.experiments
  for select to authenticated
  using (
    exists (
      select 1 from public.experiment_participants
      where experiment_participants.experiment_id = experiments.id
      and experiment_participants.user_id = auth.uid()
      and experiment_participants.status = 'approved'
    )
  );

create policy "experiments_insert" on public.experiments
  for insert to authenticated
  with check (auth.uid() = created_by);

create policy "experiments_update_own" on public.experiments
  for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Policies for experiment_sessions
create policy "experiment_sessions_select_participant" on public.experiment_sessions
  for select to authenticated
  using (
    exists (
      select 1 from public.experiments
      where experiments.id = experiment_sessions.experiment_id
      and (experiments.owner_id = auth.uid() or experiments.created_by = auth.uid())
    ) or
    exists (
      select 1 from public.experiment_participants
      where experiment_participants.experiment_id = experiment_sessions.experiment_id
      and experiment_participants.user_id = auth.uid()
      and experiment_participants.status = 'approved'
    )
  );

create policy "experiment_sessions_insert_owner" on public.experiment_sessions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.experiments
      where experiments.id = experiment_sessions.experiment_id
      and experiments.owner_id = auth.uid()
    )
  );

-- Policies for experiment_participants
create policy "experiment_participants_select_own" on public.experiment_participants
  for select to authenticated
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.experiments
      where experiments.id = experiment_participants.experiment_id
      and experiments.owner_id = auth.uid()
    )
  );

create policy "experiment_participants_insert_by_user" on public.experiment_participants
  for insert to authenticated
  with check (
    auth.uid() = user_id and
    source = 'requested_by_user' and
    status = 'pending' and
    exists (
      select 1 from public.experiments
      where experiments.id = experiment_participants.experiment_id
      and experiments.status = 'in_progress'
    )
  );

create policy "experiment_participants_insert_by_owner" on public.experiment_participants
  for insert to authenticated
  with check (
    source = 'invited_by_owner' and
    status = 'approved' and
    exists (
      select 1 from public.experiments
      where experiments.id = experiment_participants.experiment_id
      and experiments.owner_id = auth.uid()
    )
  );

create policy "experiment_participants_update_owner" on public.experiment_participants
  for update to authenticated
  using (
    exists (
      select 1 from public.experiments
      where experiments.id = experiment_participants.experiment_id
      and experiments.owner_id = auth.uid()
    ) and
    source = 'requested_by_user'
  )
  with check (
    exists (
      select 1 from public.experiments
      where experiments.id = experiment_participants.experiment_id
      and experiments.owner_id = auth.uid()
    )
  );

create policy "experiment_participants_delete_own" on public.experiment_participants
  for delete to authenticated
  using (auth.uid() = user_id and status = 'pending');
