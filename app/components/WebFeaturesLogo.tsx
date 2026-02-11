'use client';

import { useState } from 'react';

export default function WebFeaturesLogo({ compact = false }: { compact?: boolean }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src="/app/Untitled-design.png"
        alt="Web Features"
        className={compact ? 'h-8 w-auto' : 'h-20 w-auto'}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="select-none text-white leading-none">
      <div
        className={compact ? 'text-[18px] font-extrabold tracking-[0.08em]' : 'text-[34px] font-extrabold tracking-[0.1em]'}
      >
        WEB.
      </div>
      <div
        className={compact ? 'mt-0.5 text-[11px] font-semibold tracking-[0.14em]' : 'mt-1 text-[18px] font-semibold tracking-[0.14em]'}
      >
        {'</FEATURES>'}
      </div>
    </div>
  );
}
