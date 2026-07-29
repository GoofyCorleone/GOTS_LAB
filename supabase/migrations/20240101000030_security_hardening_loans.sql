-- ============================================================================
-- Endurecimiento de seguridad tras la auditoría del módulo de préstamos.
-- Cinco hallazgos confirmados contra producción con JWT de usuario real:
--
--   A4  Una cuenta externa podía leer experiment_sessions (la migración 24 la
--       abrió a "todo autenticado" y la 28 no la excluyó como sí hizo con
--       experiments / experiment_items / experiment_participants).
--   A6  Una cuenta externa podía listar TODOS los perfiles: nombre y correo
--       institucional de cada miembro del laboratorio. Cosecha de correos por
--       cualquiera que se registre desde fuera.
--   C2  CRÍTICO: el solicitante podía mover `usage_end` a cualquier fecha con
--       un PATCH directo, anulando por completo vencimiento y robo automático
--       — justo el mecanismo de responsabilidad del módulo.
--   C3  El solicitante podía falsificar el rastro de auditoría (decided_by,
--       decided_at, rejection_reason, returned_at, marked_lost_at).
--   C4  Un préstamo podía aprobarse sin aceptación legal: la app la inserta,
--       pero nada a nivel de BD lo exigía (a diferencia de los experimentos,
--       que sí tienen enforce_legal_acceptance).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helper: "¿el usuario actual es una cuenta externa?" en SECURITY DEFINER.
--    Necesario para poder consultarlo DENTRO de una policy de profiles sin
--    provocar recursión infinita de RLS (el mismo problema que resolvió la
--    migración 11 para experiments).
-- ---------------------------------------------------------------------------
create or replace function public.is_external_account()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(
    (select access_scope = 'external' from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_external_account() to authenticated;

-- ---------------------------------------------------------------------------
-- 1. (A4) experiment_sessions: excluir cuentas externas, igual que el resto
--    de las tablas de experimentos.
-- ---------------------------------------------------------------------------
drop policy if exists "experiment_sessions_select_all_authenticated" on public.experiment_sessions;
create policy "experiment_sessions_select_all_authenticated" on public.experiment_sessions
  for select to authenticated
  using (not public.is_external_account());

-- ---------------------------------------------------------------------------
-- 2. (A6) profiles: una cuenta externa solo ve su propio perfil y el de los
--    profesores que prestan (necesario para mostrar a quién le solicita y
--    para el correo de la solicitud). Las cuentas UIS siguen viendo a todos
--    los miembros, como hasta ahora.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated
  using (
    not public.is_external_account()
    or id = auth.uid()
    or exists (
      select 1 from public.group_professors gp where gp.profile_id = profiles.id
    )
  );

-- ---------------------------------------------------------------------------
-- 3. (B1 refuerzo) access_scope e institution no se tocan desde la API.
--    access_scope ya estaba protegido de facto por el CHECK + la ausencia de
--    UI, pero protect_profile_identity_columns solo congelaba id/email/role:
--    conviene congelarlo explícitamente, es la bandera que decide todo el
--    aislamiento de arriba.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_identity_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- No JWT ⇒ service_role o sesión directa: herramienta administrativa.
  if auth.uid() is null then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'No puedes modificar el rol de autorización de un perfil';
  end if;

  if new.id is distinct from old.id then
    raise exception 'No puedes modificar el identificador de un perfil';
  end if;

  if new.email is distinct from old.email then
    raise exception 'No puedes modificar el correo desde el perfil';
  end if;

  -- access_scope gobierna el aislamiento entre cuentas UIS y externas:
  -- poder cambiarlo sería escalación de privilegios directa.
  if new.access_scope is distinct from old.access_scope then
    raise exception 'No puedes modificar el alcance de acceso de un perfil';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. (C2 + C3) Máquina de estados de préstamos con control campo por campo.
--    Antes solo validaba las transiciones de `status`; cualquier otra columna
--    quedaba libre para el solicitante vía PATCH directo.
--
--    Nota sobre close_overdue_loans(): es SECURITY DEFINER, pero eso cambia el
--    ROL de base de datos, no los claims del JWT — auth.uid() adentro sigue
--    siendo quien llamó. Por eso las transiciones automáticas
--    (approved→overdue, overdue→lost_stolen) se autorizan por TIEMPO y no por
--    identidad: las puede disparar cualquier usuario al abrir el módulo.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_loan_status_transition()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_is_professor boolean;
  v_is_requester boolean;
  v_approving_extension boolean := false;
  v_status_changed boolean;
begin
  select exists (
    select 1 from public.group_professors gp
    where gp.id = old.professor_id and gp.profile_id = auth.uid()
  ) into v_is_professor;

  v_is_requester := (auth.uid() is not distinct from old.requester_id);
  v_status_changed := new.status is distinct from old.status;

  -- --- Columnas inmutables: el préstamo es un documento formal ------------
  if new.id is distinct from old.id
     or new.requester_id is distinct from old.requester_id
     or new.professor_id is distinct from old.professor_id
     or new.created_at is distinct from old.created_at then
    raise exception 'No se puede reasignar ni reidentificar un préstamo';
  end if;

  if new.purpose_description is distinct from old.purpose_description
     or new.usage_start is distinct from old.usage_start then
    raise exception 'La solicitud de préstamo no se puede modificar después de creada';
  end if;

  -- --- Extensión de plazo -------------------------------------------------
  if new.requested_new_usage_end is distinct from old.requested_new_usage_end then
    if old.requested_new_usage_end is null then
      -- Se está PIDIENDO una extensión.
      if not v_is_requester then
        raise exception 'Solo el solicitante puede pedir una extensión';
      end if;
      if old.status not in ('approved', 'overdue') then
        raise exception 'Solo se puede pedir extensión de un préstamo aprobado o vencido';
      end if;
      if new.requested_new_usage_end <= old.usage_end then
        raise exception 'La nueva fecha debe ser posterior a la fecha límite actual';
      end if;
    else
      -- Se está RESOLVIENDO una extensión pendiente.
      if not v_is_professor then
        raise exception 'Solo el profesor resuelve una solicitud de extensión';
      end if;
      if new.requested_new_usage_end is not null then
        raise exception 'Una extensión se resuelve aprobándola o descartándola, no reescribiéndola';
      end if;
      v_approving_extension := (new.usage_end = old.requested_new_usage_end);
    end if;
  end if;

  -- --- (C2) usage_end solo se mueve al aprobar una extensión --------------
  if new.usage_end is distinct from old.usage_end and not v_approving_extension then
    raise exception 'La fecha límite solo puede cambiarla el profesor al aprobar una extensión';
  end if;

  -- --- Transiciones de estado --------------------------------------------
  if v_status_changed then
    if old.status = 'pending' and new.status in ('approved', 'rejected') then
      if not v_is_professor then
        raise exception 'Solo el profesor puede aceptar o rechazar la solicitud';
      end if;
      -- (C4) Sin aceptación legal no sale ningún equipo del laboratorio.
      if new.status = 'approved' and not exists (
        select 1 from public.loan_legal_acceptance
        where loan_request_id = new.id
      ) then
        raise exception 'No se puede aprobar un préstamo sin aceptación de responsabilidad legal';
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
      if not (v_is_requester or v_is_professor) then
        raise exception 'Solo el solicitante o el profesor pueden marcar el préstamo como devuelto';
      end if;

    elsif old.status = 'overdue' and new.status = 'approved' and v_approving_extension then
      null; -- aprobar una extensión de un préstamo vencido lo reactiva

    else
      raise exception 'Transición de estado no permitida: % -> %', old.status, new.status;
    end if;
  end if;

  -- --- (C3) Rastro de auditoría: cada sello solo en su transición ---------
  if new.decided_by is distinct from old.decided_by
     or new.decided_at is distinct from old.decided_at
     or new.rejection_reason is distinct from old.rejection_reason then
    if not (old.status = 'pending' and new.status in ('approved', 'rejected')) then
      raise exception 'La decisión de un préstamo solo se registra al resolverlo';
    end if;
    if new.decided_by is distinct from auth.uid() then
      raise exception 'La decisión debe quedar registrada a nombre de quien la toma';
    end if;
    if new.status = 'approved' and new.rejection_reason is not null then
      raise exception 'Un préstamo aprobado no lleva motivo de rechazo';
    end if;
  end if;

  if new.returned_at is distinct from old.returned_at
     and not (v_status_changed and new.status = 'returned') then
    raise exception 'La fecha de devolución solo se registra al devolver el equipo';
  end if;

  if new.marked_lost_at is distinct from old.marked_lost_at
     and not (v_status_changed and new.status = 'lost_stolen') then
    raise exception 'La marca de robo/pérdida solo la estampa el sistema al vencer el plazo';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. (C4 refuerzo) La aceptación legal tampoco puede desaparecer por debajo
--    de un préstamo ya aprobado: loan_legal_acceptance ya es inmutable
--    (sin policies de UPDATE/DELETE + REVOKE) y su FK sin ON DELETE CASCADE
--    impide borrar el préstamo mientras exista. Se documenta aquí porque es
--    parte de la misma garantía.
-- ---------------------------------------------------------------------------
