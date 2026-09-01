'use client';

import React from 'react';
import { TopNavbar } from '@/components/TopNavbar';
import { StaffScannerView } from '@/components/views/StaffScannerView';

export default function StaffScanPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-start font-sans">
      <main className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl min-h-screen bg-slate-900 shadow-2xl flex flex-col justify-between relative border-x border-slate-800 overflow-hidden transition-all duration-300">
        <TopNavbar />
        <StaffScannerView />
      </main>
    </div>
  );
}
