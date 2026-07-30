-- Links physical locations (drawers/cabinets) to the professor whose lab
-- owns them, plus the building they're in, so every inventory item can show
-- "Inventario a cargo de: <profesor>" and a full location (drawer/cabinet +
-- building) instead of just the drawer/cabinet label. Today every location
-- belongs to Rafael Torres's lab (EDIC 001) — the only professor with real
-- inventory so far.
alter table public.locations
  add column professor_id uuid references public.group_professors(id),
  add column building text;

update public.locations
set professor_id = (
      select id from public.group_professors
      where full_name = 'Rafael Ángel Torres Amaris'
    ),
    building = 'EDIC 001';

-- Mandatory experiment category, fixed list agreed with the lab. Existing
-- experiments are backfilled from a keyword match against their title;
-- anything that doesn't match anything gets a reasonable default rather than
-- being left uncategorized, since the column becomes NOT NULL below.
alter table public.experiments
  add column category text;

update public.experiments
set category = case
  when title ilike '%polariza%' then 'Polarización'
  when title ilike '%interfer%' then 'Interferencia'
  when title ilike '%no lineal%' or title ilike '%no-lineal%' then 'Óptica no lineal'
  when title ilike '%cuántic%' or title ilike '%cuantic%' then 'Óptica cuántica'
  when title ilike '%birrefring%' then 'Birrefringencia'
  when title ilike '%difracc%' or title ilike '%rejilla%' then 'Difracción'
  when title ilike '%imagen%' or title ilike '%imágenes%' then 'Formación de imágenes'
  when title ilike '%geométric%' or title ilike '%geometric%'
    or title ilike '%refracc%' or title ilike '%reflex%' or title ilike '%lente%'
    or title ilike '%espejo%' then 'Óptica geométrica'
  else 'Óptica geométrica'
end
where category is null;

alter table public.experiments
  alter column category set not null;

alter table public.experiments
  add constraint experiments_category_check check (category in (
    'Polarización',
    'Interferencia',
    'Óptica no lineal',
    'Óptica cuántica',
    'Birrefringencia',
    'Óptica geométrica',
    'Difracción',
    'Formación de imágenes'
  ));

create index idx_experiments_category on public.experiments(category);
