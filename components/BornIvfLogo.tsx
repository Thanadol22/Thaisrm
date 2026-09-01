import React from 'react';

export function BornIvfLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-1 flex items-center justify-center shadow-md border border-slate-100 overflow-hidden ${className}`}>
      <img
        src="/tsrm-logoPNG.png"
        alt="THAISRM Logo"
        className="w-full h-full object-contain rounded-xl"
      />
    </div>
  );
}
