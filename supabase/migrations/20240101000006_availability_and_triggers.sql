-- Create availability function (SECURITY DEFINER to bypass RLS)
create or replace function public.get_inventory_availability()
returns table(inventory_item_id uuid, quantity_total int, quantity_reserved int, quantity_available int)
language sql security definer set search_path = public as $$
  select
    i.id,
    i.quantity_total,
    coalesce(sum(ei.quantity) filter (
      where ei.status = 'active' and e.status in ('draft', 'in_progress')
    ), 0)::int as quantity_reserved,
    i.quantity_total - coalesce(sum(ei.quantity) filter (
      where ei.status = 'active' and e.status in ('draft', 'in_progress')
    ), 0)::int as quantity_available
  from public.inventory_items i
  left join public.experiment_items ei on ei.inventory_item_id = i.id
  left join public.experiments e on e.id = ei.experiment_id
  group by i.id, i.quantity_total;
$$;

-- Create trigger to enforce inventory reservation limits
create or replace function public.check_inventory_availability()
returns trigger language plpgsql security definer as $$
declare
  v_quantity_total int;
  v_quantity_reserved int;
  v_new_total int;
begin
  -- Lock the inventory item row to prevent race conditions
  select quantity_total into v_quantity_total
  from public.inventory_items
  where id = new.inventory_item_id
  for update;

  if v_quantity_total is null then
    raise exception 'Inventory item not found';
  end if;

  -- Calculate current reservation (excluding this row if updating)
  select coalesce(sum(quantity) filter (
    where status = 'active' and experiment_id != new.experiment_id
  ), 0)
  into v_quantity_reserved
  from public.experiment_items
  where inventory_item_id = new.inventory_item_id
  and status = 'active';

  v_new_total := v_quantity_reserved + new.quantity;

  if v_new_total > v_quantity_total then
    raise exception 'Insufficient inventory. Available: %, Requested: %',
      (v_quantity_total - v_quantity_reserved), new.quantity;
  end if;

  return new;
end;
$$;

create trigger trg_check_inventory_availability
before insert or update on public.experiment_items
for each row
execute function public.check_inventory_availability();

-- Create trigger to free inventory when experiment finishes
create or replace function public.free_inventory_on_finish()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'finished' and old.status != 'finished' then
    update public.experiment_items
    set status = 'returned', returned_at = now()
    where experiment_id = new.id and status = 'active';
  end if;
  return new;
end;
$$;

create trigger trg_free_inventory_on_finish
after update of status on public.experiments
for each row
execute function public.free_inventory_on_finish();
