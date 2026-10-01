'use client';

import React, { useState, useMemo } from 'react';
import { AdminPageHeader, HeaderButton } from './AdminPageHeader';
import { Btn, IconBtn, Panel, EmptyState, StatGrid, StatCard, Toolbar, ToolbarGroup, SearchInput, Segmented } from './ui';
import { AdminTab } from '@/components/AdminNavbar';
import { MeetingItem } from './types';
import {
  ClipboardList,
  FileSpreadsheet,
  CheckCircle2,
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

  const countByStatus = (status: MeetingItem['status']) => meetings.filter((m) => m.status === status).length;

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
      <AdminPageHeader
        tab="meeting-history"
        title="ประวัติและการจัดการประชุม"
        description={`ดูสถิติผู้เข้าร่วม อัตราการเช็คอิน และรายได้ของการประชุมแต่ละรอบ (${filteredMeetings.length} โครงการ)`}
        actions={
          <HeaderButton icon={FileSpreadsheet} onClick={handleExportMeetingsExcel}>
            Export Excel ({filteredMeetings.length})
          </HeaderButton>
        }
      />

      <StatGrid>
        <StatCard label="โครงการทั้งหมด" value={meetings.length} unit="โครงการ" icon={ClipboardList} tone="blue" />
        <StatCard label="กำลังจัดงาน" value={countByStatus('ongoing')} unit="โครงการ" icon={CalendarDays} tone="green" />
        <StatCard label="รอเริ่มงาน" value={countByStatus('upcoming')} unit="โครงการ" icon={CalendarDays} tone="amber" />
        <StatCard label="เสร็จสิ้นแล้ว" value={countByStatus('completed')} unit="โครงการ" icon={CheckCircle2} tone="slate" />
      </StatGrid>

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาชื่อการประชุม หรือสถานที่..." />
        <ToolbarGroup>
          <Segmented
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { id: 'all', label: 'ทั้งหมด', count: meetings.length },
              { id: 'ongoing', label: 'กำลังจัด', count: countByStatus('ongoing') },
              { id: 'upcoming', label: 'รอเริ่มงาน', count: countByStatus('upcoming') },
              { id: 'completed', label: 'เสร็จสิ้น', count: countByStatus('completed') },
            ]}
          />
        </ToolbarGroup>
      </Toolbar>

      {/* Meetings List */}
      <div className="space-y-4">
        {filteredMeetings.length === 0 ? (
          <Panel>
            <EmptyState
              icon={ClipboardList}
              title="ไม่พบโครงการการประชุมตามเงื่อนไข"
              description="ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองสถานะอื่น"
            />
          </Panel>
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
                              {typeof act.usedSeats === 'number' && Number(act.maxSeats) > 0 && (
                                <span
                                  className={`text-[10px] font-extrabold px-1 rounded ${
                                    act.usedSeats >= act.maxSeats ? 'bg-rose-100 text-rose-700' : 'bg-white/70'
                                  }`}
                                  title="ที่นั่งที่ใช้แล้ว รวมรายการที่รอตรวจสอบ"
                                >
                                  {act.usedSeats}/{act.maxSeats} ที่นั่ง
                                </span>
                              )}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <label className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">สถานะงาน</span>
                    <select
                      value={m.status}
                      onChange={(e) => onUpdateStatus?.(m.id, e.target.value as any)}
                      className="text-xs font-bold bg-white border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3]"
                    >
                      <option value="upcoming">รอเริ่มงาน</option>
                      <option value="ongoing">กำลังดำเนินการ</option>
                      <option value="completed">เสร็จสิ้นแล้ว</option>
                    </select>
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    {onNavigateTab && (
                      <>
                        <Btn size="sm" variant="soft" icon={UserCheck} onClick={() => onNavigateTab('verify-attendees', m.id)}>
                          ดูผู้เข้าร่วม
                        </Btn>
                        <Btn size="sm" icon={DollarSign} onClick={() => onNavigateTab('revenue-report', m.id)}>
                          รายงานรายได้
                        </Btn>
                      </>
                    )}
                    {onEditMeeting && (
                      <Btn size="sm" variant="warning" icon={Pencil} onClick={() => onEditMeeting(m)}>
                        แก้ไข
                      </Btn>
                    )}
                    {onDeleteMeeting && (
                      <IconBtn
                        icon={Trash2}
                        tone="rose"
                        label="ลบโครงการ"
                        onClick={() => {
                          if (confirm(`ยืนยันการลบโครงการประชุม "${m.titleTh}"?`)) {
                            onDeleteMeeting(m.id);
                          }
                        }}
                      />
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
