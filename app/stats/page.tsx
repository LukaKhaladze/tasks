import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import StatsClient from '@/app/components/StatsClient';
import { Profile, Project, Task } from '@/lib/types';

export default async function StatsPage() {
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
    <StatsClient
      user={session.user}
      profiles={(profilesRes.data ?? []) as Profile[]}
      projects={(projectsRes.data ?? []) as Project[]}
      tasks={(tasksRes.data ?? []) as Task[]}
    />
  );
}
