import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import UsersClient from '@/app/components/UsersClient';
import { Profile, Project, Task } from '@/lib/types';

export default async function UsersPage() {
  const supabase = createServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const [profilesRes, projectsRes, tasksRes] = await Promise.all([
    supabase.from('profiles').select('*').order('email', { ascending: true }),
    supabase.from('projects').select('*'),
    supabase.from('tasks').select('*')
  ]);

  return (
    <UsersClient
      user={session.user}
      profiles={(profilesRes.data ?? []) as Profile[]}
      projects={(projectsRes.data ?? []) as Project[]}
      tasks={(tasksRes.data ?? []) as Task[]}
    />
  );
}
