import React from 'react';
import { Metadata } from 'next';
import { TopNavbar } from '@/components/TopNavbar';
import { AgendaView } from '@/components/views/AgendaView';

export const metadata: Metadata = {
  title: 'วาระการประชุม & ประชาสัมพันธ์ | TSRM Annual Congress 2026',
  description: 'กำหนดการและวาระการประชุมวิชาการประจำปี สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (THAISRM)',
};

export default function AgendaPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col items-stretch selection:bg-[#4ade80] selection:text-slate-900 font-sans">
      {/* Top Navbar applied specifically to Agenda Page as requested */}
      <TopNavbar />

      {/* Main Agenda & PR Portal View */}
      <div className="flex-1 flex flex-col">
        <AgendaView />
      </div>
    </div>
  );
}
