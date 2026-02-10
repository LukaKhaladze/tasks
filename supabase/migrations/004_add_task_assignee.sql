alter table public.tasks add column if not exists assigned_user_id uuid references auth.users(id);
create index if not exists tasks_assigned_idx on public.tasks (assigned_user_id);
