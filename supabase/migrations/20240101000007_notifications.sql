-- Create notifications table
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  type text not null check (type in ('access_request', 'access_approved', 'access_rejected', 'experiment_finished')),
  payload jsonb not null,
  related_experiment_id uuid references public.experiments(id),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Create email_log table (audit)
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id),
  to_email text not null,
  subject text not null,
  template text not null,
  status text not null check (status in ('queued', 'sent', 'failed')),
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Create indexes
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_type on public.notifications(type);
create index idx_notifications_is_read on public.notifications(is_read);
create index idx_email_log_notification_id on public.email_log(notification_id);
create index idx_email_log_status on public.email_log(status);

-- Enable RLS
alter table public.notifications enable row level security;
alter table public.email_log enable row level security;

-- Policies for notifications (only own notifications visible)
create policy "notifications_select" on public.notifications
  for select to authenticated
  using (auth.uid() = user_id);

create policy "notifications_update" on public.notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Email log is only accessible to service_role (via Edge Function)
create policy "email_log_select_service_role" on public.email_log
  for select to service_role
  using (true);

create policy "email_log_insert_service_role" on public.email_log
  for insert to service_role
  with check (true);

-- Trigger: notify owner when access request is made
create or replace function public.notify_access_request()
returns trigger language plpgsql security definer as $$
begin
  if new.source = 'requested_by_user' and new.status = 'pending' then
    insert into public.notifications (user_id, type, payload, related_experiment_id)
    select
      e.owner_id,
      'access_request',
      jsonb_build_object(
        'requester_id', new.user_id,
        'requester_email', p.email,
        'experiment_id', new.experiment_id
      ),
      new.experiment_id
    from public.experiments e
    join public.profiles p on p.id = new.user_id
    where e.id = new.experiment_id;
  end if;
  return new;
end;
$$;

create trigger trg_notify_access_request
after insert on public.experiment_participants
for each row
execute function public.notify_access_request();

-- Trigger: notify requester when access is approved/rejected
create or replace function public.notify_access_resolution()
returns trigger language plpgsql security defier as $$
begin
  if old.status = 'pending' and new.status in ('approved', 'rejected') then
    insert into public.notifications (user_id, type, payload, related_experiment_id)
    values (
      new.user_id,
      case when new.status = 'approved' then 'access_approved' else 'access_rejected' end,
      jsonb_build_object('experiment_id', new.experiment_id),
      new.experiment_id
    );
  end if;
  return new;
end;
$$;

create trigger trg_notify_access_resolution
after update on public.experiment_participants
for each row
execute function public.notify_access_resolution();

-- Trigger: notify owner when experiment finishes
create or replace function public.notify_experiment_finished()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'finished' and old.status != 'finished' then
    insert into public.notifications (user_id, type, payload, related_experiment_id)
    values (
      new.owner_id,
      'experiment_finished',
      jsonb_build_object('experiment_id', new.id, 'title', new.title),
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger trg_notify_experiment_finished
after update of status on public.experiments
for each row
execute function public.notify_experiment_finished();
