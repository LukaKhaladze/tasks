'use client';

import { useEffect } from 'react';

export type ToastMessage = {
  id: string;
  type: 'error' | 'info';
  message: string;
};

export default function Toast({
  toasts,
  onRemove
}: {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}) {
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((toast) =>
      setTimeout(() => onRemove(toast.id), 3200)
    );
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [toasts, onRemove]);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg border px-4 py-3 text-sm shadow-glow backdrop-blur ${
            toast.type === 'error'
              ? 'bg-red-500/20 border-red-400/40 text-red-100'
              : 'bg-board-800/80 border-board-600/50 text-board-100'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
