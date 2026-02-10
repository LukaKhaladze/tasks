-- Allow all authenticated users to edit projects and tasks

drop policy if exists "Project insert" on public.projects;
drop policy if exists "Project update" on public.projects;
drop policy if exists "Project delete" on public.projects;

drop policy if exists "Task insert" on public.tasks;
drop policy if exists "Task update" on public.tasks;
drop policy if exists "Task delete" on public.tasks;

create policy "Project insert" on public.projects
  for insert to authenticated
  with check (true);

create policy "Project update" on public.projects
  for update to authenticated
  using (true)
  with check (true);

create policy "Project delete" on public.projects
  for delete to authenticated
  using (true);

create policy "Task insert" on public.tasks
  for insert to authenticated
  with check (true);

create policy "Task update" on public.tasks
  for update to authenticated
  using (true)
  with check (true);

create policy "Task delete" on public.tasks
  for delete to authenticated
  using (true);
