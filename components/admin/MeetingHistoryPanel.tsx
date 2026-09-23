'use client';

import React, { useState, useMemo } from 'react';
import { AdminTab } from '@/components/AdminNavbar';
import { MeetingItem } from './types';
import {
  ClipboardList,
  FileSpreadsheet,
  Search,
  X,
  CalendarDays,
  MapPin,
  UserCheck,
  DollarSign,
  Pencil,
  Trash2,
} from 'lucide-react';

/* ─── 3. MEETING HISTORY & MANAGEMENT PANEL (Light Theme) ─────────────────── */

export interface MeetingHistoryPanelProps {
  meetings: MeetingItem[];
  onNavigateTab?: (tab: AdminTab, meetingId?: string) => void;
  onUpdateStatus?: (id: string, status: 'upcoming' | 'ongoing' | 'completed') => void;
  onDeleteMeeting?: (id: string) => void;
  onEditMeeting?: (meeting: MeetingItem) => void;
}

export function MeetingHistoryPanel({
  meetings,
  onNavigateTab,
  onUpdateStatus,
  onDeleteMeeting,
  onEditMeeting,
}: MeetingHistoryPanelProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');

  const filteredMeetings = useMemo(() => {
    return meetings
      .filter((m) => {
        const matchText =
          m.titleTh.toLowerCase().includes(search.toLowerCase()) ||
          m.location.toLowerCase().includes(search.toLowerCase()) ||
          m.id.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'all' || m.status === filterStatus;
        return matchText && matchStatus;
      })
      .sort((a, b) => {
        const STATUS_PRIORITY: Record<string, number> = { ongoing: 1, upcoming: 2, completed: 3 };
        const pA = STATUS_PRIORITY[a.status] || 99;
        const pB = STATUS_PRIORITY[b.status] || 99;
        if (pA !== pB) return pA - pB;
        const numA = parseInt((a.id.match(/\d+/) || ['0'])[0], 10);
        const numB = parseInt((b.id.match(/\d+/) || ['0'])[0], 10);
        if (numA !== numB) return numB - numA;
        return b.id.localeCompare(a.id);
      });
  }, [meetings, search, filterStatus]);

  const handleExportMeetingsExcel = () => {
    const headers = [
      'รหัสโครงการ',
      'ชื่อการประชุม (ไทย)',
      'ชื่อการประชุม (อังกฤษ)',
      'รูปแบบ',
      'วันที่',
      'เวลา',
      'สถานที่',
      'ที่นั่งสูงสุด',
      'ลงทะเบียน (คน)',
      'เช็คอิน (คน)',
      'รายได้ (บาท)',
      'สถานะ',
    ];
    const rows = filteredMeetings.map((m) => [
      m.id,
      `"${m.titleTh}"`,
      `"${m.titleEn}"`,
      m.type,
      `"${m.date}"`,
      `"${m.time}"`,
      `"${m.location}"`,
      m.maxSeats,
      m.registered,
      m.attended,
      m.revenue,
      m.status === 'ongoing' ? 'กำลังจัดงาน' : m.status === 'upcoming' ? 'รอเริ่มงาน' : 'เสร็จสิ้น',
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `meetings_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0026b3] text-xs font-bold mb-2">
            <ClipboardList className="w-4 h-4 text-[#0026b3]" />
            <span>ระบบติดตามและประวัติการประชุมทั้งหมด</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">ประวัติและการจัดการประชุม</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            ดูสถิติผู้เข้าร่วม อัตราการเช็คอิน และรายได้ของการประชุมแต่ละรอบ ({filteredMeetings.length} โครงการ)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportMeetingsExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel ({filteredMeetings.length})</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 w-full sm:w-80 shadow-xs focus-within:ring-2 focus-within:ring-[#0026b3]/20 focus-within:border-[#0026b3]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อการประชุม หรือสถานที่..."
            className="bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 p-0.5">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: `ทั้งหมด (${meetings.length})` },
            { id: 'ongoing', label: `กำลังจัด (${meetings.filter((m) => m.status === 'ongoing').length})` },
            { id: 'upcoming', label: `รอเริ่มงาน (${meetings.filter((m) => m.status === 'upcoming').length})` },
            { id: 'completed', label: `เสร็จสิ้น (${meetings.filter((m) => m.status === 'completed').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as any)}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                filterStatus === tab.id
                  ? 'bg-[#0026b3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meetings List */}
      <div className="space-y-4">
        {filteredMeetings.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-2 shadow-xs">
            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-base font-bold text-slate-800">ไม่พบโครงการการประชุมตามเงื่อนไข</div>
            <p className="text-xs text-slate-500">กรุณาลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองสถานะอื่น</p>
          </div>
        ) : (
          filteredMeetings.map((m) => {
            const attendancePercent = m.registered > 0 ? Math.round((m.attended / m.registered) * 100) : 0;
            return (
              <div
                key={m.id}
                className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-[#0026b3] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {m.id}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                          m.status === 'ongoing'
                            ? 'bg-[#4ade80]/15 text-emerald-800 border-[#4ade80]/40'
                            : m.status === 'upcoming'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {m.status === 'ongoing' ? '● กำลังดำเนินการ' : m.status === 'upcoming' ? 'รอเริ่มงาน' : 'เสร็จสิ้น'}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#0026b3] border border-blue-200 uppercase">
                        {m.type}
                      </span>
                      {m.staffCode ? (
                        <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          Staff PIN: {m.staffCode}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          ยังไม่ได้ตั้ง Staff PIN
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900">{m.titleTh}</h3>
                    <div className="text-xs text-slate-500 font-medium">{m.titleEn}</div>
                    <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-600 flex-wrap pt-1">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-[#0026b3]" /> {m.date} ({m.time})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#0026b3]" /> {m.location}
                      </span>
                    </div>

                    {/* Course / Activities format pills */}
                    {m.activities && Array.isArray(m.activities) && m.activities.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
                        {m.activities.map((act: any, aIdx: number) => {
                          const isOnline = act.format === 'online';
                          const isBoth = act.format === 'both';
                          return (
                            <span
                              key={act.id || aIdx}
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                                isOnline
                                  ? 'bg-blue-50 text-[#0026b3] border-blue-200'
                                  : isBoth
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              <span>{act.type === 'main' ? '📋' : '🔬'}</span>
                              <span className="font-bold">{act.name}</span>
                              <span className="text-[10px] font-extrabold px-1 rounded bg-white/70">
                                {isOnline ? 'Online' : isBoth ? 'Hybrid' : 'Onsite'}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 shrink-0 text-center">
                    <div>
                      <div className="text-[11px] sm:text-xs text-slate-500 font-medium">ลงทะเบียน</div>
                      <div className="text-sm sm:text-lg font-extrabold text-slate-900">
                        {m.registered}/{m.maxSeats}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] sm:text-xs text-slate-500 font-medium">เช็คอินเข้างาน</div>
                      <div className="text-sm sm:text-lg font-extrabold text-emerald-700">
                        {m.attended} <span className="text-[11px] font-normal">({attendancePercent}%)</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] sm:text-xs text-slate-500 font-medium">ยอดเงินรวม</div>
                      <div className="text-sm sm:text-lg font-extrabold text-slate-900">
                        ฿{(m.revenue / 1000).toFixed(0)}k
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-xs sm:text-sm text-slate-600 font-medium">
                    <span>ความคืบหน้าการเช็คอินเข้างาน ({m.attended}/{m.registered} ที่นั่ง)</span>
                    <span className="font-bold text-emerald-700">{attendancePercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-[#4ade80] rounded-full transition-all duration-500"
                      style={{ width: `${attendancePercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Management Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">เปลี่ยนสถานะ:</span>
                    <select
                      value={m.status}
                      onChange={(e) => onUpdateStatus?.(m.id, e.target.value as any)}
                      className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 cursor-pointer focus:outline-none focus:border-[#0026b3]"
                    >
                      <option value="upcoming">รอเริ่มงาน</option>
                      <option value="ongoing">กำลังดำเนินการ</option>
                      <option value="completed">เสร็จสิ้นแล้ว</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
                    {onNavigateTab && (
                      <>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('verify-attendees', m.id)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0026b3] text-xs font-bold border border-blue-200 transition cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>ดูผู้เข้าร่วม</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('revenue-report', m.id)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer"
                        >
                          <DollarSign className="w-3.5 h-3.5 shrink-0" />
                          <span>รายงานรายได้</span>
                        </button>
                      </>
                    )}
                    {onEditMeeting && (
                      <button
                        type="button"
                        onClick={() => onEditMeeting(m)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition cursor-pointer"
                        title="แก้ไขการประชุม"
                      >
                        <Pencil className="w-3.5 h-3.5 shrink-0" />
                        <span>แก้ไข</span>
                      </button>
                    )}
                    {onDeleteMeeting && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`ยืนยันการลบโครงการประชุม "${m.titleTh}"?`)) {
                            onDeleteMeeting(m.id);
                          }
                        }}
                        className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition cursor-pointer"
                        title="ลบโครงการ"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>ลบ</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
