-- ============================================================================
-- Módulo de Préstamos: profesores del grupo prestan equipo a estudiantes o
-- profesores (UIS o externos). Requiere una segunda clase de cuenta ("externo")
-- que hoy el trigger enforce_uis_email_domain rechaza sin excepción — se
-- relaja ese trigger para permitirla SOLO cuando el registro viene marcado
-- explícitamente como tal (raw_user_meta_data->>'account_type' =
-- 'external_requester'), nunca por defecto.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles: access_scope + institution
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column access_scope text not null default 'uis' check (access_scope in ('uis', 'external')),
  add column institution text;

-- ---------------------------------------------------------------------------
-- 2. Dominio: permitir correo no-UIS únicamente para cuentas marcadas
--    explícitamente como externas al momento del registro.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_uis_email_domain()
returns trigger language plpgsql security definer as $$
begin
  if new.email !~* '^[^@]+@(correo\.)?uis\.edu\.co$'
     and coalesce(new.raw_user_meta_data->>'account_type', '') <> 'external_requester' then
    raise exception 'Solo se permite registro con correo institucional @correo.uis.edu.co o @uis.edu.co';
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, first_name, last_name, access_scope, institution)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    case when new.raw_user_meta_data->>'account_type' = 'external_requester' then 'external' else 'uis' end,
    new.raw_user_meta_data->>'institution'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Excluir cuentas externas de experimentos/inventario de experimentos,
--    tanto en lectura como en creación — capa RLS además de la de UI/nav.
-- ---------------------------------------------------------------------------
drop policy if exists "experiments_select_all_authenticated" on public.experiments;
create policy "experiments_select_all_authenticated" on public.experiments
  for select to authenticated
  using (
    not exists (select 1 from public.profiles where id = auth.uid() and access_scope = 'external')
  );

drop policy if exists "experiments_insert" on public.experiments;
create policy "experiments_insert" on public.experiments
  for insert to authenticated
  with check (
    auth.uid() = created_by
    and not exists (select 1 from public.profiles where id = auth.uid() and access_scope = 'external')
  );

drop policy if exists "experiment_items_select_all_authenticated" on public.experiment_items;
create policy "experiment_items_select_all_authenticated" on public.experiment_items
  for select to authenticated
  using (
    not exists (select 1 from public.profiles where id = auth.uid() and access_scope = 'external')
  );

drop policy if exists "experiment_participants_select_public_approved" on public.experiment_participants;
create policy "experiment_participants_select_public_approved" on public.experiment_participants
  for select to authenticated
  using (
    status = 'approved'
    and not exists (select 1 from public.profiles where id = auth.uid() and access_scope = 'external')
  );

-- ---------------------------------------------------------------------------
-- 4. group_professors: los 6 profesores del grupo. profile_id se vincula
--    después (service-role) cuando cada uno registre su cuenta UIS real.
--    Por ahora solo Rafael Torres queda activo (el inventario existente ya es
--    el suyo — el Excel de origen lleva su nombre).
-- ---------------------------------------------------------------------------
create table public.group_professors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  image_url text,
  profile_id uuid references public.profiles(id),
  is_active boolean not null default false,
  display_order int not null,
  created_at timestamptz not null default now()
);

alter table public.group_professors enable row level security;

create policy "group_professors_select_all" on public.group_professors
  for select to authenticated
  using (true);

insert into public.group_professors (full_name, is_active, display_order) values
  ('Rafael Ángel Torres Amaris', true, 1),
  ('Zandra Yoana Lizarazo Mejía', false, 2),
  ('Yezid Torres Moreno', false, 3),
  ('Jaime Enrique Meneses Fonseca', false, 4),
  ('Jader Enrique Guerrero Bermúdez', false, 5),
  ('Arturo Plata Gómez', false, 6);

-- ---------------------------------------------------------------------------
-- 5. loan_requests / loan_request_items / loan_legal_acceptance
-- ---------------------------------------------------------------------------
create table public.loan_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id),
  professor_id uuid not null references public.group_professors(id),
  purpose_description text not null check (char_length(trim(purpose_description)) between 10 and 3000),
  usage_start timestamptz not null,
  usage_end timestamptz not null check (usage_end > usage_start),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'overdue', 'returned', 'lost_stolen')),
  requested_new_usage_end timestamptz,
  rejection_reason text,
  decided_at timestamptz,
  decided_by uuid references public.profiles(id),
  returned_at timestamptz,
  marked_lost_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_loan_requests_requester_id on public.loan_requests(requester_id);
create index idx_loan_requests_professor_id on public.loan_requests(professor_id);
create index idx_loan_requests_status on public.loan_requests(status);

create table public.loan_request_items (
  id uuid primary key default gen_random_uuid(),
  loan_request_id uuid not null references public.loan_requests(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id),
  quantity int not null check (quantity > 0)
);

create index idx_loan_request_items_loan_request_id on public.loan_request_items(loan_request_id);
create index idx_loan_request_items_inventory_item_id on public.loan_request_items(inventory_item_id);

create table public.loan_legal_acceptance (
  id uuid primary key default gen_random_uuid(),
  loan_request_id uuid not null unique references public.loan_requests(id),
  accepted_by uuid not null references public.profiles(id),
  accepted_at timestamptz not null default now(),
  policy_version text not null default '1.0',
  ip_address inet,
  user_agent text
);

create index idx_loan_legal_acceptance_loan_request_id on public.loan_legal_acceptance(loan_request_id);

alter table public.loan_requests enable row level security;
alter table public.loan_request_items enable row level security;
alter table public.loan_legal_acceptance enable row level security;

-- loan_requests: públicos para cuentas UIS (igual que experimentos); las
-- externas solo ven sus propias solicitudes.
create policy "loan_requests_select" on public.loan_requests
  for select to authenticated
  using (
    requester_id = auth.uid()
    or exists (
      select 1 from public.group_professors gp
      where gp.id = professor_id and gp.profile_id = auth.uid()
    )
    or not exists (
      select 1 from public.profiles where id = auth.uid() and access_scope = 'external'
    )
  );

create policy "loan_requests_insert_own" on public.loan_requests
  for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');

create policy "loan_requests_update_professor_or_requester" on public.loan_requests
  for update to authenticated
  using (
    requester_id = auth.uid()
    or exists (
      select 1 from public.group_professors gp
      where gp.id = professor_id and gp.profile_id = auth.uid()
    )
  )
  with check (
    requester_id = auth.uid()
    or exists (
      select 1 from public.group_professors gp
      where gp.id = professor_id and gp.profile_id = auth.uid()
    )
  );

-- Solo para permitir el rollback de una solicitud fallida a medio crear,
-- antes de que exista su aceptación legal (ver loans.ts: legal_acceptance se
-- inserta siempre al final).
create policy "loan_requests_delete_own_pending" on public.loan_requests
  for delete to authenticated
  using (requester_id = auth.uid() and status = 'pending');

create policy "loan_request_items_select" on public.loan_request_items
  for select to authenticated
  using (
    exists (
      select 1 from public.loan_requests lr
      where lr.id = loan_request_id
        and (
          lr.requester_id = auth.uid()
          or exists (select 1 from public.group_professors gp where gp.id = lr.professor_id and gp.profile_id = auth.uid())
          or not exists (select 1 from public.profiles where id = auth.uid() and access_scope = 'external')
        )
    )
  );

create policy "loan_request_items_insert" on public.loan_request_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.loan_requests lr
      where lr.id = loan_request_id and lr.requester_id = auth.uid() and lr.status = 'pending'
    )
  );

create policy "loan_request_items_delete_own_pending" on public.loan_request_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.loan_requests lr
      where lr.id = loan_request_id and lr.requester_id = auth.uid() and lr.status = 'pending'
    )
  );

-- loan_legal_acceptance: mismo patrón inmutable que experiment_legal_acceptance.
create policy "loan_legal_acceptance_select" on public.loan_legal_acceptance
  for select to authenticated
  using (
    exists (
      select 1 from public.loan_requests lr
      where lr.id = loan_request_id
        and (
          lr.requester_id = auth.uid()
          or exists (select 1 from public.group_professors gp where gp.id = lr.professor_id and gp.profile_id = auth.uid())
        )
    )
  );

create policy "loan_legal_acceptance_insert" on public.loan_legal_acceptance
  for insert to authenticated
  with check (
    accepted_by = auth.uid()
    and exists (
      select 1 from public.loan_requests lr
      where lr.id = loan_request_id and lr.requester_id = auth.uid()
    )
  );

create policy "loan_legal_acceptance_deny_update" on public.loan_legal_acceptance
  for update using (false);

create policy "loan_legal_acceptance_deny_delete" on public.loan_legal_acceptance
  for delete using (false);

revoke update, delete on public.loan_legal_acceptance from authenticated;

-- ---------------------------------------------------------------------------
-- 6. Máquina de estados: transición de status validada en el servidor,
--    independiente de RLS (que solo controla QUIÉN puede tocar la fila).
-- ---------------------------------------------------------------------------
create or replace function public.enforce_loan_status_transition()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_is_lending_professor boolean;
begin
  if new.requester_id is distinct from old.requester_id
     or new.professor_id is distinct from old.professor_id then
    raise exception 'No se puede reasignar un préstamo a otro solicitante o profesor';
  end if;

  select exists (
    select 1 from public.group_professors gp
    where gp.id = new.professor_id and gp.profile_id = auth.uid()
  ) into v_is_lending_professor;

  if new.status is distinct from old.status then
    if old.status = 'pending' and new.status in ('approved', 'rejected') then
      if not v_is_lending_professor then
        raise exception 'Solo el profesor puede aceptar o rechazar la solicitud';
      end if;
    elsif old.status = 'approved' and new.status = 'overdue' then
      if old.usage_end >= now() then
        raise exception 'El préstamo aún no está vencido';
      end if;
    elsif old.status = 'overdue' and new.status = 'lost_stolen' then
      if now() <= old.usage_end + interval '3 days' then
        raise exception 'Aún no ha pasado el plazo de gracia de 3 días';
      end if;
    elsif old.status in ('approved', 'overdue') and new.status = 'returned' then
      if auth.uid() is distinct from old.requester_id then
        raise exception 'Solo el solicitante puede marcar el préstamo como devuelto';
      end if;
    else
      raise exception 'Transición de estado no permitida: % -> %', old.status, new.status;
    end if;
  end if;

  if new.requested_new_usage_end is distinct from old.requested_new_usage_end
     and new.requested_new_usage_end is not null then
    if auth.uid() is distinct from old.requester_id then
      raise exception 'Solo el solicitante puede pedir una extensión';
    end if;
    if old.status not in ('approved', 'overdue') then
      raise exception 'Solo se puede pedir extensión de un préstamo aprobado o vencido';
    end if;
  end if;

  if old.requested_new_usage_end is not null and new.requested_new_usage_end is null then
    if not v_is_lending_professor then
      raise exception 'Solo el profesor resuelve una solicitud de extensión';
    end if;
    if new.usage_end = old.requested_new_usage_end then
      if new.status <> 'approved' then
        raise exception 'Al aprobar una extensión el préstamo debe quedar en estado aprobado';
      end if;
    elsif new.usage_end <> old.usage_end then
      raise exception 'Cambio de fecha no válido al resolver la extensión';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_loan_status_transition
before update on public.loan_requests
for each row
execute function public.enforce_loan_status_transition();

-- ---------------------------------------------------------------------------
-- 7. Disponibilidad compartida experimentos <-> préstamos, para que ningún
--    sistema sobre-reserve stock ya comprometido por el otro.
-- ---------------------------------------------------------------------------
create or replace function public.get_inventory_availability()
returns table(inventory_item_id uuid, quantity_total int, quantity_reserved int, quantity_available int)
language sql security definer set search_path = public as $$
  select
    i.id,
    i.quantity_total,
    (
      coalesce(sum(ei.quantity) filter (
        where ei.status = 'active' and e.status in ('draft', 'in_progress')
      ), 0)
      + coalesce((
          select sum(lri.quantity)
          from public.loan_request_items lri
          join public.loan_requests lr on lr.id = lri.loan_request_id
          where lri.inventory_item_id = i.id
            and lr.status in ('pending', 'approved', 'overdue', 'lost_stolen')
        ), 0)
    )::int as quantity_reserved,
    i.quantity_total - (
      coalesce(sum(ei.quantity) filter (
        where ei.status = 'active' and e.status in ('draft', 'in_progress')
      ), 0)
      + coalesce((
          select sum(lri.quantity)
          from public.loan_request_items lri
          join public.loan_requests lr on lr.id = lri.loan_request_id
          where lri.inventory_item_id = i.id
            and lr.status in ('pending', 'approved', 'overdue', 'lost_stolen')
        ), 0)
    )::int as quantity_available
  from public.inventory_items i
  left join public.experiment_items ei on ei.inventory_item_id = i.id
  left join public.experiments e on e.id = ei.experiment_id
  group by i.id, i.quantity_total;
$$;

create or replace function public.check_inventory_availability()
returns trigger language plpgsql security definer as $$
declare
  v_quantity_total int;
  v_quantity_reserved int;
  v_loan_reserved int;
  v_new_total int;
begin
  select quantity_total into v_quantity_total
  from public.inventory_items
  where id = new.inventory_item_id
  for update;

  if v_quantity_total is null then
    raise exception 'Inventory item not found';
  end if;

  select coalesce(sum(quantity) filter (
    where status = 'active' and experiment_id != new.experiment_id
  ), 0)
  into v_quantity_reserved
  from public.experiment_items
  where inventory_item_id = new.inventory_item_id
  and status = 'active';

  select coalesce(sum(lri.quantity), 0)
  into v_loan_reserved
  from public.loan_request_items lri
  join public.loan_requests lr on lr.id = lri.loan_request_id
  where lri.inventory_item_id = new.inventory_item_id
    and lr.status in ('pending', 'approved', 'overdue', 'lost_stolen');

  v_new_total := v_quantity_reserved + v_loan_reserved + new.quantity;

  if v_new_total > v_quantity_total then
    raise exception 'Insufficient inventory. Available: %, Requested: %',
      (v_quantity_total - v_quantity_reserved - v_loan_reserved), new.quantity;
  end if;

  return new;
end;
$$;

create or replace function public.check_loan_inventory_availability()
returns trigger language plpgsql security definer as $$
declare
  v_quantity_total int;
  v_experiment_reserved int;
  v_loan_reserved int;
  v_new_total int;
begin
  select quantity_total into v_quantity_total
  from public.inventory_items
  where id = new.inventory_item_id
  for update;

  if v_quantity_total is null then
    raise exception 'Inventory item not found';
  end if;

  select coalesce(sum(ei.quantity), 0)
  into v_experiment_reserved
  from public.experiment_items ei
  join public.experiments e on e.id = ei.experiment_id
  where ei.inventory_item_id = new.inventory_item_id
    and ei.status = 'active'
    and e.status in ('draft', 'in_progress');

  select coalesce(sum(lri.quantity), 0)
  into v_loan_reserved
  from public.loan_request_items lri
  join public.loan_requests lr on lr.id = lri.loan_request_id
  where lri.inventory_item_id = new.inventory_item_id
    and lr.status in ('pending', 'approved', 'overdue', 'lost_stolen')
    and lri.loan_request_id != new.loan_request_id;

  v_new_total := v_experiment_reserved + v_loan_reserved + new.quantity;

  if v_new_total > v_quantity_total then
    raise exception 'Insufficient inventory. Available: %, Requested: %',
      (v_quantity_total - v_experiment_reserved - v_loan_reserved), new.quantity;
  end if;

  return new;
end;
$$;

create trigger trg_check_loan_inventory_availability
before insert on public.loan_request_items
for each row
execute function public.check_loan_inventory_availability();

-- ---------------------------------------------------------------------------
-- 8. Vencimiento sin cron: se revisa al abrir el módulo (igual que
--    close_overdue_sessions ya hace para experimentos).
-- ---------------------------------------------------------------------------
alter table public.notifications
  add column related_loan_request_id uuid references public.loan_requests(id) on delete cascade;

-- The original CHECK on notifications.type was declared inline at table
-- creation, so its autogenerated name isn't assumed — looked up dynamically
-- (same approach as migration 27's constraint lookup) instead of guessing it.
do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace ns on ns.oid = rel.relnamespace
  where ns.nspname = 'public'
    and rel.relname = 'notifications'
    and con.contype = 'c'
  limit 1;

  if v_constraint_name is not null then
    execute format('alter table public.notifications drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.notifications add constraint notifications_type_check check (
  type in (
    'access_request', 'access_approved', 'access_rejected', 'experiment_finished',
    'loan_request', 'loan_approved', 'loan_rejected',
    'loan_extension_requested', 'loan_extension_approved', 'loan_extension_rejected',
    'loan_overdue', 'loan_lost_stolen'
  )
);

create or replace function public.close_overdue_loans()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_notified integer := 0;
  v_count integer;
begin
  with updated as (
    update public.loan_requests
    set status = 'overdue'
    where status = 'approved' and usage_end < now()
    returning id, requester_id, professor_id
  ),
  inserted as (
    insert into public.notifications (user_id, type, payload, related_loan_request_id)
    select requester_id, 'loan_overdue', jsonb_build_object('loan_request_id', id), id from updated
    union all
    select gp.profile_id, 'loan_overdue', jsonb_build_object('loan_request_id', u.id), u.id
    from updated u
    join public.group_professors gp on gp.id = u.professor_id
    where gp.profile_id is not null
    returning 1
  )
  select count(*) into v_count from inserted;
  v_notified := v_notified + coalesce(v_count, 0);

  with updated as (
    update public.loan_requests
    set status = 'lost_stolen', marked_lost_at = now()
    where status = 'overdue' and now() > usage_end + interval '3 days'
    returning id, requester_id, professor_id
  ),
  inserted as (
    insert into public.notifications (user_id, type, payload, related_loan_request_id)
    select requester_id, 'loan_lost_stolen', jsonb_build_object('loan_request_id', id), id from updated
    union all
    select gp.profile_id, 'loan_lost_stolen', jsonb_build_object('loan_request_id', u.id), u.id
    from updated u
    join public.group_professors gp on gp.id = u.professor_id
    where gp.profile_id is not null
    returning 1
  )
  select count(*) into v_count from inserted;
  v_notified := v_notified + coalesce(v_count, 0);

  return v_notified;
end;
$$;

grant execute on function public.close_overdue_loans() to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Notificaciones de solicitud/decisión/extensión (mismo patrón que
--    notify_access_request / notify_access_resolution para experimentos).
-- ---------------------------------------------------------------------------
create or replace function public.notify_loan_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_professor_profile_id uuid;
begin
  select profile_id into v_professor_profile_id
  from public.group_professors
  where id = new.professor_id;

  if v_professor_profile_id is not null then
    insert into public.notifications (user_id, type, payload, related_loan_request_id)
    values (
      v_professor_profile_id,
      'loan_request',
      jsonb_build_object('loan_request_id', new.id, 'requester_id', new.requester_id),
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger trg_notify_loan_request
after insert on public.loan_requests
for each row
execute function public.notify_loan_request();

create or replace function public.notify_loan_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_professor_profile_id uuid;
begin
  select profile_id into v_professor_profile_id
  from public.group_professors
  where id = new.professor_id;

  if old.status = 'pending' and new.status = 'approved' then
    insert into public.notifications (user_id, type, payload, related_loan_request_id)
    values (new.requester_id, 'loan_approved', jsonb_build_object('loan_request_id', new.id), new.id);
  elsif old.status = 'pending' and new.status = 'rejected' then
    insert into public.notifications (user_id, type, payload, related_loan_request_id)
    values (new.requester_id, 'loan_rejected', jsonb_build_object('loan_request_id', new.id), new.id);
  end if;

  if old.requested_new_usage_end is null and new.requested_new_usage_end is not null then
    if v_professor_profile_id is not null then
      insert into public.notifications (user_id, type, payload, related_loan_request_id)
      values (v_professor_profile_id, 'loan_extension_requested', jsonb_build_object('loan_request_id', new.id), new.id);
    end if;
  end if;

  if old.requested_new_usage_end is not null and new.requested_new_usage_end is null then
    if new.usage_end = old.requested_new_usage_end then
      insert into public.notifications (user_id, type, payload, related_loan_request_id)
      values (new.requester_id, 'loan_extension_approved', jsonb_build_object('loan_request_id', new.id), new.id);
    else
      insert into public.notifications (user_id, type, payload, related_loan_request_id)
      values (new.requester_id, 'loan_extension_rejected', jsonb_build_object('loan_request_id', new.id), new.id);
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_notify_loan_status_change
after update on public.loan_requests
for each row
execute function public.notify_loan_status_change();
