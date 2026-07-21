-- Create experiment_items table (inventory reservations)
create table public.experiment_items (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments(id),
  inventory_item_id uuid not null references public.inventory_items(id),
  quantity int not null check (quantity > 0),
  sharing_mode text not null check (sharing_mode in ('individual', 'compartido')),
  status text not null default 'active' check (status in ('active', 'returned')),
  added_by uuid not null references public.profiles(id),
  reserved_at timestamptz not null default now(),
  returned_at timestamptz,
  unique(experiment_id, inventory_item_id)
);

-- Create experiment_item_shares table (fine-grained sharing)
create table public.experiment_item_shares (
  experiment_item_id uuid not null references public.experiment_items(id),
  user_id uuid not null references public.profiles(id),
  added_at timestamptz not null default now(),
  primary key (experiment_item_id, user_id)
);

-- Create indexes
create index idx_experiment_items_experiment_id on public.experiment_items(experiment_id);
create index idx_experiment_items_inventory_item_id on public.experiment_items(inventory_item_id);
create index idx_experiment_items_status on public.experiment_items(status);
create index idx_experiment_item_shares_experiment_item_id on public.experiment_item_shares(experiment_item_id);
create index idx_experiment_item_shares_user_id on public.experiment_item_shares(user_id);

-- Enable RLS
alter table public.experiment_items enable row level security;
alter table public.experiment_item_shares enable row level security;

-- Policies for experiment_items (accessible to experiment owner/participants)
create policy "experiment_items_select" on public.experiment_items
  for select to authenticated
  using (
    exists (
      select 1 from public.experiments
      where experiments.id = experiment_items.experiment_id
      and (experiments.owner_id = auth.uid() or experiments.created_by = auth.uid())
    ) or
    exists (
      select 1 from public.experiment_participants
      where experiment_participants.experiment_id = experiment_items.experiment_id
      and experiment_participants.user_id = auth.uid()
      and experiment_participants.status = 'approved'
    )
  );

create policy "experiment_items_insert" on public.experiment_items
  for insert to authenticated
  with check (
    auth.uid() = added_by and
    (
      exists (
        select 1 from public.experiments
        where experiments.id = experiment_items.experiment_id
        and experiments.owner_id = auth.uid()
      ) or
      exists (
        select 1 from public.experiment_participants
        where experiment_participants.experiment_id = experiment_items.experiment_id
        and experiment_participants.user_id = auth.uid()
        and experiment_participants.status = 'approved'
      )
    )
  );

create policy "experiment_items_update" on public.experiment_items
  for update to authenticated
  using (
    exists (
      select 1 from public.experiments
      where experiments.id = experiment_items.experiment_id
      and (experiments.owner_id = auth.uid() or experiments.created_by = auth.uid())
    ) or
    exists (
      select 1 from public.experiment_participants
      where experiment_participants.experiment_id = experiment_items.experiment_id
      and experiment_participants.user_id = auth.uid()
      and experiment_participants.status = 'approved'
    )
  );

-- Policies for experiment_item_shares
create policy "experiment_item_shares_select" on public.experiment_item_shares
  for select to authenticated
  using (
    exists (
      select 1 from public.experiment_items
      join public.experiments on experiments.id = experiment_items.experiment_id
      where experiment_items.id = experiment_item_shares.experiment_item_id
      and (experiments.owner_id = auth.uid() or experiment_items.added_by = auth.uid())
    )
  );

create policy "experiment_item_shares_insert" on public.experiment_item_shares
  for insert to authenticated
  with check (
    exists (
      select 1 from public.experiment_items
      join public.experiments on experiments.id = experiment_items.experiment_id
      where experiment_items.id = experiment_item_shares.experiment_item_id
      and (experiments.owner_id = auth.uid() or experiment_items.added_by = auth.uid())
    )
  );

create policy "experiment_item_shares_delete" on public.experiment_item_shares
  for delete to authenticated
  using (
    exists (
      select 1 from public.experiment_items
      join public.experiments on experiments.id = experiment_items.experiment_id
      where experiment_items.id = experiment_item_shares.experiment_item_id
      and (experiments.owner_id = auth.uid() or experiment_items.added_by = auth.uid())
    )
  );
