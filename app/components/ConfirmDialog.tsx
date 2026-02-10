'use client';

export default function ConfirmDialog({
  open,
  title,
  description,
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-sm rounded-2xl border border-board-700 bg-board-900 p-6 shadow-glow">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-board-300 mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg border border-board-700 px-4 py-2 text-sm text-board-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
