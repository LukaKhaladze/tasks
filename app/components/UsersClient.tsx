'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, Project, Task } from '@/lib/types';
import Toast, { ToastMessage } from '@/app/components/Toast';

export default function UsersClient({
  user,
  profiles: initialProfiles,
  projects,
  tasks
}: {
  user: { id: string; email?: string | null };
  profiles: Profile[];
  projects: Project[];
  tasks: Task[];
}) {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});

  const addToast = (message: string, type: ToastMessage['type']) => {
    setToasts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        message,
        type
      }
    ]);
  };

  const projectsByUser = useMemo(() => {
    const map = new Map<string, Project[]>();
    projects.forEach((project) => {
      if (!project.assigned_user_id) return;
      const list = map.get(project.assigned_user_id) ?? [];
      list.push(project);
      map.set(project.assigned_user_id, list);
    });
    return map;
  }, [projects]);

  const tasksByUser = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (!task.assigned_user_id) return;
      const list = map.get(task.assigned_user_id) ?? [];
      list.push(task);
      map.set(task.assigned_user_id, list);
    });
    return map;
  }, [tasks]);

  const updateUser = async (
    profile: Profile,
    updates: { email?: string; name?: string; password?: string }
  ) => {
    const prev = profiles;
    setProfiles((items) =>
      items.map((item) => (item.id === profile.id ? { ...item, ...updates } : item))
    );
    const res = await fetch(`/api/admin/users/${profile.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      setProfiles(prev);
      const body = await res.json();
      addToast(body.error ?? 'Update failed', 'error');
    }
  };

  const deleteUser = async (profile: Profile) => {
    const prev = profiles;
    setProfiles((items) => items.filter((item) => item.id !== profile.id));
    const res = await fetch(`/api/admin/users/${profile.id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      setProfiles(prev);
      const body = await res.json();
      addToast(body.error ?? 'Delete failed', 'error');
    }
  };

  return (
    <div className="min-h-screen px-6 py-6">
      <Toast
        toasts={toasts}
        onRemove={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))}
      />
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Users</h1>
          <p className="text-board-300">Manage profiles and assignments.</p>
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
          const assignedProjects = projectsByUser.get(profile.id) ?? [];
          const assignedTasks = tasksByUser.get(profile.id) ?? [];
          return (
            <div
              key={profile.id}
              className="rounded-2xl border border-board-700 bg-board-900/80 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <input
                    value={profile.name ?? ''}
                    onChange={(event) =>
                      setProfiles((items) =>
                        items.map((item) =>
                          item.id === profile.id
                            ? { ...item, name: event.target.value }
                            : item
                        )
                      )
                    }
                    onBlur={(event) =>
                      updateUser(profile, { name: event.target.value })
                    }
                    placeholder="Name"
                    className="w-full rounded-lg bg-board-850 border border-board-700 px-3 py-2 text-sm"
                  />
                  <input
                    value={profile.email ?? ''}
                    onChange={(event) =>
                      setProfiles((items) =>
                        items.map((item) =>
                          item.id === profile.id
                            ? { ...item, email: event.target.value }
                            : item
                        )
                      )
                    }
                    onBlur={(event) =>
                      updateUser(profile, { email: event.target.value })
                    }
                    placeholder="Email"
                    className="w-full rounded-lg bg-board-850 border border-board-700 px-3 py-2 text-sm"
                  />
                  <input
                    type="password"
                    placeholder="New password"
                    value={passwordDrafts[profile.id] ?? ''}
                    onChange={(event) =>
                      setPasswordDrafts((prev) => ({
                        ...prev,
                        [profile.id]: event.target.value
                      }))
                    }
                    className="w-full rounded-lg bg-board-850 border border-board-700 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => {
                      const value = (passwordDrafts[profile.id] ?? '').trim();
                      if (!value) return;
                      updateUser(profile, { password: value });
                      setPasswordDrafts((prev) => ({ ...prev, [profile.id]: '' }));
                    }}
                    className="w-full rounded-lg border border-board-700 px-3 py-2 text-sm text-white disabled:opacity-50"
                    disabled={!(passwordDrafts[profile.id] ?? '').trim()}
                  >
                    Save password
                  </button>
                </div>
                <button
                  onClick={() => deleteUser(profile)}
                  className="text-red-300 text-xs"
                >
                  Delete
                </button>
              </div>

              <div className="mt-4 text-xs text-board-300">
                <p>Projects: {assignedProjects.length}</p>
                <p>Tasks: {assignedTasks.length}</p>
              </div>
              <div className="mt-3">
                <p className="text-xs text-board-400 mb-1">Assigned Projects</p>
                <ul className="space-y-1 text-xs text-board-200">
                  {assignedProjects.slice(0, 5).map((project) => (
                    <li key={project.id}>{project.title}</li>
                  ))}
                  {!assignedProjects.length && <li className="text-board-500">None</li>}
                </ul>
              </div>
              <div className="mt-3">
                <p className="text-xs text-board-400 mb-1">Assigned Tasks</p>
                <ul className="space-y-1 text-xs text-board-200">
                  {assignedTasks.slice(0, 5).map((task) => (
                    <li key={task.id}>{task.text}</li>
                  ))}
                  {!assignedTasks.length && <li className="text-board-500">None</li>}
                </ul>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
