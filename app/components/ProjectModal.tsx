'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Project, Task, Profile } from '@/lib/types';

function SortableTask({
  task,
  onToggle,
  onDelete,
  onEdit,
  disabled
}: {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onEdit: (task: Task, text: string) => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-board-700 bg-board-850 px-3 py-2"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(task)}
        className={`h-5 w-5 rounded border ${
          task.done ? 'bg-green-500 border-green-400' : 'border-board-600'
        }`}
      />
      <input
        value={task.text}
        disabled={disabled}
        onChange={(event) => onEdit(task, event.target.value)}
        className={`flex-1 bg-transparent text-sm text-board-100 outline-none ${
          task.done ? 'line-through text-board-400' : ''
        }`}
      />
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-board-400 text-xs"
      >
        drag
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDelete(task)}
        className="text-red-400 text-xs"
      >
        delete
      </button>
    </div>
  );
}

export default function ProjectModal({
  open,
  project,
  tasks,
  profiles,
  canEdit,
  onClose,
  onUpdateProject,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
  onMarkAllTasksDone
}: {
  open: boolean;
  project: Project | null;
  tasks: Task[];
  profiles: Profile[];
  canEdit: boolean;
  onClose: () => void;
  onUpdateProject: (project: Project) => void;
  onAddTask: (text: string) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onReorderTasks: (tasks: Task[]) => void;
  onMarkAllTasksDone: () => void;
}) {
  const [newTask, setNewTask] = useState('');
  const sensors = useSensors(useSensor(PointerSensor));

  const sortedTasks = useMemo(
    () => tasks.slice().sort((a, b) => a.sort_order - b.sort_order),
    [tasks]
  );

  if (!open || !project) return null;

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedTasks.findIndex((task) => task.id === active.id);
    const newIndex = sortedTasks.findIndex((task) => task.id === over.id);
    const nextTasks = arrayMove(sortedTasks, oldIndex, newIndex).map(
      (task, index) => ({ ...task, sort_order: index })
    );
    onReorderTasks(nextTasks);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-3xl rounded-2xl border border-board-700 bg-board-900 p-6 shadow-glow max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <input
              value={project.title}
              disabled={!canEdit}
              onChange={(event) =>
                onUpdateProject({ ...project, title: event.target.value })
              }
              className="w-full bg-transparent text-2xl font-semibold outline-none"
            />
            <textarea
              value={project.description ?? ''}
              disabled={!canEdit}
              onChange={(event) =>
                onUpdateProject({
                  ...project,
                  description: event.target.value
                })
              }
              className="w-full rounded-lg bg-board-850 border border-board-700 px-3 py-2 text-sm text-board-200"
              rows={3}
              placeholder="Add a description..."
            />
          </div>
          <button
            onClick={onClose}
            className="text-board-300 hover:text-white"
          >
            close
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="space-y-2">
            <p className="text-xs uppercase text-board-400">Assigned</p>
            <select
              value={project.assigned_user_id ?? ''}
              disabled={!canEdit}
              onChange={(event) =>
                onUpdateProject({
                  ...project,
                  assigned_user_id: event.target.value || null
                })
              }
              className="w-full rounded-lg bg-board-850 border border-board-700 px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.email ?? profile.id}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase text-board-400">Deadline</p>
            <input
              type="date"
              value={project.deadline ?? ''}
              disabled={!canEdit}
              onChange={(event) =>
                onUpdateProject({
                  ...project,
                  deadline: event.target.value || null
                })
              }
              className="w-full rounded-lg bg-board-850 border border-board-700 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase text-board-400">Link</p>
            <input
              value={project.link ?? ''}
              disabled={!canEdit}
              onChange={(event) =>
                onUpdateProject({
                  ...project,
                  link: event.target.value
                })
              }
              className="w-full rounded-lg bg-board-850 border border-board-700 px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tasks</h3>
          <button
            onClick={onMarkAllTasksDone}
            disabled={!canEdit}
            className="rounded-lg border border-board-700 px-3 py-1 text-xs text-board-300"
          >
            Mark all done
          </button>
        </div>
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <input
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
              placeholder="New task"
              className="flex-1 rounded-lg bg-board-850 border border-board-700 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={!newTask.trim() || !canEdit}
              onClick={() => {
                onAddTask(newTask.trim());
                setNewTask('');
              }}
              className="rounded-lg bg-accent-500 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sortedTasks.map((task) => (
                  <SortableTask
                    key={task.id}
                    task={task}
                    disabled={!canEdit}
                    onToggle={(current) =>
                      onUpdateTask({ ...current, done: !current.done })
                    }
                    onEdit={(current, text) => onUpdateTask({ ...current, text })}
                    onDelete={onDeleteTask}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
