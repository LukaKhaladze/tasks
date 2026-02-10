'use client';

export default function SavingIndicator({ saving }: { saving: boolean }) {
  if (!saving) return null;
  return (
    <div className="fixed top-5 right-6 z-40 rounded-full bg-board-800/90 border border-board-700 px-3 py-1 text-xs text-board-200">
      Saving...
    </div>
  );
}
