'use client';

import React from 'react';
import { TopNavbar } from '@/components/TopNavbar';
import { StaffScannerView } from '@/components/views/StaffScannerView';

export default function StaffScanPage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-start selection:bg-[#4ade80] selection:text-slate-900 font-sans">
      <main className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl min-h-screen bg-[#f6f8fc] shadow-2xl flex flex-col justify-between relative border-x border-slate-200/80 overflow-hidden transition-all duration-300">
        <TopNavbar />
        <StaffScannerView />
      </main>
    </div>
  );
}
