-- Create profiles table (public mirror of auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null unique,
  role text not null default 'member' check (role in ('member', 'director', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Create policies
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated
  using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Create handle_new_user function
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Create trigger for new users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create enforcement function for email domain
create or replace function public.enforce_uis_email_domain()
returns trigger language plpgsql security definer as $$
begin
  if new.email !~* '^[^@]+@correo\.uis\.edu\.co$' then
    raise exception 'Solo se permite registro con correo institucional @correo.uis.edu.co';
  end if;
  return new;
end;
$$;

-- Create trigger for email domain validation
create trigger trg_enforce_uis_email_domain
before insert on auth.users
for each row execute function public.enforce_uis_email_domain();
