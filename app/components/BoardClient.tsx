'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { createClient } from '@/lib/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { ColumnId, Project, Task, Profile, UserSettings, AppSettings } from '@/lib/types';
import { startOfDay, toDateOnly, isBefore, isSameDay, diffInDays } from '@/lib/utils/date';
import Toast, { ToastMessage } from '@/app/components/Toast';
import SavingIndicator from '@/app/components/SavingIndicator';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import ProjectModal from '@/app/components/ProjectModal';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';

const columns: { id: ColumnId; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'current', label: 'Current' },
  { id: 'support', label: 'Support' },
  { id: 'financial', label: 'Financial' }
];

const colorOptions: Project['color_status'][] = ['white', 'red', 'yellow', 'green'];

const findFirstUrl = (value: string) => {
  const match = value.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
};

const colorClasses: Record<Project['color_status'], string> = {
  white: 'border-board-600 text-board-200',
  red: 'border-board-600 text-board-200',
  yellow: 'border-board-600 text-board-200',
  green: 'border-board-600 text-board-200'
};

const taskColorDotClasses: Record<Project['color_status'], string> = {
  white: 'bg-white',
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  green: 'bg-green-500'
};

const getProfileInitial = (profile?: Profile | null) => {
  const value = (profile?.name?.trim() || profile?.email || '-').trim();
  return value[0]?.toUpperCase() || '-';
};

const formatDeadlineValue = (value: string | null) => {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
};

function ColumnDrop({ id, children }: { id: ColumnId; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'rounded-2xl border border-board-700 bg-board-900/70 p-2 min-h-[220px] transition',
        isOver && 'border-accent-500/70'
      )}
    >
      {children}
    </div>
  );
}

function ProjectCard({
  project,
  tasks,
  profiles,
  dueLabel,
  onDelete,
  onMove,
  onUpdate,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  canEdit
}: {
  project: Project;
  tasks: Task[];
  profiles: Profile[];
  dueLabel: string | null;
  onDelete: () => void;
  onMove: (column: ColumnId) => void;
  onUpdate: (project: Project) => void;
  onAddTask: (text: string) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  canEdit: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: project.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  const [draftTitle, setDraftTitle] = useState(project.title);
  const [newTask, setNewTask] = useState('');
  const [showAllTasks, setShowAllTasks] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const taskTextRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    setDraftTitle(project.title);
  }, [project.title]);

  useEffect(() => {
    Object.values(taskTextRefs.current).forEach((el) => {
      if (!el) return;
      el.style.height = '0px';
      el.style.height = `${el.scrollHeight}px`;
    });
  }, [tasks, showAllTasks]);

  const visibleTasks = showAllTasks ? tasks : tasks.slice(0, 3);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'rounded-xl border bg-board-850 px-3 py-2 shadow-sm transition',
        colorClasses[project.color_status],
        isDragging && 'opacity-70'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <input
            value={draftTitle}
            disabled={!canEdit}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={() => {
              const nextTitle = draftTitle.trim();
              if (!nextTitle) {
                setDraftTitle(project.title);
                return;
              }
              if (nextTitle !== project.title) {
                onUpdate({
                  ...project,
                  title: nextTitle
                });
              }
            }}
            className="w-full bg-transparent text-sm font-semibold text-white outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="text-white text-xs"
            title="Delete"
          >
            X
          </button>
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="text-board-400"
            aria-label="Drag project"
            title="Drag project"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6h6M9 12h6M9 18h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-board-300">
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <select
          value={project.column}
          onChange={(event) => onMove(event.target.value as ColumnId)}
          onMouseDown={(event) => event.stopPropagation()}
          className="appearance-none rounded-lg border border-board-700 bg-board-900 px-2 py-1"
          disabled={!canEdit}
        >
          {columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.label}
            </option>
          ))}
        </select>
        <div className="relative">
          <div
            className={clsx(
              'rounded-lg border border-board-700 bg-board-900 pl-2 pr-6 py-1 text-[11px] uppercase tracking-wide',
              dueLabel === 'overdue' && 'text-red-300',
              dueLabel === 'today' && 'text-yellow-300',
              dueLabel === 'tomorrow' && 'text-blue-300',
              dueLabel === 'soon' && 'text-board-200',
              dueLabel === 'waiting' && 'text-board-300',
              !dueLabel && 'text-board-200'
            )}
          >
            {dueLabel || formatDeadlineValue(project.deadline) || 'waiting'}
          </div>
          <input
            ref={dateInputRef}
            type="date"
            value={project.deadline ?? ''}
            onChange={(event) =>
              onUpdate({
                ...project,
                deadline: event.target.value || null
              })
            }
            onMouseDown={(event) => event.stopPropagation()}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            disabled={!canEdit}
          />
          <button
            type="button"
            onClick={() => {
              const input = dateInputRef.current;
              if (!input) return;
              const picker = (input as any).showPicker;
              if (typeof picker === 'function') {
                picker.call(input);
              } else {
                input.focus();
              }
            }}
            onMouseDown={(event) => event.stopPropagation()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-board-300"
            aria-label="Open calendar"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      {!canEdit && (
        <div className="mt-1 text-[11px] text-board-400">Read-only</div>
      )}
      <div className="mt-1 space-y-1.5">
        {visibleTasks.map((task) => (
          <div
            key={task.id}
            className="rounded-md bg-board-900/40 px-2 py-1"
          >
            <div className="mb-1 flex items-center gap-2">
              <select
                value={task.assigned_user_id ?? ''}
                onChange={(event) =>
                  onUpdateTask({
                    ...task,
                    assigned_user_id: event.target.value || null
                  })
                }
                onMouseDown={(event) => event.stopPropagation()}
                className="h-6 w-8 appearance-none rounded-full bg-board-800 px-0 text-center text-[10px] text-white"
                disabled={!canEdit}
                aria-label="Assign task user"
              >
                <option value="">-</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {getProfileInitial(profile)}
                  </option>
                ))}
              </select>
              <select
                value={task.color_status ?? 'white'}
                onChange={(event) =>
                  onUpdateTask({ ...task, color_status: event.target.value as Task['color_status'] })
                }
                onMouseDown={(event) => event.stopPropagation()}
                className="appearance-none h-6 rounded-md bg-board-800 px-2 text-[10px] text-board-200"
                disabled={!canEdit}
                aria-label="Select task color"
              >
                <option value="white">⚪</option>
                <option value="red">🔴</option>
                <option value="yellow">🟡</option>
                <option value="green">🟢</option>
              </select>
              <button
                onClick={() => onDeleteTask(task)}
                onMouseDown={(event) => event.stopPropagation()}
                disabled={!canEdit}
                className="ml-auto flex h-6 w-6 items-center justify-center text-white text-xs leading-none"
                aria-label="Delete task"
              >
                X
              </button>
            </div>
            <textarea
              ref={(el) => {
                taskTextRefs.current[task.id] = el;
              }}
              value={task.text}
              onChange={(event) => onUpdateTask({ ...task, text: event.target.value })}
              onMouseDown={(event) => event.stopPropagation()}
              onInput={(event) => {
                const el = event.currentTarget;
                el.style.height = '0px';
                el.style.height = `${el.scrollHeight}px`;
              }}
              rows={1}
              className={clsx(
                'w-full min-h-[24px] resize-none overflow-hidden bg-transparent px-1 text-xs leading-5 outline-none break-words whitespace-pre-wrap',
                task.done && 'line-through text-board-400'
              )}
              disabled={!canEdit}
            />
            {findFirstUrl(task.text) && (
              <a
                href={findFirstUrl(task.text) as string}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all text-[10px] text-accent-400 underline"
              >
                {findFirstUrl(task.text)}
              </a>
            )}
          </div>
        ))}
        {tasks.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAllTasks((prev) => !prev)}
            onMouseDown={(event) => event.stopPropagation()}
            className="text-[11px] text-board-300 underline"
          >
            {showAllTasks ? 'See less' : `See more (${tasks.length - 3})`}
          </button>
        )}
        <div className="flex gap-2">
          <input
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
            onMouseDown={(event) => event.stopPropagation()}
            placeholder="Add task"
            className="flex-1 rounded-lg bg-board-900 border border-board-700 px-2 py-1 text-xs"
            disabled={!canEdit}
          />
          <button
            onClick={() => {
              if (!newTask.trim()) return;
              onAddTask(newTask.trim());
              setNewTask('');
            }}
            onMouseDown={(event) => event.stopPropagation()}
            className="rounded-lg bg-accent-500 px-2 text-xs text-white"
            disabled={!canEdit}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BoardClient({
  user,
  projects: initialProjects,
  tasks: initialTasks,
  profiles: initialProfiles,
  userSettings,
  appSettings
}: {
  user: { id: string; email?: string | null };
  projects: Project[];
  tasks: Task[];
  profiles: Profile[];
  userSettings: UserSettings | null;
  appSettings: AppSettings;
}) {
  const supabase = createClient();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [settings, setSettings] = useState<UserSettings | null>(userSettings);
  const [appConfig, setAppConfig] = useState<AppSettings>(appSettings);
  const [savingCount, setSavingCount] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');

  const currentProfile = useMemo(
    () => profiles.find((profile) => profile.id === user.id),
    [profiles, user.id]
  );
  const isAdmin = currentProfile?.role === 'admin';

  const dueSoonDays = settings?.due_soon_days ?? 3;

  const addToast = useCallback((message: string, type: ToastMessage['type']) => {
    setToasts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        message,
        type
      }
    ]);
  }, []);

  const setSaving = (delta: number) =>
    setSavingCount((count) => Math.max(0, count + delta));

  const tasksByProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const list = map.get(task.project_id) ?? [];
      list.push(task);
      map.set(task.project_id, list);
    });
    map.forEach((list, projectId) => {
      list.sort((a, b) => a.sort_order - b.sort_order);
      map.set(projectId, list);
    });
    return map;
  }, [tasks]);

  const getProjectTasks = (projectId: string) =>
    tasksByProject.get(projectId) ?? [];

  const dueStatus = useCallback(
    (project: Project) => {
      if (!project.deadline) return 'none';
      const today = startOfDay(new Date());
      const deadline = toDateOnly(project.deadline);
      if (isBefore(deadline, today)) return 'overdue';
      if (isSameDay(deadline, today)) return 'today';
      const diff = diffInDays(deadline, today);
      if (diff <= dueSoonDays) return 'soon';
      return 'none';
    },
    [dueSoonDays]
  );

  const filteredProjects = projects;

  const projectsByColumn = useMemo(() => {
    const map = new Map<ColumnId, Project[]>();
    columns.forEach((column) => map.set(column.id, []));
    filteredProjects.forEach((project) => {
      map.get(project.column)?.push(project);
    });
    map.forEach((list, column) => {
      list.sort((a, b) => a.sort_order - b.sort_order);
      map.set(column, list);
    });
    return map;
  }, [filteredProjects]);

  const boardStats = useMemo(() => {
    const activeTasks = tasks.filter((task) => !task.done).length;
    const columnCounts: Record<ColumnId, number> = {
      new: 0,
      current: 0,
      support: 0,
      financial: 0
    };
    const colorCounts: Record<Project['color_status'], number> = {
      white: 0,
      red: 0,
      yellow: 0,
      green: 0
    };
    const byUser: Record<string, number> = {};

    projects.forEach((project) => {
      columnCounts[project.column] += 1;
      colorCounts[project.color_status] += 1;
      if (project.assigned_user_id) {
        byUser[project.assigned_user_id] = (byUser[project.assigned_user_id] ?? 0) + 1;
      }
    });

    const topUsers = Object.entries(byUser)
      .map(([id, count]) => {
        const profile = profiles.find((p) => p.id === id);
        const name = profile?.name?.trim() || profile?.email?.split('@')[0] || id.slice(0, 6);
        return { id, name, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { activeTasks, columnCounts, colorCounts, topUsers };
  }, [tasks, projects, profiles]);

  const canEdit = (_project: Project) => true;

  const updateProjectState = (next: Project) => {
    setProjects((prev) => prev.map((project) => (project.id === next.id ? next : project)));
  };

  const updateTaskState = (next: Task) => {
    setTasks((prev) => prev.map((task) => (task.id === next.id ? next : task)));
  };

  const runOptimistic = async (
    optimistic: () => void,
    rollback: () => void,
    action: () => PromiseLike<{ error: any }>
  ) => {
    optimistic();
    setSaving(1);
    const { error } = await action();
    setSaving(-1);
    if (error) {
      rollback();
      addToast(error.message ?? 'Something went wrong', 'error');
    }
  };

  const createProject = async (column: ColumnId = 'new') => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      title: 'New project',
      description: null,
      column,
      color_status: 'white',
      deadline: null,
      assigned_user_id: user.id,
      pinned: false,
      link: null,
      sort_order: projects.filter((project) => project.column === column).length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const previous = projects;
    await runOptimistic(
      () => setProjects((prev) => [...prev, newProject]),
      () => setProjects(previous),
      () => supabase.from('projects').insert(newProject)
    );
  };

  const handleUpdateProject = async (project: Project) => {
    if (!project.title || !project.title.trim()) return;
    if (!canEdit(project)) return;
    const previous = projects;
    await runOptimistic(
      () => updateProjectState(project),
      () => setProjects(previous),
      () =>
        supabase
          .from('projects')
          .update({
            title: project.title,
            description: project.description,
            column: project.column,
            color_status: project.color_status,
            deadline: project.deadline,
            assigned_user_id: project.assigned_user_id,
            pinned: project.pinned,
            link: project.link,
            sort_order: project.sort_order
          })
          .eq('id', project.id)
    );
  };

  const handleDeleteProject = async (project: Project) => {
    if (!canEdit(project)) return;
    const previous = projects;
    const previousTasks = tasks;
    await runOptimistic(
      () => {
        setProjects((prev) => prev.filter((item) => item.id !== project.id));
        setTasks((prev) => prev.filter((task) => task.project_id !== project.id));
      },
      () => {
        setProjects(previous);
        setTasks(previousTasks);
      },
      () => supabase.from('projects').delete().eq('id', project.id)
    );
  };

  const handleDuplicateProject = async (project: Project) => {
    if (!canEdit(project)) return;
    const newId = crypto.randomUUID();
    const duplicated: Project = {
      ...project,
      id: newId,
      title: `${project.title} (copy)`,
      pinned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sort_order: projects.filter((p) => p.column === project.column).length
    };
    const newTasks = getProjectTasks(project.id).map((task, index) => ({
      ...task,
      id: crypto.randomUUID(),
      project_id: newId,
      done: false,
      sort_order: index,
      created_at: new Date().toISOString()
    }));
    const previous = projects;
    const previousTasks = tasks;
    await runOptimistic(
      () => {
        setProjects((prev) => [...prev, duplicated]);
        setTasks((prev) => [...prev, ...newTasks]);
      },
      () => {
        setProjects(previous);
        setTasks(previousTasks);
      },
      async () => {
        const projectInsert = await supabase.from('projects').insert(duplicated);
        if (projectInsert.error) return projectInsert;
        if (newTasks.length) {
          return supabase.from('tasks').insert(newTasks);
        }
        return { error: null } as any;
      }
    );
  };

  const handleAddTask = async (projectId: string, text: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project || !canEdit(project)) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      project_id: projectId,
      text,
      done: false,
      assigned_user_id: project.assigned_user_id ?? null,
      color_status: 'white',
      sort_order: getProjectTasks(projectId).length,
      created_at: new Date().toISOString()
    };
    const previous = tasks;
    await runOptimistic(
      () => setTasks((prev) => [...prev, newTask]),
      () => setTasks(previous),
      () => supabase.from('tasks').insert(newTask)
    );
  };

  const handleUpdateTask = async (task: Task) => {
    const project = projects.find((item) => item.id === task.project_id);
    if (!project || !canEdit(project)) return;
    const previous = tasks;
    await runOptimistic(
      () => updateTaskState(task),
      () => setTasks(previous),
      () =>
        supabase
          .from('tasks')
          .update({
            text: task.text,
            done: task.done,
            sort_order: task.sort_order,
            assigned_user_id: task.assigned_user_id ?? null,
            color_status: task.color_status ?? 'white'
          })
          .eq('id', task.id)
    );
  };

  const handleDeleteTask = async (task: Task) => {
    const project = projects.find((item) => item.id === task.project_id);
    if (!project || !canEdit(project)) return;
    const previous = tasks;
    await runOptimistic(
      () => setTasks((prev) => prev.filter((item) => item.id !== task.id)),
      () => setTasks(previous),
      () => supabase.from('tasks').delete().eq('id', task.id)
    );
  };

  const handleReorderTasks = async (projectId: string, nextTasks: Task[]) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project || !canEdit(project)) return;
    const previous = tasks;
    await runOptimistic(
      () => {
        setTasks((prev) => {
          const rest = prev.filter((task) => task.project_id !== projectId);
          return [...rest, ...nextTasks];
        });
      },
      () => setTasks(previous),
      () => supabase.from('tasks').upsert(
        nextTasks.map((task) => ({ id: task.id, sort_order: task.sort_order }))
      )
    );
  };

  const handleMarkAllTasksDone = async (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project || !canEdit(project)) return;
    const previous = tasks;
    const next = tasks.map((task) =>
      task.project_id === projectId ? { ...task, done: true } : task
    );
    await runOptimistic(
      () => setTasks(next),
      () => setTasks(previous),
      () => supabase.from('tasks').update({ done: true }).eq('project_id', projectId)
    );
  };

  const handleMoveProject = async (project: Project, column: ColumnId) => {
    if (!canEdit(project)) return;
    const previous = projects;
    const next = { ...project, column };
    await runOptimistic(
      () => updateProjectState(next),
      () => setProjects(previous),
      () => supabase.from('projects').update({ column }).eq('id', project.id)
    );
  };

  const handleCycleColor = async (project: Project) => {
    if (!canEdit(project)) return;
    const idx = colorOptions.indexOf(project.color_status);
    const nextColor = colorOptions[(idx + 1) % colorOptions.length];
    const previous = projects;
    const next = { ...project, color_status: nextColor };
    await runOptimistic(
      () => updateProjectState(next),
      () => setProjects(previous),
      () => supabase.from('projects').update({ color_status: nextColor }).eq('id', project.id)
    );
  };

  const handlePinProject = async (project: Project) => {
    if (!canEdit(project)) return;
    const previous = projects;
    const next = { ...project, pinned: !project.pinned };
    await runOptimistic(
      () => updateProjectState(next),
      () => setProjects(previous),
      () => supabase.from('projects').update({ pinned: next.pinned }).eq('id', project.id)
    );
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleDueSoonUpdate = async (value: number) => {
    const previous = settings;
    const next = { user_id: user.id, due_soon_days: value };
    await runOptimistic(
      () => setSettings(next),
      () => setSettings(previous),
      () => supabase.from('user_settings').upsert(next, { onConflict: 'user_id' })
    );
  };

  const handleAllowAllEdits = async (value: boolean) => {
    const previous = appConfig;
    const next = { ...appConfig, allow_all_edits: value };
    await runOptimistic(
      () => setAppConfig(next),
      () => setAppConfig(previous),
      () => supabase.from('app_settings').update({ allow_all_edits: value }).eq('id', 1)
    );
  };

  const handleAdminUpdateUser = async (
    profile: Profile,
    updates: { email?: string; name?: string; password?: string }
  ) => {
    const previous = profiles;
    const next = profiles.map((item) =>
      item.id === profile.id ? { ...item, ...updates } : item
    );
    await runOptimistic(
      () => setProfiles(next),
      () => setProfiles(previous),
      async () => {
        const res = await fetch(`/api/admin/users/${profile.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        if (!res.ok) {
          const body = await res.json();
          return { error: { message: body.error ?? 'Update failed' } } as any;
        }
        return { error: null } as any;
      }
    );
  };

  const handleAdminCreateUser = async () => {
    if (!newUserEmail) return;
    const previous = profiles;
    await runOptimistic(
      () => {},
      () => setProfiles(previous),
      async () => {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newUserEmail,
            password: newUserPassword || undefined,
            name: newUserName || undefined
          })
        });
        if (!res.ok) {
          const body = await res.json();
          return { error: { message: body.error ?? 'Create failed' } } as any;
        }
        const { id } = await res.json();
        setProfiles((prev) => [
          ...prev,
          {
            id,
            email: newUserEmail,
            name: newUserName || null
          }
        ]);
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserName('');
        return { error: null } as any;
      }
    );
  };

  const handleAdminDeleteUser = async (profile: Profile) => {
    const previous = profiles;
    await runOptimistic(
      () => setProfiles((prev) => prev.filter((item) => item.id !== profile.id)),
      () => setProfiles(previous),
      async () => {
        const res = await fetch(`/api/admin/users/${profile.id}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          const body = await res.json();
          return { error: { message: body.error ?? 'Delete failed' } } as any;
        }
        return { error: null } as any;
      }
    );
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeProject = projects.find((project) => project.id === activeId);
    if (!activeProject || !canEdit(activeProject)) return;

    const overProject = projects.find((project) => project.id === overId);
    const targetColumn = (overProject?.column ?? overId) as ColumnId;
    const sourceColumn = activeProject.column;

    const sourceList = projects
      .filter((project) => project.column === sourceColumn)
      .sort((a, b) => a.sort_order - b.sort_order);
    const targetList = projects
      .filter((project) => project.column === targetColumn)
      .sort((a, b) => a.sort_order - b.sort_order);

    let updatedProjects: Project[] = [];

    if (sourceColumn === targetColumn) {
      const oldIndex = sourceList.findIndex((project) => project.id === activeId);
      const newIndex = overProject
        ? sourceList.findIndex((project) => project.id === overProject.id)
        : sourceList.length - 1;
      const reordered = arrayMove(sourceList, oldIndex, newIndex).map((project, index) => ({
        ...project,
        sort_order: index
      }));
      updatedProjects = reordered;
    } else {
      const sourceWithout = sourceList.filter((project) => project.id !== activeId);
      const insertIndex = overProject
        ? targetList.findIndex((project) => project.id === overProject.id)
        : targetList.length;
      const movedProject = { ...activeProject, column: targetColumn };
      const nextTarget = [
        ...targetList.slice(0, insertIndex),
        movedProject,
        ...targetList.slice(insertIndex)
      ].map((project, index) => ({ ...project, sort_order: index }));
      const nextSource = sourceWithout.map((project, index) => ({
        ...project,
        sort_order: index
      }));
      updatedProjects = [...nextSource, ...nextTarget];
    }

    const previous = projects;
    await runOptimistic(
      () => {
        setProjects((prev) => {
          const map = new Map(prev.map((project) => [project.id, project]));
          updatedProjects.forEach((project) => map.set(project.id, project));
          return Array.from(map.values());
        });
      },
      () => setProjects(previous),
      async () => {
        for (const nextProject of updatedProjects) {
          const { error } = await supabase
            .from('projects')
            .update({
              column: nextProject.column,
              sort_order: nextProject.sort_order
            })
            .eq('id', nextProject.id);
          if (error) return { error } as any;
        }
        return { error: null } as any;
      }
    );
  };

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const setupChannel = async (accessToken?: string) => {
      if (!accessToken) return;
      try {
        supabase.realtime.disconnect();
      } catch {
        // no-op
      }
      supabase.realtime.setAuth(accessToken);
      await supabase.realtime.connect();
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      channel = supabase
        .channel('realtime-taskboard')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'projects' },
          (payload: RealtimePostgresChangesPayload<Project>) => {
            const project = payload.new as Project;
            if (payload.eventType === 'DELETE') {
              setProjects((prev) => prev.filter((item) => item.id !== (payload.old as any).id));
              return;
            }
            setProjects((prev) => {
              const exists = prev.find((item) => item.id === project.id);
              if (exists) {
                return prev.map((item) => (item.id === project.id ? project : item));
              }
              return [...prev, project];
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          (payload: RealtimePostgresChangesPayload<Task>) => {
            const task = payload.new as Task;
            if (payload.eventType === 'DELETE') {
              setTasks((prev) => prev.filter((item) => item.id !== (payload.old as any).id));
              return;
            }
            setTasks((prev) => {
              const exists = prev.find((item) => item.id === task.id);
              if (exists) {
                return prev.map((item) => (item.id === task.id ? task : item));
              }
              return [...prev, task];
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          (payload: RealtimePostgresChangesPayload<Profile>) => {
            const profile = payload.new as Profile;
            if (payload.eventType === 'DELETE') {
              setProfiles((prev) => prev.filter((item) => item.id !== (payload.old as any).id));
              return;
            }
            setProfiles((prev) => {
              const exists = prev.find((item) => item.id === profile.id);
              if (exists) {
                return prev.map((item) => (item.id === profile.id ? profile : item));
              }
              return [...prev, profile];
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_settings' },
          (payload: RealtimePostgresChangesPayload<UserSettings>) => {
            if ((payload.new as UserSettings).user_id !== user.id) return;
            setSettings(payload.new as UserSettings);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'app_settings' },
          (payload: RealtimePostgresChangesPayload<AppSettings>) => {
            setAppConfig(payload.new as AppSettings);
          }
        )
        .subscribe();
    };

    supabase.auth.getSession().then(({ data }) => {
      setupChannel(data.session?.access_token);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setupChannel(session?.access_token);
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
      subscription.unsubscribe();
    };
  }, [supabase, user.id]);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      const [projectsRes, tasksRes, profilesRes, settingsRes, appRes] =
        await Promise.all([
          supabase.from('projects').select('*'),
          supabase.from('tasks').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('app_settings').select('*').eq('id', 1).maybeSingle()
        ]);

      if (!active) return;

      if (projectsRes.data) setProjects(projectsRes.data as Project[]);
      if (tasksRes.data) setTasks(tasksRes.data as Task[]);
      if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
      if (settingsRes.data) setSettings(settingsRes.data as UserSettings);
      if (appRes.data) setAppConfig(appRes.data as AppSettings);
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [supabase, user.id]);

  return (
    <div className="min-h-screen px-6 py-6">
      <SavingIndicator saving={savingCount > 0} />
      <Toast
        toasts={toasts}
        onRemove={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))}
      />

      <div className="mb-4 flex items-center gap-3 overflow-x-auto whitespace-nowrap">
        <button
          type="button"
          onClick={() => createProject()}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-board-900 px-3 py-2 text-board-200"
          aria-label="Add project"
          title="New project"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <a
          href="https://meet.google.com/nwu-oatt-ekj"
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-board-900 px-3 py-2 text-xs text-board-200"
          title="Open Google Meet"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 10.5v3l4 2.5V8l-4 2.5ZM4 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Meet
        </a>
        <div className="flex items-center gap-2 text-[11px] text-board-200">
          <span className="rounded-full bg-board-900 px-2 py-1">
          tasks: {boardStats.activeTasks}
          </span>
          {columns.map((column) => (
            <span key={column.id} className="rounded-full bg-board-900 px-2 py-1">
              {column.label.toLowerCase()}: {boardStats.columnCounts[column.id]}
            </span>
          ))}
          {boardStats.topUsers.map((item) => (
            <span key={item.id} className="rounded-full bg-board-900 px-2 py-1">
              {item.name}: {item.count}
            </span>
          ))}
          {colorOptions.map((color) => (
            <span key={color} className="inline-flex items-center gap-1 rounded-full bg-board-900 px-2 py-1">
              <span className={clsx('h-2.5 w-2.5 rounded-full', taskColorDotClasses[color])} />
              {boardStats.colorCounts[color]}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="ml-auto rounded-lg bg-board-900 px-3 py-2 text-board-200"
          aria-label="Open menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="mb-4 ml-auto w-full max-w-xs rounded-xl border border-board-700 bg-board-900 p-3">
          <div className="grid grid-cols-1 gap-2 text-sm">
            <a
              href="/dashboard"
              className="rounded-lg border border-board-700 px-3 py-2"
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </a>
            <a
              href="/users"
              className="rounded-lg border border-board-700 px-3 py-2"
              onClick={() => setMenuOpen(false)}
            >
              Users
            </a>
            <a
              href="/stats"
              className="rounded-lg border border-board-700 px-3 py-2"
              onClick={() => setMenuOpen(false)}
            >
              Stats
            </a>
            <button
              onClick={() => {
                setMenuOpen(false);
                createProject();
              }}
              className="rounded-lg bg-accent-500 px-3 py-2 font-semibold text-white"
            >
              New project
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                setShowSettings((prev) => !prev);
              }}
              className="rounded-lg border border-board-700 px-3 py-2 text-left"
            >
              Settings
            </button>
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-board-700 px-3 py-2 text-left"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <section className="mt-4 rounded-2xl border border-board-700 bg-board-900/80 p-3">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold">Due Soon Days</h3>
              <input
                type="number"
                min={1}
                max={30}
                value={dueSoonDays}
                onChange={(event) => handleDueSoonUpdate(Number(event.target.value))}
                className="mt-2 w-full rounded-lg bg-board-850 border border-board-700 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Editing Access</h3>
              <p className="mt-2 text-xs text-board-400">
                All users can edit projects and tasks.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => setShowUsers((prev) => !prev)}
              className="rounded-lg border border-board-700 px-3 py-2 text-sm"
            >
              {showUsers ? 'Hide user manager' : 'Manage users'}
            </button>
          </div>
          {showUsers && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2">Manage Users</h3>
              <div className="rounded-lg border border-board-700 bg-board-850 p-3 mb-4">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                  <input
                    value={newUserEmail}
                    onChange={(event) => setNewUserEmail(event.target.value)}
                    placeholder="Email"
                    className="rounded-lg bg-board-900 border border-board-700 px-3 py-2 text-sm"
                  />
                  <input
                    value={newUserPassword}
                    onChange={(event) => setNewUserPassword(event.target.value)}
                    placeholder="Temp password"
                    className="rounded-lg bg-board-900 border border-board-700 px-3 py-2 text-sm"
                  />
                  <input
                    value={newUserName}
                    onChange={(event) => setNewUserName(event.target.value)}
                    placeholder="Name"
                    className="rounded-lg bg-board-900 border border-board-700 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAdminCreateUser}
                      className="w-full rounded-lg bg-accent-500 px-3 text-sm font-semibold text-white"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between rounded-lg border border-board-700 bg-board-850 px-3 py-2 text-sm"
                  >
                    <div>
                      <input
                        value={profile.name ?? ''}
                        onChange={(event) =>
                          handleAdminUpdateUser(profile, { name: event.target.value })
                        }
                        placeholder="Name"
                        className="mb-1 w-full rounded-md bg-board-900 border border-board-700 px-2 py-1 text-xs"
                      />
                      <input
                        value={profile.email ?? ''}
                        onChange={(event) =>
                          handleAdminUpdateUser(profile, { email: event.target.value })
                        }
                        placeholder="Email"
                        className="w-full rounded-md bg-board-900 border border-board-700 px-2 py-1 text-xs"
                      />
                      <p className="text-xs text-board-400">{profile.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        placeholder="New password"
                        onBlur={(event) => {
                          if (event.target.value) {
                            handleAdminUpdateUser(profile, { password: event.target.value });
                            event.target.value = '';
                          }
                        }}
                        className="w-28 rounded-md bg-board-900 border border-board-700 px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => handleAdminDeleteUser(profile)}
                        className="rounded-lg border border-red-500/60 px-3 py-1 text-xs text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
          {columns.map((column) => {
            const columnProjects = projectsByColumn.get(column.id) ?? [];
            return (
              <ColumnDrop key={column.id} id={column.id}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{column.label}</h3>
                    <button
                      type="button"
                      onClick={() => createProject(column.id)}
                      className="flex h-5 w-5 items-center justify-center rounded-md bg-board-800 text-white"
                      aria-label={`Add project to ${column.label}`}
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-board-400">
                    {columnProjects.length}
                  </span>
                </div>
                <SortableContext
                  items={columnProjects.map((project) => project.id)}
                  strategy={verticalListSortingStrategy}
                >
                <div className="space-y-2">
                    {columnProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        tasks={getProjectTasks(project.id)}
                        profiles={profiles}
                        dueLabel={(() => {
                          if (!project.deadline) return 'waiting';
                          const today = startOfDay(new Date());
                          const deadline = toDateOnly(project.deadline);
                          if (isBefore(deadline, today)) return 'overdue';
                          if (isSameDay(deadline, today)) return 'today';
                          const diff = diffInDays(deadline, today);
                          if (diff === 1) return 'tomorrow';
                          if (diff <= dueSoonDays) return 'soon';
                          return null;
                        })()}
                        onDelete={() => setConfirmDelete(project)}
                        onMove={(nextColumn) => handleMoveProject(project, nextColumn)}
                        onUpdate={(next) => handleUpdateProject(next)}
                        onAddTask={(text) => handleAddTask(project.id, text)}
                        onUpdateTask={(task) => handleUpdateTask(task)}
                        onDeleteTask={(task) => handleDeleteTask(task)}
                        canEdit={canEdit(project)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </ColumnDrop>
            );
          })}
        </section>
      </DndContext>

      <ProjectModal
        open={Boolean(selectedProject)}
        project={selectedProject}
        tasks={selectedProject ? getProjectTasks(selectedProject.id) : []}
        profiles={profiles}
        canEdit={selectedProject ? canEdit(selectedProject) : false}
        onClose={() => setSelectedProjectId(null)}
        onUpdateProject={(project) => handleUpdateProject(project)}
        onAddTask={(text) => selectedProject && handleAddTask(selectedProject.id, text)}
        onUpdateTask={(task) => handleUpdateTask(task)}
        onDeleteTask={(task) => handleDeleteTask(task)}
        onReorderTasks={(nextTasks) =>
          selectedProject && handleReorderTasks(selectedProject.id, nextTasks)
        }
        onMarkAllTasksDone={() =>
          selectedProject && handleMarkAllTasksDone(selectedProject.id)
        }
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete project"
        description="This will delete the project and all its tasks."
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            handleDeleteProject(confirmDelete);
          }
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
