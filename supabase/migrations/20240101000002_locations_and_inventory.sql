-- Create locations table (cajones/armarios)
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('cajon', 'armario')),
  number int not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique(type, number)
);

-- Create inventory_items table
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id),
  reference text,
  name text not null,
  description text,
  quantity_total int not null check (quantity_total >= 0),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes
create index idx_inventory_items_location_id on public.inventory_items(location_id);

-- Enable pg_trgm extension for full-text search
create extension if not exists pg_trgm;

-- Create GIN index for search on name and reference
create index idx_inventory_items_search on public.inventory_items
  using gin ((name || ' ' || coalesce(reference, '')) gin_trgm_ops);

-- Enable RLS
alter table public.locations enable row level security;
alter table public.inventory_items enable row level security;

-- Policies for locations (read-only for authenticated)
create policy "locations_select_authenticated" on public.locations
  for select to authenticated
  using (true);

-- Policies for inventory_items (read-only for authenticated)
create policy "inventory_items_select_authenticated" on public.inventory_items
  for select to authenticated
  using (true);

-- Function to update image_url (only this field can be updated by authenticated users)
create or replace function public.set_item_image(item_id uuid, image_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.inventory_items
  set image_url = image_url, updated_at = now()
  where id = item_id;
end;
$$;

-- Policy for calling the image update function
create policy "inventory_items_set_image" on public.inventory_items
  for update to authenticated
  using (false) -- Direct updates not allowed
  with check (false);
