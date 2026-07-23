-- Adds a free-text category to inventory_items (e.g. "Opto mecánica",
-- "Lentes", "Muestras") sourced from the updated inventory spreadsheet, to
-- support browsing by category alongside the existing by-location browsing.
alter table public.inventory_items
  add column category text;

create index idx_inventory_items_category on public.inventory_items(category);

-- Updates the allowed profiles.member_status values to match the roles the
-- registration form now collects, and makes it mandatory (previously
-- nullable). Replaces ('semillero','grupo_investigacion','tesista','profesor')
-- with ('semillero','grupo','tesista','pasante','profesor').
alter table public.profiles
  drop constraint profiles_member_status_check;

alter table public.profiles
  alter column member_status set not null;

alter table public.profiles
  add constraint profiles_member_status_check check (
    member_status in ('semillero', 'grupo', 'tesista', 'pasante', 'profesor')
  );
