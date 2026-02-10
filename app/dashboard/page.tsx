import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import BoardClient from '@/app/components/BoardClient';
import { Project, Task, Profile, UserSettings, AppSettings } from '@/lib/types';

export default async function DashboardPage() {
  const supabase = createServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const [projectsRes, tasksRes, profilesRes, userSettingsRes, appSettingsRes] =
    await Promise.all([
      supabase.from('projects').select('*').order('sort_order', { ascending: true }),
      supabase.from('tasks').select('*').order('sort_order', { ascending: true }),
      supabase.from('profiles').select('*').order('email', { ascending: true }),
      supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle(),
      supabase.from('app_settings').select('*').eq('id', 1).maybeSingle()
    ]);

  const projects = (projectsRes.data ?? []) as Project[];
  const tasks = (tasksRes.data ?? []) as Task[];
  const profiles = (profilesRes.data ?? []) as Profile[];
  const userSettings = (userSettingsRes.data ?? null) as UserSettings | null;
  const appSettings = (appSettingsRes.data ?? { id: 1, allow_all_edits: false }) as AppSettings;

  return (
    <BoardClient
      user={session.user}
      projects={projects}
      tasks={tasks}
      profiles={profiles}
      userSettings={userSettings}
      appSettings={appSettings}
    />
  );
}
