-- 1) Accept both institutional domains.
-- Students use @correo.uis.edu.co; staff/faculty use @uis.edu.co. The original
-- trigger only allowed the former, locking professors out of the system.
create or replace function public.enforce_uis_email_domain()
returns trigger language plpgsql security definer as $$
begin
  if new.email !~* '^[^@]+@(correo\.)?uis\.edu\.co$' then
    raise exception 'Solo se permite registro con correo institucional @correo.uis.edu.co o @uis.edu.co';
  end if;
  return new;
end;
$$;

-- 2) Bug / error reports submitted by lab members from the web app.
create table public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  reported_by uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 200),
  description text not null check (char_length(trim(description)) between 10 and 5000),
  page_url text,
  image_urls text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'wont_fix')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bug_reports_reported_by on public.bug_reports(reported_by);
create index idx_bug_reports_status on public.bug_reports(status);

alter table public.bug_reports enable row level security;

-- Reporters can file reports as themselves, and read back their own.
-- Admins/directors (profiles.role) can read everything to triage.
create policy "bug_reports_insert_own" on public.bug_reports
  for insert to authenticated
  with check (auth.uid() = reported_by);

create policy "bug_reports_select_own" on public.bug_reports
  for select to authenticated
  using (
    auth.uid() = reported_by
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'director')
    )
  );

-- Only admins/directors may change triage status. Reporters cannot edit a
-- report after filing it (keeps the report an honest record of what was seen).
create policy "bug_reports_update_admin" on public.bug_reports
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'director')
    )
  );

-- Storage bucket for screenshots attached to reports.
insert into storage.buckets (id, name, public)
values ('bug-report-images', 'bug-report-images', true)
on conflict (id) do nothing;

create policy "bug_report_images_select" on storage.objects
  for select to public
  using (bucket_id = 'bug-report-images');

create policy "bug_report_images_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'bug-report-images');

create policy "bug_report_images_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'bug-report-images' and auth.uid() = owner);
