'use client';

import { useMemo } from 'react';
import { Profile, Project, Task } from '@/lib/types';

export default function StatsClient({
  profiles,
  projects,
  tasks
}: {
  user: { id: string; email?: string | null };
  profiles: Profile[];
  projects: Project[];
  tasks: Task[];
}) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

  const monthlyTasks = useMemo(() => {
    return tasks.filter((task) => {
      const created = new Date(task.created_at);
      return (
        created.getFullYear() === now.getFullYear() &&
        created.getMonth() === now.getMonth()
      );
    });
  }, [tasks, now]);

  const taskStatsByUser = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    monthlyTasks.forEach((task) => {
      if (!task.assigned_user_id) return;
      const entry = map.get(task.assigned_user_id) ?? { total: 0, done: 0 };
      entry.total += 1;
      if (task.done) entry.done += 1;
      map.set(task.assigned_user_id, entry);
    });
    return map;
  }, [monthlyTasks]);

  return (
    <div className="min-h-screen px-6 py-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Statistics</h1>
          <p className="text-board-300">Monthly reset: {monthKey}</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/dashboard"
            className="rounded-xl border border-board-700 px-4 py-2 text-sm"
          >
            Back to board
          </a>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {profiles.map((profile) => {
          const stats = taskStatsByUser.get(profile.id) ?? { total: 0, done: 0 };
          const open = stats.total - stats.done;
          return (
            <div
              key={profile.id}
              className="rounded-2xl border border-board-700 bg-board-900/80 p-4"
            >
              <h3 className="text-lg font-semibold">
                {profile.name ?? profile.email ?? profile.id}
              </h3>
              <p className="text-xs text-board-400">{profile.email}</p>
              <div className="mt-3 text-sm">
                <p>Total tasks: {stats.total}</p>
                <p>Done: {stats.done}</p>
                <p>Open: {open}</p>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
