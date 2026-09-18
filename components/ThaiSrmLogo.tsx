import React from 'react';

export function TsrmLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-1 flex items-center justify-center shadow-md border border-slate-100 overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/tsrm-logoPNG.png"
        alt="TSRM Logo"
        onError={(e) => {
          if (!e.currentTarget.dataset.fallback) {
            e.currentTarget.dataset.fallback = 'true';
            e.currentTarget.src = '/logoPNG.png';
          }
        }}
        className="w-full h-full object-contain rounded-xl"
      />
    </div>
  );
}

// Aliases for flexible naming
export const ThaiSrmLogo = TsrmLogo;
export const ThaisrmLogo = TsrmLogo;
export const Tsrmlogo = TsrmLogo;
export const BornIvfLogo = TsrmLogo;
