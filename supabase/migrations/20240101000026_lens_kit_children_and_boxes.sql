-- Two additive columns on inventory_items:
--
-- kit_parent_id: lets a lens kit (e.g. Thorlabs LSC01-A / LSB04-A, today a
-- single reservable row) be broken into individually reservable child rows
-- ("lentes sueltas del kit") without a parallel schema — each child is a
-- normal inventory_items row (quantity_total=1) so it reuses the existing
-- availability function and the FOR UPDATE booking trigger with zero new
-- concurrency logic. Children are excluded from the normal browse/search
-- queries at the application layer and only reachable through their parent.
--
-- box_label: records the physical "Caja #N de <categoría>" grouping already
-- present as manual divider rows in the inventory spreadsheet (Armario #2),
-- so the UI can offer a box-level sub-navigation for Lentes/Espejos/
-- Retardadores/Divisores de haz instead of one flat list per category.
alter table public.inventory_items
  add column kit_parent_id uuid references public.inventory_items(id),
  add column box_label text;

create index idx_inventory_items_kit_parent on public.inventory_items(kit_parent_id);
create index idx_inventory_items_box_label on public.inventory_items(box_label);
