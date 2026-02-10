-- Enable extensions
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz not null default now()
);

-- Single row app settings
create table if not exists public.app_settings (
  id integer primary key,
  allow_all_edits boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.app_settings (id, allow_all_edits)
values (1, false)
on conflict (id) do nothing;

-- Per-user settings
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  due_soon_days integer not null default 3,
  created_at timestamptz not null default now()
);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  column text not null check (column in ('new','current','support','financial')),
  color_status text not null default 'white' check (color_status in ('white','red','yellow','green')),
  deadline date,
  assigned_user_id uuid references auth.users(id),
  pinned boolean not null default false,
  link text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_column_sort_idx on public.projects (column, sort_order);
create index if not exists projects_assigned_idx on public.projects (assigned_user_id);
create index if not exists projects_deadline_idx on public.projects (deadline);
create index if not exists projects_updated_idx on public.projects (updated_at desc);

-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists tasks_project_idx on public.tasks (project_id, sort_order);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper check
create or replace function public.is_admin()
returns boolean as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql stable;

create or replace function public.allow_all_edits()
returns boolean as $$
  select coalesce((select allow_all_edits from public.app_settings where id = 1), false);
$$ language sql stable;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.user_settings enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

-- Read policies
create policy "Authenticated read profiles" on public.profiles
  for select to authenticated using (true);

create policy "Authenticated read app_settings" on public.app_settings
  for select to authenticated using (true);

create policy "Authenticated read user_settings" on public.user_settings
  for select to authenticated using (auth.uid() = user_id);

create policy "Authenticated read projects" on public.projects
  for select to authenticated using (true);

create policy "Authenticated read tasks" on public.tasks
  for select to authenticated using (true);

-- Write policies (admin or assigned or allow_all_edits)
create policy "Update own profile" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admin manage profiles" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admin manage app_settings" on public.app_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "User manage own settings" on public.user_settings
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "User update own settings" on public.user_settings
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Project insert" on public.projects
  for insert to authenticated
  with check (
    public.is_admin()
    or public.allow_all_edits()
    or assigned_user_id = auth.uid()
  );

create policy "Project update" on public.projects
  for update to authenticated
  using (
    public.is_admin()
    or public.allow_all_edits()
    or assigned_user_id = auth.uid()
  )
  with check (
    public.is_admin()
    or public.allow_all_edits()
    or assigned_user_id = auth.uid()
  );

create policy "Project delete" on public.projects
  for delete to authenticated
  using (
    public.is_admin()
    or public.allow_all_edits()
    or assigned_user_id = auth.uid()
  );

create policy "Task insert" on public.tasks
  for insert to authenticated
  with check (
    public.is_admin()
    or public.allow_all_edits()
    or exists (
      select 1 from public.projects
      where id = project_id and assigned_user_id = auth.uid()
    )
  );

create policy "Task update" on public.tasks
  for update to authenticated
  using (
    public.is_admin()
    or public.allow_all_edits()
    or exists (
      select 1 from public.projects
      where id = project_id and assigned_user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or public.allow_all_edits()
    or exists (
      select 1 from public.projects
      where id = project_id and assigned_user_id = auth.uid()
    )
  );

create policy "Task delete" on public.tasks
  for delete to authenticated
  using (
    public.is_admin()
    or public.allow_all_edits()
    or exists (
      select 1 from public.projects
      where id = project_id and assigned_user_id = auth.uid()
    )
  );

-- Realtime
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.user_settings;
alter publication supabase_realtime add table public.app_settings;
