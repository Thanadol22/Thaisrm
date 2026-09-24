'use client';

import React, { useState, useMemo } from 'react';
import { AdminTab } from '@/components/AdminNavbar';
import { MeetingItem, SlipItem, AttendeeItem } from './types';
import {
  CalendarDays,
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  Receipt,
  Sparkles,
  PlusCircle,
  Filter,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Clock,
  ClipboardList,
  MapPin,
  Calendar,
  Pencil,
  PieChart,
} from 'lucide-react';

/* ─── 1. OVERVIEW DASHBOARD PANEL (Light Theme) ──────────────────────────── */

export interface DashboardOverviewProps {
  onNavigateTab: (tab: AdminTab, meetingId?: string) => void;
  meetings: MeetingItem[];
  slips: SlipItem[];
  attendees: AttendeeItem[];
  onEditMeeting?: (meeting: MeetingItem) => void;
}

export function DashboardOverviewPanel({
  onNavigateTab,
  meetings,
  slips,
  attendees,
  onEditMeeting,
}: DashboardOverviewProps) {
  // Find current ongoing meeting (or first upcoming, or fallback to first meeting)
  const currentOngoingMeeting = useMemo(() => {
    return (
      meetings.find((m) => m.status === 'ongoing') ||
      meetings.find((m) => m.status === 'upcoming') ||
      meetings[0]
    );
  }, [meetings]);

  // Selected meeting round on dashboard (defaults to current ongoing round, or 'all')
  const [selectedDashboardMeetingId, setSelectedDashboardMeetingId] = useState<string>('default');

  const activeMeetingId =
    selectedDashboardMeetingId === 'default'
      ? currentOngoingMeeting
        ? currentOngoingMeeting.id
        : 'all'
      : selectedDashboardMeetingId;

  const currentSelectedMeeting = meetings.find((m) => m.id === activeMeetingId);

  // Filter attendees & slips by the active meeting selection
  const displayedAttendees = useMemo(() => {
    if (activeMeetingId === 'all') return attendees;
    return attendees.filter(
      (a) =>
        a.meetingId === activeMeetingId ||
        (currentSelectedMeeting && a.meetingTitle === currentSelectedMeeting.titleTh)
    );
  }, [attendees, activeMeetingId, currentSelectedMeeting]);

  const displayedSlips = useMemo(() => {
    if (activeMeetingId === 'all') return slips;
    return slips.filter((s) => s.meetingId === activeMeetingId);
  }, [slips, activeMeetingId]);

  const pendingSlips = useMemo(() => displayedSlips.filter((s) => s.status === 'pending'), [displayedSlips]);
  const approvedSlips = useMemo(() => displayedSlips.filter((s) => s.status === 'approved'), [displayedSlips]);
  const totalRevenue = useMemo(() => approvedSlips.reduce((sum, s) => sum + s.amount, 0), [approvedSlips]);
  const totalRegistered = displayedAttendees.length;
  const checkedInAttendees = useMemo(
    () => displayedAttendees.filter((a) => a.checkInStatus === 'checked_in'),
    [displayedAttendees]
  );
  const totalAttended = checkedInAttendees.length;
  const checkInRate = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;
  const ongoingMeetingsCount = useMemo(() => meetings.filter((m) => m.status === 'ongoing').length, [meetings]);

  // 1. Dynamic check-in time slots calculation from real attendees
  const checkInTimeSlots = useMemo(() => {
    if (checkedInAttendees.length === 0) return [];

    const slotBuckets = [
      { key: '07:30 - 08:00 น.', label: '07:30 - 08:00 น.', count: 0 },
      { key: '08:00 - 08:30 น.', label: '08:00 - 08:30 น.', count: 0 },
      { key: '08:30 - 09:00 น.', label: '08:30 - 09:00 น.', count: 0 },
      { key: '09:00 - 09:30 น.', label: '09:00 - 09:30 น.', count: 0 },
      { key: '09:30 - 10:00 น.', label: '09:30 - 10:00 น.', count: 0 },
      { key: '10:00 - 12:00 น.', label: '10:00 - 12:00 น.', count: 0 },
      { key: '12:00 - 17:00 น.', label: '12:00 - 17:00 น.', count: 0 },
    ];

    checkedInAttendees.forEach((a) => {
      const timeStr = a.checkInTime || '';
      const match = timeStr.match(/(\d{1,2})[:.](\d{2})/);
      if (match) {
        const hour = parseInt(match[1], 10);
        const min = parseInt(match[2], 10);
        const totalMins = hour * 60 + min;

        if (totalMins < 8 * 60) slotBuckets[0].count++;
        else if (totalMins < 8 * 60 + 30) slotBuckets[1].count++;
        else if (totalMins < 9 * 60) slotBuckets[2].count++;
        else if (totalMins < 9 * 60 + 30) slotBuckets[3].count++;
        else if (totalMins < 10 * 60) slotBuckets[4].count++;
        else if (totalMins < 12 * 60) slotBuckets[5].count++;
        else slotBuckets[6].count++;
      } else {
        slotBuckets[2].count++;
      }
    });

    const activeSlots = slotBuckets.filter((s) => s.count > 0);
    if (activeSlots.length === 0) return [];

    const maxCount = Math.max(...activeSlots.map((s) => s.count), 1);
    return activeSlots.map((s) => ({
      time: s.label,
      count: s.count,
      percent: `${Math.round((s.count / maxCount) * 100)}%`,
      highlight: s.count === maxCount && s.count > 0,
    }));
  }, [checkedInAttendees]);

  // 2. Dynamic Member Type Proportions calculation from real attendees
  const memberProportions = useMemo(() => {
    if (displayedAttendees.length === 0) return [];

    const typeMap = new Map<string, number>();
    displayedAttendees.forEach((a) => {
      const type = a.memberType || 'สมาชิกทั่วไป';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });

    const COLORS = ['bg-[#0026b3]', 'bg-[#4ade80]', 'bg-[#0284c7]', 'bg-amber-500', 'bg-rose-500', 'bg-purple-600'];

    return Array.from(typeMap.entries()).map(([label, count], idx) => ({
      label,
      count,
      percent: `${Math.round((count / displayedAttendees.length) * 100)}%`,
      color: COLORS[idx % COLORS.length],
    }));
  }, [displayedAttendees]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner (TSRM Brand Primary & Accent Green) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white p-5 sm:p-8 shadow-xl">
        {/* Subtle Background Glow Spheres */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 -left-12 w-44 h-44 bg-[#4ade80]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-[#4ade80] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>ระบบบริหารจัดการประชุมสมาคม TSRM</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              ภาพรวมแดชบอร์ดผู้ดูแลระบบ
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-blue-100 leading-relaxed font-medium text-pretty break-words">
              สรุปผลการจัดงาน สถิติผู้เข้าร่วมงาน ยอดชำระเงิน และการตรวจสอบการชำระเงินแบบเรียลไทม์
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              onClick={() => onNavigateTab('add-meeting')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4ade80] hover:bg-[#3ecb72] text-slate-950 text-xs sm:text-sm font-black shadow-lg shadow-[#4ade80]/20 transition active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>สร้างการประชุมใหม่</span>
            </button>
            <button
              onClick={() => onNavigateTab('verify-slip')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs sm:text-sm font-bold backdrop-blur-md shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-[#4ade80]" />
              <span>ตรวจสอบการชำระเงิน ({pendingSlips.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Meeting Round Selector Filter Bar (Defaults to Ongoing Round) ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <Filter className="w-5 h-5 text-[#0026b3]" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2 flex-wrap">
                <span>เลือกรอบการประชุมเพื่อดูสถิติ:</span>
                {currentSelectedMeeting && currentSelectedMeeting.status === 'ongoing' && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ● รอบปัจจุบัน (กำลังจัดงาน)
                  </span>
                )}
                {activeMeetingId === 'all' && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0026b3] border border-blue-200">
                    🌐 ทุกรอบรวมกัน
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xl">
                {activeMeetingId === 'all'
                  ? `รวมสถิติจากทุกรอบการประชุมในระบบ (${meetings.length} โครงการ)`
                  : `กำลังแสดงข้อมูล: ${currentSelectedMeeting?.titleTh || activeMeetingId} (${currentSelectedMeeting?.date || ''})`}
              </p>
            </div>
          </div>

          <div className="relative shrink-0">
            <select
              value={activeMeetingId}
              onChange={(e) => setSelectedDashboardMeetingId(e.target.value)}
              className="w-full md:w-auto min-w-[280px] appearance-none bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm font-bold rounded-xl pl-9 pr-9 py-2.5 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition cursor-pointer shadow-xs"
            >
              {meetings.map((m) => {
                const isOngoing = m.status === 'ongoing';
                return (
                  <option key={m.id} value={m.id}>
                    {isOngoing ? '🟢 [รอบปัจจุบัน] ' : '📅 '}
                    [{m.id}] {m.titleTh}
                  </option>
                );
              })}
              <option value="all">🌐 รวมทุกรอบการประชุม (รวม {attendees.length} คน)</option>
            </select>
            <CalendarDays className="w-4 h-4 text-[#0026b3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 4 Core KPI Summary Cards (Brand Primary & Accent High Contrast) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Meetings */}
        <div
          onClick={() => onNavigateTab('meeting-history')}
          className="group cursor-pointer bg-white hover:bg-blue-50/40 border border-slate-200/90 hover:border-[#0026b3]/40 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-600">การประชุมทั้งหมด</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{meetings.length}</span>
            <span className="text-sm font-medium text-slate-500">โครงการ</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs sm:text-sm pt-3 border-t border-slate-100">
            <span className="text-emerald-700 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4ade80]"></span>
              {ongoingMeetingsCount > 0 ? `กำลังจัดงาน ${ongoingMeetingsCount} โครงการ` : 'ไม่มีงานกำลังจัด'}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Total Registered */}
        <div
          onClick={() => onNavigateTab('verify-attendees', activeMeetingId !== 'all' ? activeMeetingId : undefined)}
          className="group cursor-pointer bg-white hover:bg-blue-50/40 border border-slate-200/90 hover:border-[#0026b3]/40 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-600">
              {activeMeetingId === 'all' ? 'ผู้ลงทะเบียนทั้งหมด' : 'ผู้ลงทะเบียนในรอบนี้'}
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalRegistered.toLocaleString()}</span>
            <span className="text-sm font-medium text-slate-500">ที่นั่ง</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs sm:text-sm pt-3 border-t border-slate-100">
            <span className="text-[#0026b3] font-bold flex items-center gap-1 truncate max-w-[200px]">
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span className="truncate">{activeMeetingId === 'all' ? `รวม ${meetings.length} รอบ` : currentSelectedMeeting?.titleTh}</span>
            </span>
          </div>
        </div>

        {/* Card 3: Live Checked-in */}
        <div
          onClick={() => onNavigateTab('verify-attendees', activeMeetingId !== 'all' ? activeMeetingId : undefined)}
          className="group cursor-pointer bg-white hover:bg-emerald-50/40 border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-600">เช็คอินเข้างานแล้ว</span>
            <div className="p-2.5 rounded-xl bg-[#4ade80]/20 text-emerald-800 border border-[#4ade80]/40">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalAttended.toLocaleString()}</span>
            <span className="text-sm font-bold text-emerald-700">({checkInRate}%)</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-[#4ade80] rounded-full transition-all duration-700"
                style={{ width: `${checkInRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 4: Revenue & Slips */}
        <div
          onClick={() => onNavigateTab('verify-slip')}
          className="group cursor-pointer bg-white hover:bg-amber-50/40 border border-slate-200/90 hover:border-amber-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-600">ยอดชำระเงินรวม</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-amber-700">฿</span>
            <span className="text-3xl font-extrabold text-slate-900">{(totalRevenue / 1000000).toFixed(2)}M</span>
            <span className="text-xs sm:text-sm font-normal text-slate-500">({totalRevenue.toLocaleString()} ฿)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs sm:text-sm pt-3 border-t border-slate-100">
            <span className="text-amber-800 font-bold flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-amber-600" />
              รอตรวจสลิป {pendingSlips.length} รายการ
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Main Analytics Content Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Check-in Time distribution & Recent Meetings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Peak Hours Check-in Chart */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="space-y-0.5">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#0026b3]" />
                  สถิติการเช็คอินตามช่วงเวลา
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">แสดงความหนาแน่นของผู้เข้าร่วมงานที่สแกนเช็คอินในแต่ละช่วงเวลา</p>
              </div>
            </div>

            {/* Dynamic Check-in Visualization or Empty State */}
            {checkInTimeSlots.length > 0 ? (
              <div className="pt-3 pb-1 space-y-3.5">
                {checkInTimeSlots.map((slot) => (
                  <div key={slot.time} className="space-y-1.5">
                    <div className="flex justify-between text-xs sm:text-sm font-bold">
                      <span className="text-slate-700">{slot.time}</span>
                      <span className={slot.highlight ? 'text-emerald-700 font-extrabold' : 'text-slate-600'}>
                        {slot.count} คน {slot.highlight && '(ช่วงคนหนาแน่นสูงสุด)'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200/80">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          slot.highlight
                            ? 'bg-gradient-to-r from-[#0026b3] via-emerald-500 to-[#4ade80]'
                            : 'bg-[#0026b3]'
                        }`}
                        style={{ width: slot.percent }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-1.5">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs sm:text-sm font-bold text-slate-600">ยังไม่มีข้อมูลการเช็คอินหน้างานในขณะนี้</p>
                <p className="text-[11px] text-slate-400">ระบบจะแสดงความหนาแน่นของช่วงเวลาเมื่อมีผู้เข้าร่วมสแกน QR Code เช็คอิน</p>
              </div>
            )}

            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 pt-3 border-t border-slate-100 flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#0026b3]" />
                เช็คอินแล้ว {totalAttended} จาก {totalRegistered} คน
              </span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#4ade80]"></span>
                อัตราการเข้าร่วม {checkInRate}%
              </span>
            </div>
          </div>

          {/* Active / Current Meetings Summary */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#0026b3]" />
                สถานะการประชุมสำคัญ
              </h3>
              <button
                onClick={() => onNavigateTab('meeting-history')}
                className="text-xs sm:text-sm font-bold text-[#0026b3] hover:text-[#001f94] flex items-center gap-1 cursor-pointer"
              >
                ดูทั้งหมด <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {meetings.length > 0 ? (
              <div className="space-y-3">
                {meetings.slice(0, 2).map((m) => (
                  <div
                    key={m.id}
                    className="bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded-xl p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            m.status === 'ongoing'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : m.status === 'upcoming'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {m.status === 'ongoing' ? '● กำลังจัดประชุม' : m.status === 'upcoming' ? 'เร็วๆ นี้' : 'เสร็จสิ้น'}
                        </span>
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#0026b3]" /> {m.date}
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">{m.titleTh}</h4>
                      <p className="text-xs sm:text-sm text-slate-500 truncate flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {m.location}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 sm:border-l sm:border-slate-200 sm:pl-4">
                      <div className="text-right">
                        <div className="text-xs text-slate-500">เช็คอิน/ที่นั่ง</div>
                        <div className="text-sm sm:text-base font-extrabold text-slate-900">
                          {m.attended}/{m.registered}{' '}
                          <span className="text-xs font-medium text-slate-500">
                            ({m.registered > 0 ? Math.round((m.attended / m.registered) * 100) : 0}%)
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">ยอดเงินรวม</div>
                        <div className="text-sm sm:text-base font-extrabold text-emerald-700">
                          ฿{m.revenue.toLocaleString()}
                        </div>
                      </div>
                      {onEditMeeting && (
                        <button
                          type="button"
                          onClick={() => onEditMeeting(m)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition cursor-pointer"
                          title="แก้ไขการประชุม"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>แก้ไข</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {meetings.length > 2 && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('meeting-history')}
                    className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50/60 hover:border-blue-200 text-xs sm:text-sm font-bold text-slate-600 hover:text-[#0026b3] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>ดูรายการประชุมทั้งหมด ({meetings.length} โครงการ)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs sm:text-sm font-bold text-slate-600">ยังไม่มีโครงการประชุมในระบบ</p>
                <button
                  onClick={() => onNavigateTab('add-meeting')}
                  className="text-xs text-[#0026b3] font-bold hover:underline"
                >
                  + สร้างการประชุมใหม่
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 span): Membership Distribution & Recent Activity */}
        <div className="space-y-6">
          {/* Member Type Breakdown */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#0026b3]" />
              สัดส่วนประเภทสมาชิก
            </h3>

            {memberProportions.length > 0 ? (
              <div className="space-y-3 pt-1">
                {memberProportions.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs sm:text-sm font-bold">
                      <span className="text-slate-700 truncate">{item.label}</span>
                      <span className="text-slate-900 shrink-0 ml-2">
                        {item.count} คน ({item.percent})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: item.percent }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-1.5">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs sm:text-sm font-bold text-slate-600">ยังไม่มีข้อมูลผู้ลงทะเบียนในระบบ</p>
                <p className="text-[11px] text-slate-400">สัดส่วนประเภทสมาชิกจะคำนวณจากผู้ลงทะเบียนจริงในฐานข้อมูล</p>
              </div>
            )}
          </div>

          {/* Quick Shortcuts / Recent Activity */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0026b3]" />
              รายการดำเนินการด่วน
            </h3>

            <div className="space-y-3">
              <div
                onClick={() => onNavigateTab('verify-slip')}
                className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 hover:bg-amber-100/70 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-200/70 rounded-lg text-amber-900">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-amber-950">สลิปใหม่รอตรวจสอบ</div>
                    <div className="text-xs text-amber-700">มีสลิปโอนเงินรออนุมัติ {pendingSlips.length} รายการ</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-800" />
              </div>

              <div
                onClick={() => onNavigateTab('verify-attendees', activeMeetingId !== 'all' ? activeMeetingId : undefined)}
                className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 hover:bg-blue-100/70 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-200/70 rounded-lg text-[#0026b3]">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-blue-950">ตรวจสอบรายชื่อผู้เข้าร่วม</div>
                    <div className="text-xs text-[#0026b3]">เช็คอินแล้ว {totalAttended} จาก {totalRegistered} คน</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#0026b3]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
