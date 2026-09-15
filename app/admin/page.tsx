'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AdminNavbar, AdminTab } from '@/components/AdminNavbar';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Receipt,
  UserCheck,
  CalendarDays,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  ChevronDown,
  Upload,
  Eye,
  Trash2,
  MoreHorizontal,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Download,
  FileSpreadsheet,
  Check,
  X,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  QrCode,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  BarChart3,
  PieChart,
  SlidersHorizontal,
  Calendar,
  Layers,
  Award,
  CircleDot,
  RotateCcw,
  KeyRound,
  Dices,
  Printer,
  FileText,
  Coins,
  Tag,
  BadgePercent,
  Pencil,
  ChevronLeft
} from 'lucide-react';
import { ThaiDateRangePicker } from '@/components/ThaiDateRangePicker';
import { ThaiTimeRangePicker } from '@/components/ThaiTimeRangePicker';
import { ReceiptData } from '@/types/receipt';
import { ReceiptManagementPanel } from '@/components/ReceiptManagementPanel';
import { ReceiptModal } from '@/components/ReceiptModal';
import { MemberManagementPanel } from '@/components/MemberManagementPanel';
import { ToastNotification } from '@/components/ToastNotification';
import { MeetingEditModal } from '@/components/MeetingEditModal';
import { AdminSlipsView } from '@/components/views/AdminSlipsView';

/* ─── Data Types & Interfaces ─────────────────────────────────────────── */

export interface MeetingPricingTiers {
  programName: string;
  participant: {
    onsiteMember: number;
    onsiteNonMember: number;
    onlineMember: number;
  };
  changeFee: {
    label: string;
    conditionDate: string;
    onsiteMember: number;
    onsiteNonMember: number;
    onlineMember: number;
  };
  remark: string;
}

export const DEFAULT_PRICING_TIERS: MeetingPricingTiers = {
  programName: '',
  participant: {
    onsiteMember: 0,
    onsiteNonMember: 0,
    onlineMember: 0,
  },
  changeFee: {
    label: '',
    conditionDate: '',
    onsiteMember: 0,
    onsiteNonMember: 0,
    onlineMember: 0,
  },
  remark: '',
};

interface MeetingItem {
  id: string;
  titleTh: string;
  titleEn: string;
  date: string;
  time: string;
  location: string;
  type: 'hybrid' | 'onsite' | 'online';
  staffCode?: string;
  maxSeats: number;
  basePrice?: number;
  pricingTiers?: MeetingPricingTiers;
  registered: number;
  attended: number;
  revenue: number;
  status: 'upcoming' | 'ongoing' | 'completed';
}

const INITIAL_MEETINGS: MeetingItem[] = [];

interface SlipItem {
  id: string;
  refNo: string;
  nameTh: string;
  nameEn: string;
  email: string;
  phone: string;
  memberCode?: string;
  workplace: string;
  ticketType: string;
  meetingId: string;
  amount: number;
  bank: string;
  transferDate: string;
  transferTime: string;
  slipUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

const INITIAL_SLIPS: SlipItem[] = [];

interface AttendeeItem {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  id4Digits: string;
  email: string;
  phone: string;
  workplace: string;
  memberType: string;
  ticketType: string;
  ticketCode: string;
  meetingId: string;
  meetingTitle: string;
  registeredDate: string;
  paymentStatus: 'paid' | 'pending' | 'unpaid';
  checkInStatus: 'checked_in' | 'not_checked_in';
  checkInTime?: string;
}

const INITIAL_ATTENDEES: AttendeeItem[] = [];

const INITIAL_RECEIPTS: ReceiptData[] = [];

/* ─── 1. OVERVIEW DASHBOARD PANEL (Light Theme) ──────────────────────────── */

interface DashboardOverviewProps {
  onNavigateTab: (tab: AdminTab) => void;
  meetings: MeetingItem[];
  slips: SlipItem[];
  attendees: AttendeeItem[];
  onEditMeeting?: (meeting: MeetingItem) => void;
}

function DashboardOverviewPanel({ onNavigateTab, meetings, slips, attendees, onEditMeeting }: DashboardOverviewProps) {
  // Find current ongoing meeting (or first upcoming, or fallback to first meeting)
  const currentOngoingMeeting = useMemo(() => {
    return meetings.find((m) => m.status === 'ongoing') || meetings.find((m) => m.status === 'upcoming') || meetings[0];
  }, [meetings]);

  // Selected meeting round on dashboard (defaults to current ongoing round, or 'all')
  const [selectedDashboardMeetingId, setSelectedDashboardMeetingId] = useState<string>('default');

  const activeMeetingId = selectedDashboardMeetingId === 'default' 
    ? (currentOngoingMeeting ? currentOngoingMeeting.id : 'all') 
    : selectedDashboardMeetingId;

  const currentSelectedMeeting = meetings.find((m) => m.id === activeMeetingId);

  // Filter attendees & slips by the active meeting selection
  const displayedAttendees = useMemo(() => {
    if (activeMeetingId === 'all') return attendees;
    return attendees.filter(
      (a) => a.meetingId === activeMeetingId || (currentSelectedMeeting && a.meetingTitle === currentSelectedMeeting.titleTh)
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
  const checkedInAttendees = useMemo(() => displayedAttendees.filter((a) => a.checkInStatus === 'checked_in'), [displayedAttendees]);
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
      {/* Top Banner (ThaiSRM Brand Primary & Accent Green) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white p-5 sm:p-8 shadow-xl">
        {/* Subtle Background Glow Spheres */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 -left-12 w-44 h-44 bg-[#4ade80]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-[#4ade80] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>ระบบบริหารจัดการประชุมสมาคม TSRM</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              ภาพรวมแดชบอร์ดผู้ดูแลระบบ
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-blue-100 leading-relaxed font-medium">
              สรุปผลการจัดงาน สถิติผู้เข้าร่วมงาน ยอดชำระเงิน และการตรวจสอบสลิปแบบเรียลไทม์
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
              <span>ตรวจสลิป ({pendingSlips.length})</span>
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
              <option value="all">🌐 รวมทุกรอบการประชุม (All Rounds - รวม {attendees.length} คน)</option>
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
          onClick={() => onNavigateTab('verify-attendees')}
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
          onClick={() => onNavigateTab('verify-attendees')}
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
                  สถิติการเช็คอินตามช่วงเวลา (Peak Hours Check-in)
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
                onClick={() => onNavigateTab('verify-attendees')}
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

/* ─── 2. REVENUE REPORT PANEL ────────────────────────────────────────────── */

interface RevenueReportProps {
  meetings: MeetingItem[];
  slips: SlipItem[];
  attendees?: AttendeeItem[];
}

function RevenueReportPanel({ meetings, slips, attendees }: RevenueReportProps) {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'hybrid' | 'onsite' | 'online'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeChartTab, setActiveChartTab] = useState<'layered' | 'comparison' | 'donut'>('layered');
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);

  // Filtered Meetings based on comprehensive filters (sorted newest first)
  const filteredMeetings = useMemo(() => {
    return meetings
      .filter((m) => {
        const matchRound = selectedMeetingId === 'all' || m.id === selectedMeetingId;
        const matchType = filterType === 'all' || m.type === filterType;
        const matchStatus = filterStatus === 'all' || m.status === filterStatus;
        const q = searchQuery.toLowerCase().trim();
        const matchSearch =
          !q ||
          m.titleTh.toLowerCase().includes(q) ||
          m.titleEn.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q);
        return matchRound && matchType && matchStatus && matchSearch;
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
  }, [meetings, selectedMeetingId, filterType, filterStatus, searchQuery]);

  const hasActiveFilters = selectedMeetingId !== 'all' || filterType !== 'all' || filterStatus !== 'all' || searchQuery.trim() !== '';

  const resetAllFilters = () => {
    setSelectedMeetingId('all');
    setFilterType('all');
    setFilterStatus('all');
    setSearchQuery('');
  };

  // Total Calculations based on filtered meetings
  const grandTotalRevenue = filteredMeetings.reduce((sum, m) => sum + m.revenue, 0);
  const totalPaidCount = filteredMeetings.reduce((sum, m) => sum + m.registered, 0);
  const totalAttendedCount = filteredMeetings.reduce((sum, m) => sum + m.attended, 0);
  const pendingAmount = slips
    .filter((s) => s.status === 'pending')
    .reduce((sum, s) => sum + s.amount, 0);
  const pendingCount = slips.filter((s) => s.status === 'pending').length;

  // Selected Meeting / Round data
  const currentMeeting = meetings.find((m) => m.id === selectedMeetingId);

  // Active revenue to display
  const displayRevenue = selectedMeetingId === 'all' ? grandTotalRevenue : (filteredMeetings.find((m) => m.id === selectedMeetingId)?.revenue || 0);
  const displayPaidCount = selectedMeetingId === 'all' ? totalPaidCount : (filteredMeetings.find((m) => m.id === selectedMeetingId)?.registered || 0);
  const avgPerPerson = displayPaidCount > 0 ? Math.round(displayRevenue / displayPaidCount) : 0;

  // Dynamic Breakdown tiers computed from real database slips & meetings
  const ticketTiers = useMemo(() => {
    const approvedSlips = selectedMeetingId === 'all'
      ? slips.filter((s) => s.status === 'approved')
      : slips.filter((s) => s.status === 'approved' && s.meetingId === selectedMeetingId);

    const tierMap = new Map<string, { count: number; total: number }>();
    approvedSlips.forEach((s) => {
      const type = s.ticketType || (s.memberCode ? 'สมาชิกสมาคม (Member Pass)' : 'บุคคลทั่วไป (Non-Member Pass)');
      const cur = tierMap.get(type) || { count: 0, total: 0 };
      tierMap.set(type, { count: cur.count + 1, total: cur.total + s.amount });
    });

    if (tierMap.size === 0) {
      const activeMeeting = meetings.find((m) => m.id === selectedMeetingId);
      const totalRev = selectedMeetingId === 'all' ? grandTotalRevenue : (activeMeeting?.revenue || 0);
      const totalReg = selectedMeetingId === 'all' ? totalPaidCount : (activeMeeting?.registered || 0);

      if (totalReg > 0 || totalRev > 0) {
        return [
          {
            name: activeMeeting?.titleTh || 'บัตรลงทะเบียน (Registration Pass)',
            price: totalReg > 0 ? Math.round(totalRev / totalReg) : (activeMeeting?.basePrice || 3500),
            count: totalReg,
            total: totalRev,
            color: '#0026b3',
            bgClass: 'bg-[#0026b3]',
            fill: 'rgb(0, 38, 179)',
          },
        ];
      }

      return [];
    }

    const COLORS = ['#0026b3', '#059669', '#9333ea', '#d97706', '#e11d48', '#0284c7'];
    const BG_CLASSES = ['bg-[#0026b3]', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600', 'bg-rose-600', 'bg-sky-600'];

    return Array.from(tierMap.entries()).map(([name, data], idx) => ({
      name,
      price: data.count > 0 ? Math.round(data.total / data.count) : 0,
      count: data.count,
      total: data.total,
      color: COLORS[idx % COLORS.length],
      bgClass: BG_CLASSES[idx % BG_CLASSES.length],
      fill: COLORS[idx % COLORS.length],
    }));
  }, [selectedMeetingId, slips, meetings, grandTotalRevenue, totalPaidCount]);

  const totalTierRevenue = ticketTiers.reduce((s, t) => s + t.total, 0);

  // Dynamic Bank Channels Breakdown computed from real database slips
  const bankBreakdown = useMemo(() => {
    const approvedSlips = selectedMeetingId === 'all'
      ? slips.filter((s) => s.status === 'approved')
      : slips.filter((s) => s.status === 'approved' && s.meetingId === selectedMeetingId);

    const bankMap = new Map<string, number>();
    let totalAmt = 0;
    approvedSlips.forEach((s) => {
      const b = s.bank || 'ธนาคารไทยพาณิชย์ (SCB)';
      bankMap.set(b, (bankMap.get(b) || 0) + s.amount);
      totalAmt += s.amount;
    });

    if (bankMap.size === 0) {
      return [
        { bank: 'SCB (ไทยพาณิชย์)', amount: grandTotalRevenue, percent: 100, color: 'bg-purple-600' },
      ];
    }

    const BANK_COLORS: Record<string, string> = {
      SCB: 'bg-purple-600',
      KBANK: 'bg-emerald-600',
      BBL: 'bg-blue-600',
      KTB: 'bg-sky-500',
      BAY: 'bg-amber-500',
      TTB: 'bg-blue-700',
    };

    return Array.from(bankMap.entries()).map(([bank, amount]) => {
      const percent = totalAmt > 0 ? Math.round((amount / totalAmt) * 100) : 0;
      let color = 'bg-blue-600';
      for (const [k, c] of Object.entries(BANK_COLORS)) {
        if (bank.toUpperCase().includes(k)) {
          color = c;
          break;
        }
      }
      return { bank, amount, percent, color };
    });
  }, [selectedMeetingId, slips, grandTotalRevenue]);

  // Helper for Donut SVG circumference calculation
  const donutRadius = 70;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedDonutPercent = 0;

  // ─── Multi-Round Layered Curve Chart Data (Design Match) ────────────────
  const timeLabels = ['9/4', '9/5', '9/5', '9/6', '9/6', '9/7', '9/7', '9/8', '9/8', '9/9', '9/9', '9/10'];
  const svgWidth = 840;
  const svgHeight = 260;
  const baselineY = 220;
  const topPadding = 25;
  const stepX = svgWidth / (timeLabels.length - 1);

  // Smooth spline path generator using Catmull-Rom to Cubic Bezier conversion
  const generateSpline = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 >= pts.length ? i + 1 : i + 2];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p3.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  };

  // 3 Distinct Series matching the layered purple wave in the user's design
  // Series 1: Top Wave - THAISRM Congress 2026 (Deep Purple)
  const series1Values = [185, 120, 135, 145, 125, 45, 75, 105, 80, 22, 28, 48];
  const series1Points = series1Values.map((val, idx) => ({
    x: idx * stepX,
    y: val,
    revenue: [280, 560, 690, 850, 990, 1350, 1220, 1100, 1280, 1750, 1680, 1590][idx],
  }));

  // Series 2: Middle Wave - Clinical Embryology Workshop (Medium Violet)
  const series2Values = [200, 190, 180, 165, 160, 185, 180, 145, 130, 128, 135, 160];
  const series2Points = series2Values.map((val, idx) => ({
    x: idx * stepX,
    y: val,
    revenue: [60, 90, 130, 180, 220, 190, 200, 290, 340, 400, 390, 360][idx],
  }));

  // Series 3: Bottom Wave - Extraordinary Meeting & Webinar (Light Lilac)
  const series3Values = [212, 205, 200, 195, 205, 190, 198, 195, 180, 168, 172, 178];
  const series3Points = series3Values.map((val, idx) => ({
    x: idx * stepX,
    y: val,
    revenue: [90, 140, 180, 240, 210, 280, 260, 270, 450, 1300, 1250, 1180][idx],
  }));

  const path1 = generateSpline(series1Points);
  const path2 = generateSpline(series2Points);
  const path3 = generateSpline(series3Points);

  const area1 = `${path1} L ${svgWidth},${baselineY} L 0,${baselineY} Z`;
  const area2 = `${path2} L ${svgWidth},${baselineY} L 0,${baselineY} Z`;
  const area3 = `${path3} L ${svgWidth},${baselineY} L 0,${baselineY} Z`;

  const handleExportFinancialExcel = () => {
    const headers = ['รหัสโครงการ', 'ชื่อการประชุม (ไทย)', 'ชื่อการประชุม (อังกฤษ)', 'รูปแบบ', 'วันที่จัดงาน', 'จำนวนที่นั่งสูงสุด', 'ผู้ลงทะเบียน (คน)', 'ผู้เข้าร่วมจริง (คน)', 'รายได้รวม (บาท)', 'สถานะ'];
    const rows = filteredMeetings.map((m) => [
      m.id,
      `"${m.titleTh}"`,
      `"${m.titleEn}"`,
      m.type,
      `"${m.date}"`,
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
    link.setAttribute('download', `financial_revenue_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0026b3] text-xs font-bold mb-2">
            <DollarSign className="w-4 h-4 text-[#0026b3]" />
            <span>รายงานการเงินและรายได้ค่าลงทะเบียน (Financial Analytics)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            รายงานรายได้จากการลงทะเบียน
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            สรุปยอดรับชำระเงินค่าลงทะเบียน แสดงเป็นกราฟสถิติ Layered Spline Area แยกตามแต่ละรอบการประชุม
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportFinancialExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export ข้อมูล (Excel / CSV)</span>
          </button>
        </div>
      </div>

      {/* ─── Comprehensive & Intuitive Filter Bar ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Row 1: Search, Format Pills, Status Dropdown & Reset */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อการประชุม, สถานที่, หรือรหัสโครงการ..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters Group */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Format Filter (Pills) */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg transition ${filterType === 'all'
                  ? 'bg-[#0026b3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                ทุกรูปแบบ
              </button>
              <button
                type="button"
                onClick={() => setFilterType('hybrid')}
                className={`px-3 py-1.5 rounded-lg transition ${filterType === 'hybrid'
                  ? 'bg-[#0026b3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Hybrid
              </button>
              <button
                type="button"
                onClick={() => setFilterType('onsite')}
                className={`px-3 py-1.5 rounded-lg transition ${filterType === 'onsite'
                  ? 'bg-[#0026b3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Onsite
              </button>
              <button
                type="button"
                onClick={() => setFilterType('online')}
                className={`px-3 py-1.5 rounded-lg transition ${filterType === 'online'
                  ? 'bg-[#0026b3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Online
              </button>
            </div>

            {/* Status Dropdown Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl pl-3.5 pr-8 py-2.5 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition cursor-pointer"
              >
                <option value="all">ทุกสถานะโครงการ</option>
                <option value="ongoing">กำลังจัดงาน / เปิดรับ</option>
                <option value="upcoming">เร็วๆ นี้ (Upcoming)</option>
                <option value="completed">เสร็จสิ้นแล้ว</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Reset All Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ล้างตัวกรอง</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Meeting Round Selector Tabs with revenue badges */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#0026b3]" />
              <span>เลือกรอบการประชุมเจาะจง:</span>
            </div>
            <div className="text-xs font-bold text-slate-500">
              แสดง <span className="text-[#0026b3] font-black">{filteredMeetings.length}</span> จาก {meetings.length} โครงการ
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {/* All Meetings Pill */}
            <button
              type="button"
              onClick={() => setSelectedMeetingId('all')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-2 shrink-0 ${selectedMeetingId === 'all'
                ? 'bg-[#0026b3] text-white shadow-md shadow-[#0026b3]/25'
                : 'bg-slate-100 text-slate-700 hover:bg-blue-50/70 hover:text-[#0026b3]'
                }`}
            >
              <Layers className="w-4 h-4" />
              <span>รวมทุกรอบที่กรอง (Grand Total)</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${selectedMeetingId === 'all'
                ? 'bg-[#4ade80] text-slate-950 font-black'
                : 'bg-blue-50 text-[#0026b3] font-bold'
                }`}>
                ฿{(grandTotalRevenue / 1000000).toFixed(2)}M
              </span>
            </button>

            {/* Individual Meeting Pills */}
            {filteredMeetings.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMeetingId(m.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-2 shrink-0 ${selectedMeetingId === m.id
                  ? 'bg-[#0026b3] text-white shadow-md shadow-[#0026b3]/25'
                  : 'bg-slate-100 text-slate-700 hover:bg-blue-50/70 hover:text-[#0026b3]'
                  }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span className="truncate max-w-[220px]">{m.titleTh}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${selectedMeetingId === m.id
                  ? 'bg-[#4ade80] text-slate-950 font-black'
                  : 'bg-slate-200 text-slate-700 font-bold'
                  }`}>
                  ฿{(m.revenue / 1000).toFixed(0)}k
                </span>
              </button>
            ))}

            {filteredMeetings.length === 0 && (
              <div className="text-xs text-slate-500 py-1.5 px-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                ไม่มีรอบการประชุมที่ตรงกับตัวกรองนี้
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Core Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Revenue */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600">
              {selectedMeetingId === 'all' ? 'ยอดรายได้รวมทุกรอบ' : 'ยอดรายได้รอบนี้'}
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-[#0026b3]">฿</span>
            <span className="text-3xl font-extrabold text-slate-900">{displayRevenue.toLocaleString()}</span>
          </div>
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 font-medium truncate">
            {selectedMeetingId === 'all' ? `จากทั้งหมด ${meetings.length} รอบการประชุม` : currentMeeting?.titleTh}
          </div>
        </div>

        {/* Card 2: Paid Registrations */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600">ผู้ชำระเงินแล้ว</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{displayPaidCount.toLocaleString()}</span>
            <span className="text-sm font-medium text-slate-500">ที่นั่ง/คน</span>
          </div>
          <div className="text-xs text-emerald-700 font-bold pt-2 border-t border-slate-100 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            สถานะชำระเงินเรียบร้อย 100%
          </div>
        </div>

        {/* Card 3: Average per Attendee */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600">ค่าเฉลี่ยต่อผู้สมัคร</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-[#0026b3]">฿</span>
            <span className="text-3xl font-extrabold text-slate-900">{avgPerPerson.toLocaleString()}</span>
            <span className="text-xs text-slate-500 font-normal">/ คน</span>
          </div>
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 font-medium">
            คำนวณจากยอดรวมหารจำนวนที่นั่ง
          </div>
        </div>

        {/* Card 4: Pending Verification Inflow */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600">ยอดเงินรอตรวจสลิป</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-amber-700">฿</span>
            <span className="text-3xl font-extrabold text-slate-900">{pendingAmount.toLocaleString()}</span>
          </div>
          <div className="text-xs text-amber-800 font-bold pt-2 border-t border-slate-100">
            จำนวน {pendingCount} รายการสลิปที่รอตรวจ
          </div>
        </div>
      </div>

      {/* ─── MAIN GRAPH SECTION (Interactive Spline Area Chart) ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
        {/* Chart Header & Toggle Options */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3]">
                <Sparkles className="w-5 h-5 text-[#0026b3]" />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                กราฟวิเคราะห์รายได้และแนวโน้มการเติบโต
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              {activeChartTab === 'layered' && 'กราฟเส้นโค้งพื้นที่ซ้อนทับแยกตามแต่ละรอบการประชุม (Layered Spline Area Chart)'}
              {activeChartTab === 'comparison' && 'กราฟแท่งคู่เปรียบเทียบจำนวนผู้ลงทะเบียน vs ผู้เข้าร่วมงานจริงในแต่ละรอบ (Attendee Comparison)'}
              {activeChartTab === 'donut' && 'กราฟวงแหวนสัดส่วนรายได้แยกตามประเภทสมาชิกและบัตร (Donut Ring Chart)'}
            </p>
          </div>

          {/* Chart Type Toggle Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveChartTab('layered')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${activeChartTab === 'layered'
                ? 'bg-white text-[#0026b3] shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <TrendingUp className="w-4 h-4 text-[#0026b3]" />
              <span>กราฟแยกตามแต่ละรอบ</span>
            </button>
            <button
              onClick={() => setActiveChartTab('comparison')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${activeChartTab === 'comparison'
                ? 'bg-white text-[#0026b3] shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Users className="w-4 h-4 text-[#0026b3]" />
              <span>เปรียบเทียบจำนวนคน</span>
            </button>
            <button
              onClick={() => setActiveChartTab('donut')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${activeChartTab === 'donut'
                ? 'bg-white text-[#0026b3] shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <PieChart className="w-4 h-4 text-[#0026b3]" />
              <span>สัดส่วนบัตร</span>
            </button>
          </div>
        </div>

        {/* ── 1. LAYERED SPLINE AREA CHART (Brand Primary & Accent Styling) ── */}
        {activeChartTab === 'layered' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Swatch Legend */}
            <div className="flex items-center gap-6 flex-wrap px-2">
              <div
                onClick={() => setSelectedMeetingId(selectedMeetingId === 'MTG-2026-001' ? 'all' : 'MTG-2026-001')}
                className={`flex items-center gap-2 text-xs sm:text-sm font-bold cursor-pointer transition ${selectedMeetingId === 'MTG-2026-001' || selectedMeetingId === 'all'
                  ? 'text-slate-800'
                  : 'text-slate-400 opacity-60'
                  }`}
              >
                <span className="w-4 h-4 rounded-sm bg-[#0026b3] shrink-0 shadow-xs" />
                <span>THAISRM Congress 2026 (สีหลัก Primary)</span>
              </div>

              <div
                onClick={() => setSelectedMeetingId(selectedMeetingId === 'MTG-2026-002' ? 'all' : 'MTG-2026-002')}
                className={`flex items-center gap-2 text-xs sm:text-sm font-bold cursor-pointer transition ${selectedMeetingId === 'MTG-2026-002' || selectedMeetingId === 'all'
                  ? 'text-slate-800'
                  : 'text-slate-400 opacity-60'
                  }`}
              >
                <span className="w-4 h-4 rounded-sm bg-[#16a34a] shrink-0 shadow-xs" />
                <span>Hands-on Workshop (สี Accent Green)</span>
              </div>

              <div
                onClick={() => setSelectedMeetingId(selectedMeetingId === 'MTG-2026-003' ? 'all' : 'MTG-2026-003')}
                className={`flex items-center gap-2 text-xs sm:text-sm font-bold cursor-pointer transition ${selectedMeetingId === 'MTG-2026-003' || selectedMeetingId === 'all'
                  ? 'text-slate-800'
                  : 'text-slate-400 opacity-60'
                  }`}
              >
                <span className="w-4 h-4 rounded-sm bg-[#0284c7] shrink-0 shadow-xs" />
                <span>Extraordinary Meeting (Sky Blue)</span>
              </div>
            </div>

            {/* SVG Wave Chart Container */}
            <div className="relative pt-2 pb-2 bg-white rounded-2xl overflow-hidden">
              <div className="relative w-full aspect-[840/270] min-h-[220px]">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    {/* Gradient 1: Primary Brand Blue #0026b3 */}
                    <linearGradient id="brandBlueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0026b3" stopOpacity="0.48" />
                      <stop offset="50%" stopColor="#001f94" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#001a80" stopOpacity="0.02" />
                    </linearGradient>

                    {/* Gradient 2: Accent Mint Green #4ade80 / #16a34a */}
                    <linearGradient id="brandAccentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity="0.45" />
                      <stop offset="60%" stopColor="#16a34a" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#15803d" stopOpacity="0.02" />
                    </linearGradient>

                    {/* Gradient 3: Light Sky Blue */}
                    <linearGradient id="brandSkyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.32" />
                      <stop offset="70%" stopColor="#0284c7" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#0369a1" stopOpacity="0.00" />
                    </linearGradient>
                  </defs>

                  {/* ── Grid: Horizontal Dotted Lines ── */}
                  {[35, 75, 115, 155, 195].map((yVal) => (
                    <line
                      key={yVal}
                      x1="0"
                      y1={yVal}
                      x2={svgWidth}
                      y2={yVal}
                      stroke="#cbd5e1"
                      strokeDasharray="3 4"
                      strokeWidth="1.2"
                      opacity="0.7"
                    />
                  ))}

                  {/* ── Grid: Vertical Dotted Lines corresponding to date steps ── */}
                  {timeLabels.map((_, idx) => (
                    <line
                      key={idx}
                      x1={idx * stepX}
                      y1={topPadding}
                      x2={idx * stepX}
                      y2={baselineY}
                      stroke="#cbd5e1"
                      strokeDasharray="3 4"
                      strokeWidth="1.2"
                      opacity="0.7"
                    />
                  ))}

                  {/* ── Series 3 Layer (Bottom Curve - Sky Blue) ── */}
                  {(selectedMeetingId === 'all' || selectedMeetingId === 'MTG-2026-003') && (
                    <g className="transition-opacity duration-300">
                      <path d={area3} fill="url(#brandSkyGradient)" />
                      <path
                        d={path3}
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}

                  {/* ── Series 2 Layer (Middle Curve - Accent Mint Green) ── */}
                  {(selectedMeetingId === 'all' || selectedMeetingId === 'MTG-2026-002') && (
                    <g className="transition-opacity duration-300">
                      <path d={area2} fill="url(#brandAccentGradient)" />
                      <path
                        d={path2}
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}

                  {/* ── Series 1 Layer (Top Curve - Deep Primary Blue) ── */}
                  {(selectedMeetingId === 'all' || selectedMeetingId === 'MTG-2026-001') && (
                    <g className="transition-opacity duration-300">
                      <path d={area1} fill="url(#brandBlueGradient)" />
                      <path
                        d={path1}
                        fill="none"
                        stroke="#0026b3"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}

                  {/* ── Bottom Baseline Axis with Ticks ── */}
                  <line
                    x1="0"
                    y1={baselineY}
                    x2={svgWidth}
                    y2={baselineY}
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                  />
                  {timeLabels.map((_, idx) => (
                    <line
                      key={`tick-${idx}`}
                      x1={idx * stepX}
                      y1={baselineY}
                      x2={idx * stepX}
                      y2={baselineY + 6}
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                    />
                  ))}

                  {/* ── Interactive Hover Vertical Bar & Points ── */}
                  {hoveredPointIdx !== null && (
                    <g>
                      <line
                        x1={hoveredPointIdx * stepX}
                        y1={topPadding}
                        x2={hoveredPointIdx * stepX}
                        y2={baselineY}
                        stroke="#0026b3"
                        strokeWidth="1.8"
                        strokeDasharray="2 2"
                      />
                      {/* Dots on the 3 curves */}
                      <circle
                        cx={hoveredPointIdx * stepX}
                        cy={series1Points[hoveredPointIdx].y}
                        r="5.5"
                        fill="#0026b3"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                      />
                      <circle
                        cx={hoveredPointIdx * stepX}
                        cy={series2Points[hoveredPointIdx].y}
                        r="5"
                        fill="#16a34a"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <circle
                        cx={hoveredPointIdx * stepX}
                        cy={series3Points[hoveredPointIdx].y}
                        r="4.5"
                        fill="#0284c7"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    </g>
                  )}

                  {/* Invisible Overlay Hover Catchers */}
                  {timeLabels.map((_, idx) => (
                    <rect
                      key={`hover-${idx}`}
                      x={idx * stepX - stepX / 2}
                      y={0}
                      width={stepX}
                      height={baselineY + 10}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoveredPointIdx(idx)}
                      onMouseLeave={() => setHoveredPointIdx(null)}
                    />
                  ))}
                </svg>

                {/* X-Axis Date Labels underneath */}
                <div className="flex justify-between text-xs font-bold text-slate-500 pt-2 px-1">
                  {timeLabels.map((lbl, idx) => (
                    <span
                      key={idx}
                      className={`text-center transition ${hoveredPointIdx === idx ? 'text-[#0026b3] font-extrabold scale-110' : ''
                        }`}
                    >
                      {lbl}
                    </span>
                  ))}
                </div>
              </div>

              {/* Floating Tooltip info on hover */}
              {hoveredPointIdx !== null && (
                <div className="mt-4 p-3 bg-slate-900 text-white rounded-xl text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fade-in">
                  <div className="font-bold flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-blue-400" />
                    <span>วันที่ {timeLabels[hoveredPointIdx]} (สถิติรายรอบ):</span>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0026b3]" />
                      Congress: <strong>฿{series1Points[hoveredPointIdx].revenue.toLocaleString()}k</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" />
                      Workshop: <strong>฿{series2Points[hoveredPointIdx].revenue.toLocaleString()}k</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
                      Webinar: <strong>฿{series3Points[hoveredPointIdx].revenue.toLocaleString()}k</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ─── METRIC LIST ROWS (Revenue by Event) ─── */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  สรุปรายได้แยกตามโครงการประชุม (Revenue Breakdown)
                </span>
                <span className="text-xs font-bold text-slate-500">
                  สัดส่วนรายได้
                </span>
              </div>

              {/* Empty State */}
              {filteredMeetings.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <Search className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-sm font-bold text-slate-700">ไม่พบข้อมูลโครงการประชุมตามตัวกรองที่เลือก</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    กรุณาลองปรับคำค้นหา เปลี่ยนรูปแบบการจัดงาน หรือคลิกล้างตัวกรองเพื่อดูข้อมูลทั้งหมด
                  </p>
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0026b3] text-white text-xs font-bold hover:bg-blue-800 transition cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ล้างตัวกรองทั้งหมด</span>
                  </button>
                </div>
              ) : (
                <>
                  {filteredMeetings.map((m, idx) => {
                    const pct = grandTotalRevenue > 0 ? ((m.revenue / grandTotalRevenue) * 100).toFixed(1) : '0';
                    const isHybrid = m.type === 'hybrid';
                    const isOnsite = m.type === 'onsite';

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-4 rounded-xl transition border gap-3 ${selectedMeetingId === m.id
                          ? 'bg-blue-50/70 border-[#0026b3]/40 ring-1 ring-[#0026b3]/20'
                          : 'bg-slate-50/70 hover:bg-blue-50/40 border-slate-200/70'
                          }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isHybrid
                            ? 'bg-blue-100/80 text-[#0026b3]'
                            : isOnsite
                              ? 'bg-emerald-100/80 text-[#16a34a]'
                              : 'bg-sky-100/80 text-[#0284c7]'
                            }`}>
                            {isHybrid ? <Sparkles className="w-4.5 h-4.5" /> : isOnsite ? <Award className="w-4.5 h-4.5" /> : <CalendarDays className="w-4.5 h-4.5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 truncate">
                              {m.titleTh}
                            </div>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                              <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${isHybrid
                                ? 'bg-blue-100 text-[#0026b3]'
                                : isOnsite
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-sky-100 text-sky-800'
                                }`}>
                                {isHybrid ? 'Hybrid' : isOnsite ? 'Onsite Workshop' : 'Online Webinar'}
                              </span>
                              <span>ลงทะเบียน {m.registered.toLocaleString()} ที่นั่ง {m.maxSeats ? `(${Math.round((m.registered / m.maxSeats) * 100)}%)` : ''}</span>
                              <span className="hidden md:inline text-slate-300">•</span>
                              <span className="hidden md:inline text-slate-400">{m.date}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                          <div className="text-left sm:text-right">
                            <div className="text-base sm:text-lg font-bold text-slate-900">
                              ฿{m.revenue.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-slate-500">{pct}% ของยอดรวม</div>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>+{(12 + idx * 2.5).toFixed(1)}%</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Total Summary Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-emerald-50/60 rounded-xl transition border border-blue-200/80 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#0026b3] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="w-4.5 h-4.5 text-[#4ade80]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-slate-900 truncate">
                          รวมรายได้โครงการที่เลือก ({filteredMeetings.length} โครงการ)
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          ผู้ลงทะเบียนรวม {totalPaidCount.toLocaleString()} ที่นั่ง • ตรวจสอบสลิปตรงตามยอดทั้งหมด
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-200/60">
                      <div className="text-left sm:text-right">
                        <div className="text-base sm:text-xl font-black text-[#0026b3]">฿{grandTotalRevenue.toLocaleString()}</div>
                        <div className="text-[11px] text-emerald-700 font-bold">100.0% สมบูรณ์</div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#4ade80] text-slate-950 text-xs font-black shadow-xs">
                        <Check className="w-3.5 h-3.5" />
                        <span>สำเร็จ</span>
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── 2. COLUMN BAR CHART (Dual Clustered Bar Chart: Attendees Comparison) ── */}
        {activeChartTab === 'comparison' && (
          <div className="space-y-6 animate-fade-in">
            {/* Legend & Summary Info */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-2">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#0026b3] shrink-0 shadow-xs" />
                  <span>จำนวนผู้ลงทะเบียนทั้งหมด (Total Registered)</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#4ade80] shrink-0 shadow-xs" />
                  <span>จำนวนผู้เช็คอินเข้าร่วมจริง (Checked-in Attendees)</span>
                </div>
              </div>

              <div className="text-xs font-bold text-[#0026b3] bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                เปรียบเทียบ 6 รอบการประชุมและหลักสูตร
              </div>
            </div>

            {/* Visual Dual Column Bar Chart */}
            <div className="relative pt-8 pb-4 px-4 sm:px-8 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto pb-2 scrollbar-none">
                <div className="min-w-[540px] relative">
                  {/* Y-Axis Reference Gridlines (Dotted) */}
                  <div className="space-y-8 absolute inset-x-0 top-0 bottom-20 pointer-events-none flex flex-col justify-between opacity-50">
                    <div className="border-b border-dashed border-slate-300 w-full flex justify-between text-[11px] text-slate-500">
                      <span>100% ความจุ</span>
                    </div>
                    <div className="border-b border-dashed border-slate-300 w-full flex justify-between text-[11px] text-slate-500">
                      <span>75%</span>
                    </div>
                    <div className="border-b border-dashed border-slate-300 w-full flex justify-between text-[11px] text-slate-500">
                      <span>50%</span>
                    </div>
                    <div className="border-b border-dashed border-slate-300 w-full flex justify-between text-[11px] text-slate-500">
                      <span>25%</span>
                    </div>
                    <div className="border-b border-slate-300 w-full flex justify-between text-[11px] text-slate-500">
                      <span>0 คน</span>
                    </div>
                  </div>

                  {/* Clustered Bar Pairs dynamically mapped from meetings */}
                  <div className="grid gap-3 sm:gap-6 h-72 items-end pt-6 pb-2 relative z-10" style={{ gridTemplateColumns: `repeat(${Math.max(3, meetings.length)}, minmax(0, 1fr))` }}>
                    {meetings.map((m) => {
                      const maxVal = Math.max(...meetings.map((x) => Math.max(x.registered, x.attended, 100)), 100);
                      const h1 = `${Math.max(12, Math.min(100, Math.round((m.registered / maxVal) * 100)))}%`;
                      const h2 = `${Math.max(8, Math.min(100, Math.round((m.attended / maxVal) * 100)))}%`;

                      return (
                        <div
                          key={m.id}
                          className="flex flex-col items-center h-full justify-end group cursor-pointer"
                          onClick={() => setSelectedMeetingId(m.id)}
                        >
                          {/* Floating Info Tooltip */}
                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 mb-2 text-center pointer-events-none transform -translate-y-1 z-20">
                            <div className="bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                              <div className="text-slate-200 font-extrabold">{m.titleTh}</div>
                              <div className="text-blue-300">ลงทะเบียน: {m.registered.toLocaleString()} คน</div>
                              <div className="text-[#4ade80]">เช็คอินเข้างาน: {m.attended.toLocaleString()} คน ({m.registered > 0 ? Math.round((m.attended / m.registered) * 100) : 0}%)</div>
                            </div>
                          </div>

                          {/* Dual Bar Container: Primary Blue & Accent Green */}
                          <div className="flex items-end justify-center w-full max-w-[80px] h-[210px] gap-0 sm:gap-0.5">
                            {/* Left Bar: Primary Blue #0026b3 */}
                            <div
                              className="w-1/2 bg-[#0026b3] rounded-t-md hover:brightness-110 transition-all duration-500 shadow-2xs"
                              style={{ height: h1 }}
                              title={`ลงทะเบียน: ${m.registered} คน`}
                            />
                            {/* Right Bar: Accent Green #4ade80 */}
                            <div
                              className="w-1/2 bg-[#4ade80] rounded-t-md hover:brightness-110 transition-all duration-500 shadow-2xs"
                              style={{ height: h2 }}
                              title={`เช็คอินจริง: ${m.attended} คน`}
                            />
                          </div>

                          {/* X-Axis Label */}
                          <div className="mt-3 text-center space-y-0.5 w-full">
                            <div className="text-xs sm:text-sm font-extrabold text-slate-800 line-clamp-1 group-hover:text-[#0026b3] transition">
                              {m.titleTh.split('(')[0]}
                            </div>
                            <div className="text-[11px] font-medium text-slate-500 hidden sm:block">
                              {m.registered.toLocaleString()} / {m.attended.toLocaleString()} คน
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. SVG DONUT / RING CHART (By Member / Ticket Category) ── */}
        {activeChartTab === 'donut' && (
          <div className="space-y-6 animate-fade-in">
            {ticketTiers.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Donut SVG Illustration */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-50/70 border border-slate-200/80 rounded-2xl relative">
                  <svg className="w-56 h-56 transform -rotate-90 drop-shadow-xs" viewBox="0 0 180 180">
                    {/* Background Circle */}
                    <circle
                      cx="90"
                      cy="90"
                      r={donutRadius}
                      fill="transparent"
                      stroke="#e2e8f0"
                      strokeWidth="24"
                    />

                    {/* Dynamic Donut Segments */}
                    {ticketTiers.map((tier) => {
                      const tierPercent = totalTierRevenue > 0 ? (tier.total / totalTierRevenue) * 100 : 0;
                      const strokeLength = (tierPercent / 100) * donutCircumference;
                      const strokeOffset = -(accumulatedDonutPercent / 100) * donutCircumference;
                      accumulatedDonutPercent += tierPercent;

                      const isHovered = hoveredTier === tier.name;

                      return (
                        <circle
                          key={tier.name}
                          cx="90"
                          cy="90"
                          r={donutRadius}
                          fill="transparent"
                          stroke={tier.color}
                          strokeWidth={isHovered ? 28 : 24}
                          strokeDasharray={`${strokeLength} ${donutCircumference}`}
                          strokeDashoffset={strokeOffset}
                          strokeLinecap="round"
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setHoveredTier(tier.name)}
                          onMouseLeave={() => setHoveredTier(null)}
                        />
                      );
                    })}
                  </svg>

                  {/* Central Inner Badge */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {selectedMeetingId === 'all' ? 'รวมทุกรอบ' : 'ยอดรอบนี้'}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                      ฿{(totalTierRevenue / 1000000).toFixed(2)}M
                    </span>
                    <span className="text-[11px] font-bold text-[#0026b3] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 mt-1">
                      {ticketTiers.reduce((s, t) => s + t.count, 0)} ที่นั่ง
                    </span>
                  </div>
                </div>

                {/* Donut Legend & Proportions Table */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    จำแนกตามประเภทบัตรลงทะเบียน:
                  </div>
                  <div className="space-y-2.5">
                    {ticketTiers.map((tier) => {
                      const percent = totalTierRevenue > 0 ? Math.round((tier.total / totalTierRevenue) * 100) : 0;
                      const isHovered = hoveredTier === tier.name;

                      return (
                        <div
                          key={tier.name}
                          onMouseEnter={() => setHoveredTier(tier.name)}
                          onMouseLeave={() => setHoveredTier(null)}
                          className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${isHovered
                            ? 'bg-blue-50/50 border-[#0026b3]/30 ring-1 ring-[#0026b3]/30'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0"
                              style={{ backgroundColor: tier.color }}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 truncate">{tier.name}</div>
                              <div className="text-xs text-slate-500">
                                ฿{tier.price.toLocaleString()} / ที่นั่ง • {tier.count} ที่นั่ง
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm sm:text-base font-extrabold text-slate-900">
                              ฿{tier.total.toLocaleString()}
                            </div>
                            <div className="text-xs font-bold text-[#0026b3]">{percent}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <PieChart className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs sm:text-sm font-bold text-slate-600">ยังไม่มีข้อมูลรายได้ตามประเภทบัตร</p>
                <p className="text-[11px] text-slate-400">ระบบจะแสดงสัดส่วนเมื่อมีรายการสลิปชำระเงินที่ผ่านการอนุมัติ</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

// --- Helper to parse event date range into selectable day choices ---
interface EventDayChoice {
  id: string;
  label: string;
  value: string;
  dayNum?: number;
  monthYear?: string;
}

function getEventDayChoices(dateStr: string): EventDayChoice[] {
  if (!dateStr || !dateStr.trim()) return [];
  const trimmed = dateStr.trim();

  // Pattern 1: Same month range e.g. "25-28 ก.ย. 2569" or "25 - 28 กันยายน 2569"
  const sameMonthMatch = trimmed.match(/^(\d{1,2})\s*[-–—]\s*(\d{1,2})\s+(.*)$/);
  if (sameMonthMatch) {
    const start = parseInt(sameMonthMatch[1], 10);
    const end = parseInt(sameMonthMatch[2], 10);
    const monthYear = sameMonthMatch[3]?.trim() || '';

    if (start && end && start <= end && end - start <= 30) {
      const choices: EventDayChoice[] = [
        {
          id: 'all',
          label: `ทุกวัน (${start}-${end})`,
          value: trimmed,
        },
      ];
      for (let d = start; d <= end; d++) {
        choices.push({
          id: `d-${d}`,
          label: `วันที่ ${d}`,
          value: monthYear ? `${d} ${monthYear}` : `วันที่ ${d}`,
          dayNum: d,
          monthYear: monthYear,
        });
      }
      return choices;
    }
  }

  // Pattern 2: Cross month range e.g. "28 ก.ย. - 2 ต.ค. 2569" or "28 ก.ย. 2569 - 2 ต.ค. 2569"
  const crossMonthMatch = trimmed.match(/^(\d{1,2})\s+([^\d-]+?)(?:\s+(\d{4}))?\s*[-–—]\s*(\d{1,2})\s+([^\d-]+?)\s+(\d{4})$/);
  if (crossMonthMatch) {
    const d1 = parseInt(crossMonthMatch[1], 10);
    const m1 = crossMonthMatch[2].trim();
    const y1 = crossMonthMatch[3]?.trim() || crossMonthMatch[6].trim();
    const d2 = parseInt(crossMonthMatch[4], 10);
    const m2 = crossMonthMatch[5].trim();
    const y2 = crossMonthMatch[6].trim();

    return [
      { id: 'all', label: `ทุกวัน (${d1} ${m1} - ${d2} ${m2})`, value: trimmed },
      { id: 'd-1', label: `${d1} ${m1}`, value: `${d1} ${m1} ${y1}`, dayNum: d1, monthYear: `${m1} ${y1}` },
      { id: 'd-2', label: `${d2} ${m2}`, value: `${d2} ${m2} ${y2}`, dayNum: d2, monthYear: `${m2} ${y2}` },
    ];
  }

  // Pattern 3: Single date e.g. "25 ก.ย. 2569"
  const singleMatch = trimmed.match(/^(\d{1,2})\s*(.*)$/);
  if (singleMatch) {
    const d = parseInt(singleMatch[1], 10);
    const my = singleMatch[2]?.trim() || '';
    return [
      {
        id: `d-${d}`,
        label: `วันที่ ${d}`,
        value: trimmed,
        dayNum: d,
        monthYear: my,
      },
    ];
  }

  return [
    {
      id: 'custom',
      label: trimmed,
      value: trimmed,
    },
  ];
}

function AddMeetingPanel({
  onMeetingCreated,
  onNavigateTab,
}: {
  onMeetingCreated?: (m: MeetingItem) => void;
  onNavigateTab?: (tab: AdminTab) => void;
}) {
  const generateRandomPin = () => Math.floor(100000 + Math.random() * 900000).toString();

  // --- Activity / Program Item Type ---
  interface ActivityItem {
    id: string;
    type: 'main' | 'workshop';
    name: string;
    date: string;
    selectedDays?: string[];
    maxSeats?: number;
    memberPrice?: number;
    nonMemberPrice?: number;
  }

  const createEmptyActivity = (type: 'main' | 'workshop'): ActivityItem => ({
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    name: '',
    date: '',
    selectedDays: [],
    maxSeats: type === 'workshop' ? 50 : 0,
    memberPrice: type === 'workshop' ? 0 : undefined,
    nonMemberPrice: type === 'workshop' ? 0 : undefined,
  });

  const [formData, setFormData] = useState({
    meetingId: '',
    title: '',
    date: '',
    time: '',
    location: '',
    type: 'onsite' as 'onsite' | 'online' | 'hybrid',
    staffCode: generateRandomPin(),
    basePrice: 0,
    description: '',
  });

  // Fetch next suggested TSRM ID on mount
  useEffect(() => {
    fetch('/api/meetings?action=next_id')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.nextMeetingId) {
          setFormData((prev) => ({
            ...prev,
            meetingId: prev.meetingId || data.nextMeetingId,
          }));
        }
      })
      .catch(() => { });
  }, []);

  const [activities, setActivities] = useState<ActivityItem[]>([
    createEmptyActivity('main'),
  ]);

  const [pricing, setPricing] = useState<MeetingPricingTiers>(DEFAULT_PRICING_TIERS);

  const [isSaved, setIsSaved] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedMeetingDetails, setSavedMeetingDetails] = useState<{
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    type: string;
    staffCode: string;
    maxSeats: number;
    mainCount: number;
    workshopCount: number;
    basePrice: number;
  } | null>(null);

  // Extract day choices dynamically based on the event date range
  const dayChoices = useMemo(() => getEventDayChoices(formData.date), [formData.date]);

  // --- Activity Handlers ---
  const handleAddActivity = (type: 'main' | 'workshop') => {
    setActivities((prev) => [...prev, createEmptyActivity(type)]);
  };

  const handleRemoveActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateActivity = (id: string, field: keyof ActivityItem, value: string | number) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const handleToggleActivityDay = (activityId: string, choiceId: string) => {
    setActivities((prev) =>
      prev.map((act) => {
        if (act.id !== activityId) return act;

        const individualChoices = dayChoices.filter((c) => c.id !== 'all');
        const individualIds = individualChoices.map((c) => c.id);

        let currentSelected = act.selectedDays || [];
        if (currentSelected.length === 0 && act.date) {
          const matchSingle = individualChoices.find((c) => c.value === act.date);
          if (matchSingle) {
            currentSelected = [matchSingle.id];
          } else if (act.date === formData.date) {
            currentSelected = [...individualIds];
          }
        }

        let nextSelected: string[] = [];

        if (choiceId === 'all') {
          const isAllSelected = individualIds.length > 0 && individualIds.every((id) => currentSelected.includes(id));
          if (isAllSelected) {
            nextSelected = [];
          } else {
            nextSelected = [...individualIds];
          }
        } else {
          if (currentSelected.includes(choiceId)) {
            nextSelected = currentSelected.filter((id) => id !== choiceId);
          } else {
            nextSelected = [...currentSelected, choiceId];
          }
        }

        // Sort by choice order
        nextSelected.sort((a, b) => {
          const idxA = individualChoices.findIndex((c) => c.id === a);
          const idxB = individualChoices.findIndex((c) => c.id === b);
          return idxA - idxB;
        });

        // Compute summary date text
        let formattedDate = '';
        if (nextSelected.length === 0) {
          formattedDate = '';
        } else if (individualIds.length > 0 && nextSelected.length === individualIds.length) {
          formattedDate = formData.date;
        } else {
          const selectedChoices = individualChoices.filter((c) => nextSelected.includes(c.id));
          const dayNums = selectedChoices.map((c) => c.dayNum).filter((n): n is number => typeof n === 'number');
          const monthYears = Array.from(new Set(selectedChoices.map((c) => c.monthYear).filter(Boolean)));

          if (dayNums.length === selectedChoices.length && monthYears.length === 1 && monthYears[0]) {
            formattedDate = `วันที่ ${dayNums.join(', ')} ${monthYears[0]}`;
          } else {
            formattedDate = selectedChoices.map((c) => c.value).join(', ');
          }
        }

        return {
          ...act,
          selectedDays: nextSelected,
          date: formattedDate,
        };
      })
    );
  };

  const handleResetForm = () => {
    fetch('/api/meetings?action=next_id')
      .then((r) => r.json())
      .then((data) => {
        setFormData({
          meetingId: data.nextMeetingId || 'TSRM35',
          title: '',
          date: '',
          time: '',
          location: '',
          type: 'onsite',
          staffCode: generateRandomPin(),
          basePrice: 0,
          description: '',
        });
      })
      .catch(() => {
        setFormData({
          meetingId: 'TSRM35',
          title: '',
          date: '',
          time: '',
          location: '',
          type: 'onsite',
          staffCode: generateRandomPin(),
          basePrice: 0,
          description: '',
        });
      });
    setActivities([createEmptyActivity('main')]);
    setPricing(DEFAULT_PRICING_TIERS);
    setIsSaved(false);
    setShowSuccessModal(false);
    setSavedMeetingDetails(null);
  };

  const handleLoadDefaultPricing = () => {
    setPricing(DEFAULT_PRICING_TIERS);
    setActivities((prev) =>
      prev.map((act, idx) => {
        if (act.type === 'workshop') {
          return {
            ...act,
            memberPrice: act.memberPrice || (idx === 0 ? 2500 : 3000),
            nonMemberPrice: act.nonMemberPrice || (idx === 0 ? 3500 : 4000),
          };
        }
        return act;
      })
    );
  };

  const handleClearPricing = () => {
    setPricing({
      programName: '',
      participant: {
        onsiteMember: 0,
        onsiteNonMember: 0,
        onlineMember: 0,
      },
      changeFee: {
        label: '',
        conditionDate: '',
        onsiteMember: 0,
        onsiteNonMember: 0,
        onlineMember: 0,
      },
      remark: '',
    });
    setActivities((prev) =>
      prev.map((act) => (act.type === 'workshop' ? { ...act, memberPrice: 0, nonMemberPrice: 0 } : act))
    );
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date) {
      alert('กรุณากรอกชื่อการประชุมและระบุวันที่จัดงาน');
      return;
    }

    setIsSubmitting(true);

    // Format meeting ID: Ensure it follows TSRM<sequence>
    let meetingId = formData.meetingId.trim();
    if (!meetingId) {
      meetingId = 'TSRM35';
    } else if (/^\d+$/.test(meetingId)) {
      meetingId = `TSRM${meetingId}`;
    } else if (/^tsrm\s*(\d+)$/i.test(meetingId)) {
      const mMatch = meetingId.match(/^tsrm\s*(\d+)$/i);
      meetingId = mMatch ? `TSRM${mMatch[1]}` : meetingId.toUpperCase();
    } else {
      meetingId = meetingId.toUpperCase();
    }

    const wsSeats = activities.filter((a) => a.type === 'workshop').reduce((sum, a) => sum + (a.maxSeats || 0), 0);

    try {
      // Call API to save to database
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: meetingId,
          meeting_name: formData.title,
          meeting_date: formData.date,
          meeting_time: formData.time || '08:30 - 17:00 น.',
          location: formData.location || '',
          meeting_type: formData.type,
          staff_code: formData.staffCode || '',
          description: formData.description || '',
          base_price: pricing.participant.onsiteMember || formData.basePrice,
          pricing_tiers: pricing,
          activities: activities,
          max_seats: wsSeats || 500,
          status: 'upcoming',
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        alert(json.error || 'เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง');
        setIsSubmitting(false);
        return;
      }

      // Create the MeetingItem for frontend state
      const newMeeting: MeetingItem = {
        id: meetingId,
        titleTh: formData.title,
        titleEn: formData.title,
        date: formData.date,
        time: formData.time || '08:30 - 17:00 น.',
        location: formData.location || 'ศูนย์ประชุมสมาคม',
        type: formData.type,
        staffCode: formData.staffCode || '',
        maxSeats: wsSeats || 500,
        basePrice: pricing.participant.onsiteMember || formData.basePrice,
        pricingTiers: pricing,
        registered: 0,
        attended: 0,
        revenue: 0,
        status: 'upcoming',
      };

      const meetingDetails = {
        id: meetingId,
        title: formData.title,
        date: formData.date,
        time: formData.time || '08:30 - 17:00 น.',
        location: formData.location || 'ศูนย์ประชุมสมาคม',
        type: formData.type,
        staffCode: formData.staffCode || '',
        maxSeats: wsSeats || 500,
        mainCount: activities.filter((a) => a.type === 'main').length,
        workshopCount: activities.filter((a) => a.type === 'workshop').length,
        basePrice: pricing.participant.onsiteMember || formData.basePrice,
      };

      if (onMeetingCreated) {
        onMeetingCreated(newMeeting);
      }
      setLastCreatedId(meetingId);
      setSavedMeetingDetails(meetingDetails);
      setIsSaved(true);
      setShowSuccessModal(true);
      setToastMessage(`บันทึกและสร้างงานประชุม "${formData.title}" (รหัส: ${meetingId}) สำเร็จเรียบร้อยแล้ว!`);
      setTimeout(() => setToastMessage(null), 5000);
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch { }
    } catch (err) {
      console.error('Failed to create meeting:', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Count activities by type
  const mainCount = activities.filter((a) => a.type === 'main').length;
  const workshopCount = activities.filter((a) => a.type === 'workshop').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
      <ToastNotification message={toastMessage} />

      {/* ─── SUCCESS MODAL POPUP ─── */}
      {showSuccessModal && savedMeetingDetails && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 relative text-center space-y-5 animate-scale-up">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon Badge with Glow */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 bg-[#4ade80]/30 rounded-full blur-xl animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0026b3] to-[#0044ff] text-white flex items-center justify-center shadow-lg ring-4 ring-[#4ade80]/40">
                <CheckCircle2 className="w-9 h-9 text-[#4ade80] stroke-[2.5]" />
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>บันทึกโครงการสำเร็จ</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                บันทึกการเพิ่มการประชุมเรียบร้อยแล้ว
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                โครงการประชุมวิชาการได้ถูกบันทึกลงสู่ระบบ พร้อมเปิดรับลงทะเบียนและตรวจสอบสิทธิ์สมาชิกอัตโนมัติ
              </p>
            </div>

            {/* Meeting Summary Card */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-left space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="font-bold text-slate-500">รหัสการประชุม (Meeting ID)</span>
                <span className="font-mono font-black text-[#0026b3] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 text-xs">
                  {savedMeetingDetails.id}
                </span>
              </div>
              <div className="space-y-1 pt-0.5">
                <div className="font-black text-sm text-slate-900">{savedMeetingDetails.title}</div>
                <div className="flex flex-wrap items-center gap-2 text-slate-600 text-[11px] pt-1">
                  <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#0026b3]" /> {savedMeetingDetails.date}</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#0026b3]" /> {savedMeetingDetails.time}</span>
                </div>
                {savedMeetingDetails.location && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{savedMeetingDetails.location}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-center">
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-medium">รูปแบบ</div>
                  <div className="font-extrabold text-slate-800 uppercase text-[11px] mt-0.5">
                    {savedMeetingDetails.type}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-medium">Staff PIN</div>
                  <div className="font-mono font-bold text-amber-700 text-[11px] mt-0.5">
                    {savedMeetingDetails.staffCode || '-'}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-medium">กิจกรรม/เวิร์กช็อป</div>
                  <div className="font-bold text-violet-700 text-[11px] mt-0.5">
                    {savedMeetingDetails.mainCount} Main / {savedMeetingDetails.workshopCount} WS
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    onNavigateTab('meeting-history');
                  }}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-md shadow-blue-900/20 transition active:scale-95 cursor-pointer"
                >
                  <ClipboardList className="w-4 h-4 text-[#4ade80]" />
                  <span>ดูในประวัติการประชุม</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  handleResetForm();
                  setShowSuccessModal(false);
                }}
                className="w-full sm:flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm py-3 px-4 rounded-xl transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-slate-600" />
                <span>+ สร้างรายการอื่นต่อ</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0026b3] text-xs font-bold mb-2">
            <PlusCircle className="w-4 h-4 text-[#0026b3]" />
            <span>สร้างกำหนดการประชุมและงานอบรมใหม่</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">เพิ่มการประชุม / งานประชุมวิชาการ</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            ระบุข้อมูลการประชุม กำหนดการ สถานที่ หลักสูตร Main Program / Workshop พร้อมอัตราค่าลงทะเบียน
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetForm}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold border border-slate-200 transition cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-4 h-4 text-slate-500" />
          <span>ล้างฟอร์ม / เริ่มใหม่</span>
        </button>
      </div>

      {isSaved && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-emerald-900 shadow-sm animate-scale-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-950">
                บันทึกและสร้างงานประชุมใหม่เรียบร้อยแล้ว! (รหัส: {lastCreatedId})
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">
                ข้อมูลพร้อมตารางค่าลงทะเบียนได้บันทึกเข้าสู่ระบบ และพร้อมเปิดรับลงทะเบียนทันที
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('meeting-history')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0026b3] text-white text-xs font-bold hover:bg-[#001f94] transition cursor-pointer shadow-xs"
              >
                <span>ดูในประวัติการประชุม</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleResetForm}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100/50 transition cursor-pointer"
            >
              + สร้างรายการอื่นต่อ
            </button>
          </div>
        </div>
      )}

      {/* ─── MAIN INPUT FORM ─── */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-8 space-y-7 shadow-xs">
        {/* ─── SECTION 1: ข้อมูลและกำหนดการประชุม ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0026b3]" />
              1. ข้อมูลและกำหนดการประชุม
            </h3>
            <span className="text-xs text-slate-500">* ข้อมูลจำเป็น</span>
          </div>

          {/* รหัสการประชุม และ ชื่อการประชุม */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* รหัสการประชุม (Meeting ID) */}
            <div className="space-y-1.5 md:col-span-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">รหัสการประชุม (ID) *</label>
                <span className="text-[10px] text-[#0026b3] font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  TSRM + รอบ
                </span>
              </div>
              <input
                type="text"
                required
                value={formData.meetingId}
                onChange={(e) => setFormData({ ...formData, meetingId: e.target.value.toUpperCase() })}
                placeholder="เช่น TSRM34, TSRM35"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono font-bold text-[#0026b3] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition shadow-2xs uppercase"
              />
              <p className="text-[11px] text-slate-400">ระบบตั้งค่ารหัส TSRM ตามลำดับให้อัตโนมัติ</p>
            </div>

            {/* ชื่อการประชุม (รวมชื่อไทย/อังกฤษในช่องเดียว) */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">ชื่อการประชุม / งานประชุมวิชาการ *</label>
                {formData.title && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, title: '' })}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ล้างข้อความ
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="เช่น 34th TSRM 2026 หรือ THAISRM Annual Congress"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition shadow-2xs"
              />
            </div>
          </div>

          {/* กำหนดการจัดงาน: วันที่จัดงาน & เวลาจัดงาน */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">
                วันที่จัดงานรวม (เลือกช่วงวันที่) *
              </label>
              <ThaiDateRangePicker
                value={formData.date}
                onChange={(val) => setFormData({ ...formData, date: val })}
                placeholder="คลิกเพื่อเลือกช่วงวันที่"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">
                เวลาจัดงาน (เลือกช่วงเวลา)
              </label>
              <ThaiTimeRangePicker
                value={formData.time}
                onChange={(val) => setFormData({ ...formData, time: val })}
                placeholder="คลิกเพื่อเลือกช่วงเวลา"
              />
            </div>
          </div>

          {/* รูปแบบการจัดงาน (Onsite / Online / Hybrid) */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <span>รูปแบบการจัดงาน (Attendance Format)</span>
                <span className="text-xs font-normal text-slate-500">(เลือกได้ทั้ง 2 ตัวเลือก)</span>
              </label>
              <div className="text-xs font-semibold">
                {formData.type === 'hybrid' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    รูปแบบผสมผสาน (Hybrid)
                  </span>
                ) : formData.type === 'onsite' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    Onsite เท่านั้น
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#0026b3]">
                    <ExternalLink className="w-3 h-3 text-[#0026b3]" />
                    Online เท่านั้น
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(() => {
                const isOnsite = formData.type === 'onsite' || formData.type === 'hybrid';
                const isOnline = formData.type === 'online' || formData.type === 'hybrid';
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (isOnsite) {
                          if (isOnline) {
                            setFormData({ ...formData, type: 'online' });
                          }
                        } else {
                          setFormData({ ...formData, type: isOnline ? 'hybrid' : 'onsite' });
                        }
                      }}
                      className={`relative flex items-center justify-between p-3.5 rounded-xl transition border-2 text-left cursor-pointer ${isOnsite
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-400 ring-2 ring-emerald-200 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${isOnsite ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                            }`}
                        >
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">Onsite (ที่งาน)</div>
                          <div className="text-[11px] text-slate-500">เข้าร่วม ณ สถานที่จัดงานจริง</div>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${isOnsite
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                          }`}
                      >
                        {isOnsite && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isOnline) {
                          if (isOnsite) {
                            setFormData({ ...formData, type: 'onsite' });
                          }
                        } else {
                          setFormData({ ...formData, type: isOnsite ? 'hybrid' : 'online' });
                        }
                      }}
                      className={`relative flex items-center justify-between p-3.5 rounded-xl transition border-2 text-left cursor-pointer ${isOnline
                          ? 'bg-blue-50 text-[#0026b3] border-[#0026b3]/50 ring-2 ring-blue-200 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${isOnline ? 'bg-[#0026b3] text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                            }`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">Online (ออนไลน์)</div>
                          <div className="text-[11px] text-slate-500">รับชมผ่านระบบถ่ายทอดสด Zoom / Live</div>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${isOnline
                            ? 'bg-[#0026b3] border-[#0026b3] text-white'
                            : 'border-slate-300 bg-white'
                          }`}
                      >
                        {isOnline && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  </>
                );
              })()}
            </div>
            {formData.type === 'hybrid' && (
              <div className="text-xs text-indigo-800 bg-indigo-50/70 border border-indigo-200/80 rounded-xl px-3 py-2 flex items-center gap-2 animate-fade-in">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>การจัดงานแบบ Hybrid:</strong> ผู้เข้าร่วมสามารถเลือกช่องทางเข้าร่วมได้ทั้งที่หน้างาน (Onsite) หรือรับชมออนไลน์ (Online)
                </span>
              </div>
            )}
          </div>

          {/* สถานที่จัดงาน (Text Input สะอาดตา ไม่มีตัวเลือกปุ่มลัด) */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">สถานที่จัดงาน / ลิงก์ระบบ Zoom</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="เช่น ห้องแกรนด์บอลรูม โรงแรม Grand Hyatt Erawan Bangkok หรือ Zoom Webinar"
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition shadow-2xs"
            />
          </div>

          {/* รหัสเจ้าหน้าที่ (Staff PIN 6 หลัก) พร้อมปุ่มสุ่ม */}
          <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>รหัสเจ้าหน้าที่ประจำจุดลงทะเบียน (Staff PIN 6 หลัก) *</span>
              </label>
              <span className="text-[11px] text-amber-800 font-medium bg-amber-100/70 px-2 py-0.5 rounded-full">
                สำหรับสตาฟใช้สแกน QR หน้างาน
              </span>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <div className="relative w-40">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={formData.staffCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setFormData({ ...formData, staffCode: val });
                  }}
                  placeholder="000000"
                  className="w-full bg-white border border-amber-300 rounded-xl px-4 py-2 text-center text-lg font-mono font-extrabold tracking-[0.35em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/30 focus:border-[#0026b3] transition shadow-2xs"
                />
              </div>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, staffCode: generateRandomPin() })}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer active:scale-95 shadow-2xs"
                title="กดเพื่อสุ่มรหัสตัวเลข 6 หลักใหม่"
              >
                <Dices className="w-3.5 h-3.5 text-white" />
                <span>สุ่มตัวเลข 6 หลัก</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── SECTION 2: หลักสูตร / กิจกรรมที่จะเปิด (Programs & Workshops) ─── */}
        <div className="space-y-3.5 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-[#0026b3]" />
                2. หลักสูตร / กิจกรรมที่จะเปิด
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                เลือกวันที่จัดกิจกรรม (เลือกได้มากกว่า 1 วัน) และระบุจำนวนที่นั่งสำหรับ Workshop
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 self-start sm:self-auto">
              {mainCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px]">
                  <CircleDot className="w-2.5 h-2.5" />
                  Main {mainCount}
                </span>
              )}
              {workshopCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 text-[11px]">
                  <CircleDot className="w-2.5 h-2.5" />
                  Workshop {workshopCount}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[11px]">
                รวม {activities.length} รายการ
              </span>
            </div>
          </div>

          {/* Compact Activity Item List */}
          <div className="space-y-3">
            {activities.map((activity, index) => {
              const isMain = activity.type === 'main';
              const borderColor = isMain ? 'border-indigo-200 hover:border-indigo-300' : 'border-violet-200 hover:border-violet-300';
              const headerBg = isMain ? 'bg-indigo-50/70' : 'bg-violet-50/70';
              const badgeBg = isMain ? 'bg-indigo-600' : 'bg-violet-600';
              const typeLabel = isMain ? 'Main Program' : 'Workshop';
              const typeIcon = isMain ? '📋' : '🔬';
              const typeIndex = activities.filter((a, i) => a.type === activity.type && i <= index).length;

              const individualChoices = dayChoices.filter((c) => c.id !== 'all');
              const individualIds = individualChoices.map((c) => c.id);
              const selectedList = activity.selectedDays && activity.selectedDays.length > 0
                ? activity.selectedDays
                : (activity.date === formData.date ? individualIds : (individualChoices.filter(c => c.value === activity.date).map(c => c.id)));

              const isAllSelected = individualIds.length > 0 && individualIds.every((id) => selectedList.includes(id));

              return (
                <div
                  key={activity.id}
                  className={`border ${borderColor} rounded-xl overflow-hidden bg-white shadow-2xs transition-all`}
                >
                  {/* Compact Header Bar */}
                  <div className={`${headerBg} px-3.5 py-2 flex items-center justify-between gap-2 border-b ${isMain ? 'border-indigo-100' : 'border-violet-100'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`${badgeBg} text-white text-[11px] font-extrabold px-2 py-0.5 rounded-md shadow-2xs shrink-0`}>
                        {typeIcon} {typeLabel} {typeIndex > 1 || !isMain ? typeIndex : ''}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 truncate">
                        รายการที่ {index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Delete Button */}
                      {activities.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveActivity(activity.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Compact Body Fields */}
                  <div className="p-3 sm:p-3.5 space-y-2.5">
                    {/* Activity Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        ชื่อหัวข้อ / หลักสูตร {isMain ? '(Main Program)' : '(Workshop)'} *
                      </label>
                      <input
                        type="text"
                        value={activity.name}
                        onChange={(e) => handleUpdateActivity(activity.id, 'name', e.target.value)}
                        placeholder={isMain ? 'เช่น Main Scientific Program' : 'เช่น ART Nurse Workshop, Embryologist Hands-on'}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition"
                      />
                    </div>

                    {/* Date day pills & Workshop seats */}
                    {isMain ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700">
                            วันที่จัดกิจกรรม * <span className="text-[11px] font-normal text-slate-500">(เลือกได้มากกว่า 1 วัน)</span>
                          </label>
                          {activity.date ? (
                            <span className="text-[11px] font-bold text-[#0026b3] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                              <Check className="w-3 h-3 text-[#0026b3]" />
                              <span>{activity.date}</span>
                              {selectedList.length > 1 && (
                                <span className="bg-[#0026b3] text-white text-[10px] px-1.5 py-0.2 rounded-full">
                                  {selectedList.length} วัน
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">ยังไม่ได้เลือกวัน</span>
                          )}
                        </div>

                        {dayChoices.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {dayChoices.map((choice) => {
                              const isChoiceSelected = choice.id === 'all' ? isAllSelected : selectedList.includes(choice.id);
                              return (
                                <button
                                  key={choice.id}
                                  type="button"
                                  onClick={() => handleToggleActivityDay(activity.id, choice.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 border select-none ${isChoiceSelected
                                      ? 'bg-[#0026b3] text-white border-[#0026b3] shadow-xs ring-1 ring-blue-300'
                                      : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#0026b3] border-slate-200 hover:border-blue-200'
                                    }`}
                                >
                                  <Calendar className="w-3 h-3" />
                                  <span>{choice.label}</span>
                                  {isChoiceSelected && <Check className="w-3 h-3 ml-0.5 text-[#4ade80]" />}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>กรุณาเลือกวันที่จัดงานรวมในส่วนที่ 1 ก่อน เพื่อแสดงตัวเลือกวันที่</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start">
                          <div className="sm:col-span-8 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-700">
                                วันที่จัดกิจกรรม * <span className="text-[11px] font-normal text-slate-500">(เลือกได้มากกว่า 1 วัน)</span>
                              </label>
                              {activity.date ? (
                                <span className="text-[11px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100 flex items-center gap-1">
                                  <Check className="w-3 h-3 text-violet-700" />
                                  <span>{activity.date}</span>
                                  {selectedList.length > 1 && (
                                    <span className="bg-violet-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                                      {selectedList.length} วัน
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">ยังไม่ได้เลือกวัน</span>
                              )}
                            </div>

                            {dayChoices.length > 0 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {dayChoices.map((choice) => {
                                  const isChoiceSelected = choice.id === 'all' ? isAllSelected : selectedList.includes(choice.id);
                                  return (
                                    <button
                                      key={choice.id}
                                      type="button"
                                      onClick={() => handleToggleActivityDay(activity.id, choice.id)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 border select-none ${isChoiceSelected
                                          ? 'bg-violet-600 text-white border-violet-600 shadow-xs ring-1 ring-violet-300'
                                          : 'bg-slate-50 hover:bg-violet-50 text-slate-700 hover:text-violet-700 border-slate-200 hover:border-violet-200'
                                        }`}
                                    >
                                      <Calendar className="w-3 h-3" />
                                      <span>{choice.label}</span>
                                      {isChoiceSelected && <Check className="w-3 h-3 ml-0.5 text-[#4ade80]" />}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>กรุณาเลือกวันที่จัดงานรวมในส่วนที่ 1 ก่อน</span>
                              </div>
                            )}
                          </div>

                          <div className="sm:col-span-4 space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">จำนวนที่นั่ง (คน) *</label>
                            <input
                              type="number"
                              min={1}
                              value={activity.maxSeats || ''}
                              onChange={(e) => handleUpdateActivity(activity.id, 'maxSeats', parseInt(e.target.value) || 0)}
                              placeholder="เช่น 50"
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition"
                            />
                          </div>
                        </div>

                        {/* Workshop Registration Fee (Member* and Non-member) */}
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <Coins className="w-3.5 h-3.5 text-violet-600" />
                              <span>กำหนดค่าลงทะเบียนเวิร์กช็อป (Registration Fee)</span>
                            </label>
                            <span className="text-[10px] text-slate-400">ระบุ 0 หากไม่มีค่าใช้จ่าย</span>
                          </div>

                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/60 shadow-2xs">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-extrabold text-[11px]">
                                  <th className="py-2 px-3 w-1/2">
                                    Member<span className="text-rose-500 font-bold">*</span>
                                    <span className="text-[10px] text-slate-400 font-normal ml-1">(สมาชิกสมาคม)</span>
                                  </th>
                                  <th className="py-2 px-3 w-1/2 border-l border-slate-200">
                                    Non-member
                                    <span className="text-[10px] text-slate-400 font-normal ml-1">(บุคคลทั่วไป)</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="bg-white">
                                  {/* Member* */}
                                  <td className="p-2">
                                    <div className="relative">
                                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                                      <input
                                        type="number"
                                        min={0}
                                        step={100}
                                        value={activity.memberPrice !== undefined && activity.memberPrice !== null ? (activity.memberPrice === 0 ? '' : activity.memberPrice) : ''}
                                        onChange={(e) => handleUpdateActivity(activity.id, 'memberPrice', parseInt(e.target.value) || 0)}
                                        placeholder="0"
                                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-[#0026b3] focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-right"
                                      />
                                    </div>
                                  </td>
                                  {/* Non-member */}
                                  <td className="p-2 border-l border-slate-200">
                                    <div className="relative">
                                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                                      <input
                                        type="number"
                                        min={0}
                                        step={100}
                                        value={activity.nonMemberPrice !== undefined && activity.nonMemberPrice !== null ? (activity.nonMemberPrice === 0 ? '' : activity.nonMemberPrice) : ''}
                                        onChange={(e) => handleUpdateActivity(activity.id, 'nonMemberPrice', parseInt(e.target.value) || 0)}
                                        placeholder="0"
                                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-right"
                                      />
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compact Add Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => handleAddActivity('main')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 hover:bg-indigo-100/60 text-indigo-700 font-bold text-xs sm:text-sm transition cursor-pointer hover:border-indigo-400 active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              <span>+ เพิ่ม Main Program</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddActivity('workshop')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-violet-300 bg-violet-50/40 hover:bg-violet-100/60 text-violet-700 font-bold text-xs sm:text-sm transition cursor-pointer hover:border-violet-400 active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4 text-violet-600" />
              <span>+ เพิ่ม Workshop</span>
            </button>
          </div>
        </div>

        {/* ─── SECTION 3: ระบุเงินและกำหนดอัตราค่าลงทะเบียน (Interactive Pricing Matrix Table) ─── */}
        <div className="space-y-3.5 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#0026b3]" />
                3. กำหนดอัตราค่าลงทะเบียน (Registration Fee)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                กรอกตัวเลขราคา (บาท) ลงในตารางได้โดยตรง ระบบจะนำไปคำนวณและแสดงผลในหน้าลงทะเบียน
              </p>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleLoadDefaultPricing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0026b3] text-xs font-bold border border-blue-200 transition cursor-pointer"
                title="โหลดค่าเริ่มต้นมาตรฐาน"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ใส่ค่ามาตรฐานอัตโนมัติ</span>
              </button>
              <button
                type="button"
                onClick={handleClearPricing}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 text-xs font-medium border border-slate-200 transition cursor-pointer"
              >
                ล้างตาราง
              </button>
            </div>
          </div>

          {/* Compact Directly Editable Matrix Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                {/* Top Group Header */}
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2.5 px-3 w-[32%] text-slate-800">ประเภทผู้เข้าร่วม</th>
                  <th colSpan={2} className="py-2 px-3 text-center border-l border-slate-200 bg-emerald-50/70 text-emerald-900">
                    Onsite (เข้าร่วม ณ สถานที่)
                  </th>
                  <th className="py-2 px-3 text-center border-l border-slate-200 bg-blue-50/70 text-[#0026b3]">
                    Online (ออนไลน์)
                  </th>
                </tr>
                {/* Sub Header */}
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] sm:text-xs text-slate-600 font-bold">
                  <th className="py-2 px-3">หมวดหมู่ / รายการ</th>
                  <th className="py-2 px-3 text-center border-l border-slate-200 w-[22%]">
                    Member<span className="text-rose-500">*</span>
                  </th>
                  <th className="py-2 px-3 text-center border-l border-slate-200 w-[22%]">
                    Non-member
                  </th>
                  <th className="py-2 px-3 text-center border-l border-slate-200 w-[24%] text-[#0026b3]">
                    Member<span className="text-rose-500">*</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {/* Row 1: Participant */}
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="py-2.5 px-3 font-extrabold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      <span>Participant</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal pl-3">ผู้เข้าร่วมทั่วไป / แพทย์</div>
                  </td>
                  {/* Onsite Member */}
                  <td className="py-2 px-2.5 border-l border-slate-200">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={pricing.participant.onsiteMember}
                        onChange={(e) =>
                          setPricing({
                            ...pricing,
                            participant: {
                              ...pricing.participant,
                              onsiteMember: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-right"
                      />
                    </div>
                  </td>
                  {/* Onsite Non-member */}
                  <td className="py-2 px-2.5 border-l border-slate-200">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={pricing.participant.onsiteNonMember}
                        onChange={(e) =>
                          setPricing({
                            ...pricing,
                            participant: {
                              ...pricing.participant,
                              onsiteNonMember: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-right"
                      />
                    </div>
                  </td>
                  {/* Online Member */}
                  <td className="py-2 px-2.5 border-l border-slate-200 bg-blue-50/20">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={pricing.participant.onlineMember}
                        onChange={(e) =>
                          setPricing({
                            ...pricing,
                            participant: {
                              ...pricing.participant,
                              onlineMember: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-[#0026b3] focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-right"
                      />
                    </div>
                  </td>
                </tr>

                {/* Row 2: Format Change Fee */}
                <tr className="hover:bg-slate-50/50 transition bg-amber-50/30">
                  <td className="py-2 px-3 font-extrabold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span className="text-xs">แจ้งเปลี่ยนรูปแบบ</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 pl-3">
                      <input
                        type="text"
                        value={pricing.changeFee.conditionDate}
                        onChange={(e) =>
                          setPricing({
                            ...pricing,
                            changeFee: {
                              ...pricing.changeFee,
                              conditionDate: e.target.value,
                            },
                          })
                        }
                        placeholder="After 10 Oct 2026"
                        className="bg-white border border-amber-300 rounded px-1.5 py-0.5 text-[10px] font-bold text-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-400 w-28"
                      />
                    </div>
                  </td>
                  {/* Onsite Member */}
                  <td className="py-2 px-2.5 border-l border-slate-200">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={pricing.changeFee.onsiteMember}
                        onChange={(e) =>
                          setPricing({
                            ...pricing,
                            changeFee: {
                              ...pricing.changeFee,
                              onsiteMember: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-right"
                      />
                    </div>
                  </td>
                  {/* Onsite Non-member */}
                  <td className="py-2 px-2.5 border-l border-slate-200">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={pricing.changeFee.onsiteNonMember}
                        onChange={(e) =>
                          setPricing({
                            ...pricing,
                            changeFee: {
                              ...pricing.changeFee,
                              onsiteNonMember: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-right"
                      />
                    </div>
                  </td>
                  {/* Online Member */}
                  <td className="py-2 px-2.5 border-l border-slate-200 bg-blue-50/20">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={pricing.changeFee.onlineMember}
                        onChange={(e) =>
                          setPricing({
                            ...pricing,
                            changeFee: {
                              ...pricing.changeFee,
                              onlineMember: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-[#0026b3] focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-right"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Workshop Registration Rates Table in Section 3 (if workshops added) */}
          {workshopCount > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-600"></span>
                  <span>อัตราค่าลงทะเบียน Pre-congress Workshop ({workshopCount} รายการ)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">ซิงค์อัตโนมัติกับรายการ Workshop ด้านบน</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-violet-200 bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-violet-50/90 border-b border-violet-200 text-violet-950 font-bold text-[11px] sm:text-xs">
                      <th className="py-2.5 px-3 w-[40%]">ชื่อหลักสูตร / เวิร์กช็อป (WS)</th>
                      <th className="py-2.5 px-3 text-center border-l border-violet-200 w-[24%] text-[#0026b3]">
                        Member<span className="text-rose-500 font-bold">*</span>
                      </th>
                      <th className="py-2.5 px-3 text-center border-l border-violet-200 w-[24%] text-slate-800">
                        Non-member
                      </th>
                      <th className="py-2.5 px-3 text-center border-l border-violet-200 w-[12%] text-slate-600">
                        ที่นั่ง (คน)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-100">
                    {activities.filter((a) => a.type === 'workshop').map((ws, wsIdx) => (
                      <tr key={ws.id} className="hover:bg-violet-50/40 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-black text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded shrink-0">
                              WS {wsIdx + 1}
                            </span>
                            <span className="truncate max-w-[200px] sm:max-w-xs">{ws.name || `Workshop ${wsIdx + 1}`}</span>
                          </div>
                          {ws.date && <div className="text-[10px] text-slate-400 font-normal pl-7">{ws.date}</div>}
                        </td>
                        {/* Member* */}
                        <td className="py-2 px-2.5 border-l border-violet-100">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                            <input
                              type="number"
                              min={0}
                              step={100}
                              value={ws.memberPrice !== undefined && ws.memberPrice !== null ? (ws.memberPrice === 0 ? '' : ws.memberPrice) : ''}
                              onChange={(e) => handleUpdateActivity(ws.id, 'memberPrice', parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-[#0026b3] focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-600 text-right"
                            />
                          </div>
                        </td>
                        {/* Non-member */}
                        <td className="py-2 px-2.5 border-l border-violet-100">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                            <input
                              type="number"
                              min={0}
                              step={100}
                              value={ws.nonMemberPrice !== undefined && ws.nonMemberPrice !== null ? (ws.nonMemberPrice === 0 ? '' : ws.nonMemberPrice) : ''}
                              onChange={(e) => handleUpdateActivity(ws.id, 'nonMemberPrice', parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-600 text-right"
                            />
                          </div>
                        </td>
                        {/* Seats */}
                        <td className="py-2 px-2.5 border-l border-violet-100 text-center font-bold text-slate-700">
                          <span className="inline-block px-2 py-1 rounded-md bg-slate-100 text-xs text-slate-700 font-semibold">
                            {ws.maxSeats || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footnote / Quick Remark */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">* Member:</span>
              <input
                type="text"
                value={pricing.remark}
                onChange={(e) => setPricing({ ...pricing, remark: e.target.value })}
                placeholder="หมายเหตุสถานะสมาชิก..."
                className="bg-transparent border-b border-dashed border-slate-300 text-slate-600 focus:border-[#0026b3] focus:outline-none w-80 max-w-full text-xs"
              />
            </div>
            <span className="text-slate-400">💡 กดปุ่ม &quot;ใส่ค่ามาตรฐานอัตโนมัติ&quot; เพื่อเติมข้อมูลตามโครงสร้างมาตรฐานได้ทันที</span>
          </div>
        </div>

        {/* ─── SECTION 4: หมายเหตุ / รายละเอียดเพิ่มเติม ─── */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#0026b3]" />
              4. หมายเหตุ / รายละเอียดเพิ่มเติม (ถ้ามี)
            </h3>
          </div>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="ระบุรายละเอียดวาระการประชุม วิทยากรรับเชิญ หรือหมายเหตุ..."
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition resize-none shadow-2xs"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>ระบบจะบันทึกข้อมูลและอัตราค่าลงทะเบียน พร้อมเปิดช่องทางลงทะเบียนให้อัตโนมัติ</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleResetForm}
              className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 font-bold text-sm px-8 py-3 rounded-xl shadow-md transition active:scale-95 cursor-pointer ${isSubmitting
                  ? 'bg-slate-400 text-white shadow-slate-300/20 cursor-not-allowed'
                  : 'bg-[#0026b3] hover:bg-[#001f94] text-white shadow-[#0026b3]/20'
                }`}
            >
              <Check className="w-4 h-4 text-[#4ade80]" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกและเปิดรับลงทะเบียน'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ─── 3. MEETING HISTORY & MANAGEMENT PANEL (Light Theme) ─────────────────── */

function MeetingHistoryPanel({
  meetings,
  onNavigateTab,
  onUpdateStatus,
  onDeleteMeeting,
  onEditMeeting,
}: {
  meetings: MeetingItem[];
  onNavigateTab?: (tab: AdminTab) => void;
  onUpdateStatus?: (id: string, status: 'upcoming' | 'ongoing' | 'completed') => void;
  onDeleteMeeting?: (id: string) => void;
  onEditMeeting?: (meeting: MeetingItem) => void;
}) {
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
    const headers = ['รหัสโครงการ', 'ชื่อการประชุม (ไทย)', 'ชื่อการประชุม (อังกฤษ)', 'รูปแบบ', 'วันที่', 'เวลา', 'สถานที่', 'ที่นั่งสูงสุด', 'ลงทะเบียน (คน)', 'เช็คอิน (คน)', 'รายได้ (บาท)', 'สถานะ'];
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
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${filterStatus === tab.id
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
                      <span className="text-xs font-mono font-bold text-[#0026b3] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{m.id}</span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${m.status === 'ongoing'
                        ? 'bg-[#4ade80]/15 text-emerald-800 border-[#4ade80]/40'
                        : m.status === 'upcoming'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                        {m.status === 'ongoing' ? '● กำลังดำเนินการ' : m.status === 'upcoming' ? 'รอเริ่มงาน' : 'เสร็จสิ้น'}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#0026b3] border border-blue-200 uppercase">
                        {m.type}
                      </span>
                      {m.staffCode && (
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Staff PIN: {m.staffCode}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900">{m.titleTh}</h3>
                    <div className="text-xs text-slate-500 font-medium">{m.titleEn}</div>
                    <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-600 flex-wrap pt-1">
                      <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-[#0026b3]" /> {m.date} ({m.time})</span>
                      <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#0026b3]" /> {m.location}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 shrink-0 text-center">
                    <div>
                      <div className="text-[11px] sm:text-xs text-slate-500 font-medium">ลงทะเบียน</div>
                      <div className="text-sm sm:text-lg font-extrabold text-slate-900">{m.registered}/{m.maxSeats}</div>
                    </div>
                    <div>
                      <div className="text-[11px] sm:text-xs text-slate-500 font-medium">เช็คอินเข้างาน</div>
                      <div className="text-sm sm:text-lg font-extrabold text-emerald-700">{m.attended} <span className="text-[11px] font-normal">({attendancePercent}%)</span></div>
                    </div>
                    <div>
                      <div className="text-[11px] sm:text-xs text-slate-500 font-medium">ยอดเงินรวม</div>
                      <div className="text-sm sm:text-lg font-extrabold text-slate-900">฿{(m.revenue / 1000).toFixed(0)}k</div>
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
                      <option value="upcoming">รอเริ่มงาน (Upcoming)</option>
                      <option value="ongoing">กำลังดำเนินการ (Ongoing)</option>
                      <option value="completed">เสร็จสิ้นแล้ว (Completed)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {onNavigateTab && (
                      <>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('verify-attendees')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0026b3] text-xs font-bold border border-blue-200 transition cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>ดูผู้เข้าร่วม</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('revenue-report')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>รายงานรายได้</span>
                        </button>
                      </>
                    )}
                    {onEditMeeting && (
                      <button
                        type="button"
                        onClick={() => onEditMeeting(m)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition cursor-pointer"
                        title="แก้ไขการประชุม"
                      >
                        <Pencil className="w-3.5 h-3.5" />
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
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition cursor-pointer"
                        title="ลบโครงการ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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

/* ─── 4. VERIFY SLIPS PANEL (Light Theme) ─────────────────────────────────── */

function VerifySlipsPanel({
  slips,
  onApprove,
  onReject,
  onResetToPending,
  onPrintReceipt,
}: {
  slips: SlipItem[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onResetToPending?: (id: string) => void;
  onPrintReceipt?: (slip: SlipItem) => void;
}) {
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [selectedSlip, setSelectedSlip] = useState<SlipItem | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const filteredSlips = useMemo(() => {
    return slips.filter((s) => {
      const matchStatus = filterTab === 'all' || s.status === filterTab;
      const matchSearch =
        s.nameTh.toLowerCase().includes(search.toLowerCase()) ||
        s.refNo.toLowerCase().includes(search.toLowerCase()) ||
        s.workplace.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [slips, filterTab, search]);

  const handleOpenReject = (slip: SlipItem) => {
    setSelectedSlip(slip);
    setRejectReasonInput('ยอดเงินไม่ตรงกับค่าลงทะเบียน');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (selectedSlip) {
      onReject(selectedSlip.id, rejectReasonInput || 'ไม่ผ่านการตรวจสอบ');
      setIsRejectModalOpen(false);
      setSelectedSlip(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0026b3] text-xs font-bold mb-2">
            <Receipt className="w-4 h-4 text-[#0026b3]" />
            <span>ศูนย์ตรวจสอบสลิปและหลักฐานการโอนเงิน</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">ตรวจสอบสลิปการโอนเงิน</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            ตรวจสอบความถูกต้องของยอดเงิน บัญชีปลายทาง และอนุมัติสิทธิ์การเข้างานอัตโนมัติ
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 w-full sm:w-80 shadow-xs focus-within:ring-2 focus-within:ring-[#0026b3]/20 focus-within:border-[#0026b3]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, เลขที่ธุรกรรม..."
            className="bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'pending', label: `รอตรวจสอบ (${slips.filter((s) => s.status === 'pending').length})` },
            { id: 'approved', label: `อนุมัติแล้ว (${slips.filter((s) => s.status === 'approved').length})` },
            { id: 'rejected', label: `ปฏิเสธ (${slips.filter((s) => s.status === 'rejected').length})` },
            { id: 'all', label: `ทั้งหมด (${slips.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${filterTab === tab.id
                ? 'bg-[#0026b3] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Slips Cards */}
      <div className="space-y-3.5">
        {filteredSlips.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-2 shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <div className="text-base font-bold text-slate-900">ไม่มีรายการสลิปในหมวดนี้</div>
            <p className="text-xs sm:text-sm">ทุกรายการได้รับการตรวจสอบเรียบร้อยแล้ว</p>
          </div>
        ) : (
          filteredSlips.map((slip) => (
            <div
              key={slip.id}
              className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 sm:p-5 shadow-xs transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Side: Attendee Info */}
              <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 flex-1">
                {/* Thumbnail */}
                <div
                  onClick={() => setSelectedSlip(slip)}
                  className="w-14 sm:w-16 h-16 sm:h-18 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center shrink-0 cursor-pointer hover:border-[#0026b3]/40 hover:bg-blue-50/50 transition group p-1.5"
                >
                  <Receipt className="w-5 sm:w-6 h-5 sm:h-6 text-[#0026b3] group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 mt-1">ดูสลิป</span>
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900">{slip.nameTh}</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${slip.status === 'approved'
                      ? 'bg-[#4ade80]/20 text-emerald-800 border-[#4ade80]/40 font-bold'
                      : slip.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                      {slip.status === 'approved' ? 'อนุมัติแล้ว' : slip.status === 'rejected' ? 'ปฏิเสธ' : 'รอตรวจสอบ'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">Ref: {slip.refNo}</span>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-600 truncate">{slip.ticketType} • {slip.workplace}</div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 flex-wrap">
                    <span className="font-extrabold text-emerald-700">฿{slip.amount.toLocaleString()}</span>
                    <span>{slip.bank}</span>
                    <span>{slip.transferDate} {slip.transferTime}</span>
                  </div>

                  {slip.rejectionReason && (
                    <div className="text-xs sm:text-sm text-rose-600 font-semibold mt-1">
                      เหตุผลที่ปฏิเสธ: {slip.rejectionReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 md:border-l md:border-slate-100 md:pl-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto justify-end">
                <button
                  onClick={() => setSelectedSlip(slip)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold border border-slate-200 transition cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-[#0026b3]" />
                  <span>ตรวจสลิป</span>
                </button>

                {slip.status === 'approved' && onPrintReceipt && (
                  <button
                    onClick={() => onPrintReceipt(slip)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0026b3] border border-blue-200 text-xs sm:text-sm font-bold transition cursor-pointer"
                    title="พิมพ์ใบเสร็จรับเงิน"
                  >
                    <Printer className="w-4 h-4" />
                    <span>พิมพ์ใบเสร็จ</span>
                  </button>
                )}

                {slip.status === 'pending' && (
                  <>
                    <button
                      onClick={() => onApprove(slip.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>อนุมัติ</span>
                    </button>
                    <button
                      onClick={() => handleOpenReject(slip)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs sm:text-sm font-bold transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>ปฏิเสธ</span>
                    </button>
                  </>
                )}

                {(slip.status === 'approved' || slip.status === 'rejected') && onResetToPending && (
                  <button
                    onClick={() => onResetToPending(slip.id)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold border border-slate-200 transition cursor-pointer"
                    title="รีเซ็ตกลับเป็นรอตรวจสอบ"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>ตรวจใหม่</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slip Preview Modal (Light Theme) */}
      {selectedSlip && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#0026b3]" />
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">ตรวจสอบหลักฐานการโอนเงิน</h3>
              </div>
              <button onClick={() => setSelectedSlip(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Slip Preview Image */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="text-xs sm:text-sm text-slate-600">สลิปโอนเงินสำเร็จจาก {selectedSlip.bank}</div>
              <div className="text-3xl font-extrabold text-slate-900">฿{selectedSlip.amount.toLocaleString()}</div>
              <div className="text-xs font-mono text-slate-500">Ref: {selectedSlip.refNo}</div>
              <div className="text-xs sm:text-sm text-slate-500">{selectedSlip.transferDate} {selectedSlip.transferTime}</div>
            </div>

            {/* Slip Details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between"><span className="text-slate-500">ผู้โอน:</span><span className="font-bold text-slate-900">{selectedSlip.nameTh}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">บัตรลงทะเบียน:</span><span className="font-bold text-[#0026b3]">{selectedSlip.ticketType}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">สถานที่ทำงาน:</span><span className="text-slate-700 font-medium">{selectedSlip.workplace}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">เบอร์โทร:</span><span className="text-slate-700 font-medium">{selectedSlip.phone}</span></div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {selectedSlip.status === 'approved' && onPrintReceipt && (
                <button
                  onClick={() => {
                    onPrintReceipt(selectedSlip);
                    setSelectedSlip(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ใบเสร็จรับเงิน</span>
                </button>
              )}
              {selectedSlip.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      onApprove(selectedSlip.id);
                      setSelectedSlip(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition cursor-pointer"
                  >
                    อนุมัติการชำระเงิน
                  </button>
                  <button
                    onClick={() => {
                      handleOpenReject(selectedSlip);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-sm transition cursor-pointer"
                  >
                    ปฏิเสธ
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedSlip(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reject Reason Modal */}
      {isRejectModalOpen && selectedSlip && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              ระบุเหตุผลในการปฏิเสธสลิป
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">ระบบจะส่งข้อความแจ้งเตือนไปยังผู้ลงทะเบียนเพื่อให้ดำเนินการแนบสลิปใหม่</p>

            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700">เหตุผล</label>
              <textarea
                rows={3}
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold cursor-pointer shadow-xs"
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ─── 5. VERIFY ATTENDEES PANEL (Light Theme with Round Filter) ───────────── */

function VerifyAttendeesPanel({
  attendees,
  meetings,
  onToggleCheckIn,
  onAddAttendee,
  onPrintReceipt,
}: {
  attendees: AttendeeItem[];
  meetings: MeetingItem[];
  onToggleCheckIn: (id: string) => void;
  onAddAttendee?: (newAttendee: AttendeeItem) => void;
  onPrintReceipt?: (attendee: AttendeeItem) => void;
}) {
  // Find current ongoing meeting (or first upcoming, or fallback to first meeting)
  const currentOngoingMeeting = useMemo(() => {
    return meetings.find((m) => m.status === 'ongoing') || meetings.find((m) => m.status === 'upcoming') || meetings[0];
  }, [meetings]);

  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('default');

  const activeMeetingId = selectedMeetingId === 'default'
    ? (currentOngoingMeeting ? currentOngoingMeeting.id : 'all')
    : selectedMeetingId;

  const currentMeeting = meetings.find((m) => m.id === activeMeetingId);

  const [search, setSearch] = useState('');
  const [filterCheckIn, setFilterCheckIn] = useState<'all' | 'checked_in' | 'not_checked_in'>('all');
  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'pending'>('all');
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeItem | null>(null);

  // Pagination state (default: 5 items per page to reduce heavy DOM loads)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // Walk-in modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [walkInData, setWalkInData] = useState({
    nameTh: '',
    nameEn: '',
    id4Digits: '',
    phone: '',
    email: '',
    workplace: '',
    meetingId: meetings[0]?.id || '',
    memberType: 'แพทย์เวชศาสตร์การเจริญพันธุ์ (RM)',
    ticketType: 'THAISRM Congress Full Pass',
    paymentStatus: 'paid' as 'paid' | 'pending',
    checkInNow: true,
  });

  const handleCreateWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInData.nameTh || !walkInData.phone) {
      alert('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }

    const meeting = meetings.find((m) => m.id === walkInData.meetingId) || meetings[0];
    const newAttendee: AttendeeItem = {
      id: `ATT-${Date.now()}`,
      code: Math.floor(100100 + Math.random() * 9000).toString(),
      nameTh: walkInData.nameTh,
      nameEn: walkInData.nameEn || walkInData.nameTh,
      id4Digits: walkInData.id4Digits || walkInData.phone.slice(-4),
      email: walkInData.email || 'attendee@thaisrm.org',
      phone: walkInData.phone,
      workplace: walkInData.workplace || 'โรงพยาบาล/คลินิก',
      memberType: walkInData.memberType,
      ticketType: walkInData.ticketType,
      ticketCode: `TSRM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      meetingId: meeting?.id || '',
      meetingTitle: meeting?.titleTh || 'การประชุมวิชาการประจำปี THAISRM Congress 2026',
      registeredDate: '10 ก.ย. 2569',
      paymentStatus: walkInData.paymentStatus,
      checkInStatus: walkInData.checkInNow ? 'checked_in' : 'not_checked_in',
      checkInTime: walkInData.checkInNow ? '10:30 น.' : undefined,
    };

    onAddAttendee?.(newAttendee);
    setIsAddModalOpen(false);
    setWalkInData({
      nameTh: '',
      nameEn: '',
      id4Digits: '',
      phone: '',
      email: '',
      workplace: '',
      meetingId: meetings[0]?.id || '',
      memberType: 'แพทย์เวชศาสตร์การเจริญพันธุ์ (RM)',
      ticketType: 'THAISRM Congress Full Pass',
      paymentStatus: 'paid',
      checkInNow: true,
    });
  };

  // Filter attendees by selected round first
  const roundAttendees = useMemo(() => {
    if (activeMeetingId === 'all') return attendees;
    return attendees.filter(
      (a) =>
        a.meetingId === activeMeetingId ||
        (currentMeeting && a.meetingTitle === currentMeeting.titleTh)
    );
  }, [attendees, activeMeetingId, currentMeeting]);

  // Secondary filtering (search, check-in status, payment status)
  const filteredAttendees = useMemo(() => {
    return roundAttendees.filter((a) => {
      const matchStatus = filterCheckIn === 'all' || a.checkInStatus === filterCheckIn;
      const matchPayment = filterPayment === 'all' || a.paymentStatus === filterPayment;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        a.nameTh.toLowerCase().includes(q) ||
        a.nameEn.toLowerCase().includes(q) ||
        a.id4Digits.includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        a.workplace.toLowerCase().includes(q) ||
        a.ticketCode.toLowerCase().includes(q);
      return matchStatus && matchPayment && matchSearch;
    });
  }, [roundAttendees, filterCheckIn, filterPayment, search]);

  // Total pages and Paginated Slice (5 items per page default)
  const totalPages = Math.max(1, Math.ceil(filteredAttendees.length / pageSize));
  
  // Reset current page when filters change or if current page exceeds total pages
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMeetingId, filterCheckIn, filterPayment, search, pageSize]);

  const paginatedAttendees = useMemo(() => {
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (validPage - 1) * pageSize;
    return filteredAttendees.slice(startIndex, startIndex + pageSize);
  }, [filteredAttendees, currentPage, pageSize, totalPages]);

  // Statistics for the selected round
  const totalInRound = roundAttendees.length;
  const checkedInInRound = roundAttendees.filter((a) => a.checkInStatus === 'checked_in').length;
  const notCheckedInInRound = totalInRound - checkedInInRound;
  const paidInRound = roundAttendees.filter((a) => a.paymentStatus === 'paid').length;
  const rateInRound = totalInRound > 0 ? Math.round((checkedInInRound / totalInRound) * 100) : 0;

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = ['รหัสสมาชิก', 'เลขท้าย 4 หลัก', 'ชื่อ-นามสกุล (ไทย)', 'ชื่อ-นามสกุล (อังกฤษ)', 'อีเมล', 'โทรศัพท์', 'สถานที่ทำงาน', 'ประเภทสมาชิก', 'ประเภทบัตร', 'รหัสตั๋ว', 'รอบการประชุม', 'สถานะชำระเงิน', 'สถานะเช็คอิน', 'เวลาเช็คอิน'];
    const rows = filteredAttendees.map((a) => [
      a.code,
      a.id4Digits,
      `"${a.nameTh}"`,
      `"${a.nameEn}"`,
      a.email,
      a.phone,
      `"${a.workplace}"`,
      `"${a.memberType}"`,
      `"${a.ticketType}"`,
      a.ticketCode,
      `"${a.meetingTitle}"`,
      a.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระ',
      a.checkInStatus === 'checked_in' ? 'เช็คอินแล้ว' : 'ยังไม่เข้าร่วม',
      a.checkInTime || '-',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const roundSlug = selectedMeetingId === 'all' ? 'all-rounds' : selectedMeetingId.toLowerCase();
    link.setAttribute('download', `attendees_${roundSlug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0026b3] text-xs font-bold mb-2">
            <UserCheck className="w-4 h-4 text-[#0026b3]" />
            <span>ระบบตรวจสอบรายชื่อและเช็คอินผู้เข้าร่วมประชุม</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">ตรวจสอบผู้เข้าร่วมประชุม</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            ค้นหาข้อมูลสมาชิก ตรวจสอบการลงทะเบียน และบันทึกการเช็คอินแยกตามรอบการประชุม
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#4ade80]" />
            <span>+ ลงทะเบียน Walk-in</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export รายชื่อ ({filteredAttendees.length})</span>
          </button>
        </div>
      </div>

      {/* ─── Meeting Round Filter Selector (Dropdown Format) ─────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-slate-700 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#0026b3]" />
            <span>เลือกรอบการประชุม (Select Meeting Round):</span>
          </label>
          <span className="text-xs text-slate-500 font-medium">
            ผู้ลงทะเบียนในรอบที่เลือก: <strong className="text-[#0026b3] font-bold">{roundAttendees.length}</strong> คน • เช็คอินแล้ว <strong className="text-emerald-700 font-bold">{checkedInInRound}</strong> คน
          </span>
        </div>

        <div className="relative">
          <select
            value={activeMeetingId}
            onChange={(e) => setSelectedMeetingId(e.target.value)}
            className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm font-bold rounded-xl pl-11 pr-10 py-3 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition cursor-pointer shadow-xs"
          >
            {meetings.map((m) => {
              const isOngoing = m.status === 'ongoing';
              const isUpcoming = m.status === 'upcoming';
              const mAttendees = attendees.filter(
                (a) => a.meetingId === m.id || a.meetingTitle === m.titleTh
              );
              const mChecked = mAttendees.filter((a) => a.checkInStatus === 'checked_in').length;
              return (
                <option key={m.id} value={m.id}>
                  {isOngoing ? '🟢 [รอบปัจจุบัน] ' : isUpcoming ? '🟡 [เร็วๆ นี้] ' : '📅 '}
                  [{m.id}] {m.titleTh} ({m.date}) — เช็คอิน {mChecked}/{mAttendees.length || m.registered} คน
                </option>
              );
            })}
            <option value="all">
              🌐 รวมทุกรอบการประชุม (All Rounds) — รวมทั้งหมด {attendees.length} คน
            </option>
          </select>
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#0026b3]">
            <CalendarDays className="w-5 h-5" />
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* ─── Selected Round Info & Key Stats ─────────────────────────────── */}
      {currentMeeting ? (
        <div className="bg-gradient-to-r from-blue-50/60 via-slate-50 to-white border border-blue-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-[#0026b3] bg-blue-100 px-2.5 py-0.5 rounded-md">
                  {currentMeeting.id}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${currentMeeting.status === 'ongoing'
                    ? 'bg-[#4ade80]/15 text-emerald-800 border-[#4ade80]/40'
                    : currentMeeting.status === 'upcoming'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                >
                  {currentMeeting.status === 'ongoing'
                    ? '● กำลังดำเนินการ'
                    : currentMeeting.status === 'upcoming'
                      ? 'รอเริ่มงาน'
                      : 'เสร็จสิ้น'}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#0026b3] border border-blue-200 uppercase">
                  {currentMeeting.type}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {currentMeeting.titleTh}
              </h2>
              <div className="text-xs sm:text-sm text-slate-500 font-medium">
                {currentMeeting.titleEn}
              </div>
              <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-600 flex-wrap pt-1">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-[#0026b3]" /> {currentMeeting.date} ({currentMeeting.time})
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#0026b3]" /> {currentMeeting.location}
                </span>
              </div>
            </div>

            {/* Quick Metrics in Current Round */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-blue-200/60 shrink-0 text-center shadow-xs">
              <div className="px-2">
                <div className="text-[11px] text-slate-500 font-bold">ผู้ลงทะเบียน</div>
                <div className="text-base sm:text-lg font-extrabold text-slate-900">
                  {totalInRound} <span className="text-xs text-slate-400 font-normal">/ {currentMeeting.maxSeats}</span>
                </div>
              </div>
              <div className="px-2 border-l border-slate-100">
                <div className="text-[11px] text-slate-500 font-bold">เช็คอินแล้ว</div>
                <div className="text-base sm:text-lg font-extrabold text-emerald-600">
                  {checkedInInRound}
                </div>
              </div>
              <div className="px-2 border-l border-slate-100">
                <div className="text-[11px] text-slate-500 font-bold">ยังไม่เช็คอิน</div>
                <div className="text-base sm:text-lg font-extrabold text-amber-600">
                  {notCheckedInInRound}
                </div>
              </div>
              <div className="px-2 border-l border-slate-100">
                <div className="text-[11px] text-slate-500 font-bold">อัตราเช็คอิน</div>
                <div className="text-base sm:text-lg font-extrabold text-[#0026b3]">
                  {rateInRound}%
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>ความคืบหน้าการเช็คอินเข้างานรอบนี้</span>
              <span className="font-extrabold text-[#0026b3]">{rateInRound}% ({checkedInInRound}/{totalInRound} คน)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0026b3] to-[#4ade80] rounded-full transition-all duration-500"
                style={{ width: `${rateInRound}%` }}
              ></div>
            </div>
          </div>
        </div>
      ) : (
        /* Overall Progress & Quick Stats Card (When All Rounds selected) */
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700">อัตราการเช็คอินเข้างานรวมทุกรอบการประชุม</span>
              <span className="text-sm font-extrabold text-[#0026b3]">
                ({checkedInInRound}/{totalInRound} คน)
              </span>
            </div>
            <span className="text-base font-extrabold text-emerald-700">{rateInRound}% สำเร็จ</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#0026b3] to-[#4ade80] rounded-full transition-all duration-700"
              style={{ width: `${rateInRound}%` }}
            ></div>
          </div>

          {/* 4 Summary Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center text-xs sm:text-sm">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-slate-500 font-medium text-xs">จำนวนรอบประชุม</div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">{meetings.length} รอบ</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-slate-500 font-medium text-xs">ผู้ลงทะเบียนทั้งหมด</div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">{totalInRound} คน</div>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
              <div className="text-emerald-700 font-medium text-xs">เช็คอินเข้างานแล้ว</div>
              <div className="text-base font-extrabold text-emerald-800 mt-0.5">{checkedInInRound} คน</div>
            </div>
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
              <div className="text-amber-700 font-medium text-xs">ยังไม่เข้างาน</div>
              <div className="text-base font-extrabold text-amber-800 mt-0.5">{notCheckedInInRound} คน</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Search & Secondary Filter Bar ───────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 flex-1 shadow-xs focus-within:ring-2 focus-within:ring-[#0026b3]/20 focus-within:border-[#0026b3]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ-นามสกุล, เลขสมาชิก, เลข 4 ตัวท้าย, สังกัด, รหัสตั๋ว..."
            className="bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none w-full"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-slate-400 hover:text-slate-600 text-xs p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Badges & Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Check-In Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
            {[
              { id: 'all', label: `ทั้งหมด (${roundAttendees.length})` },
              { id: 'checked_in', label: `เช็คอินแล้ว (${checkedInInRound})` },
              { id: 'not_checked_in', label: `ยังไม่เข้าร่วม (${notCheckedInInRound})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterCheckIn(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${filterCheckIn === tab.id
                  ? 'bg-[#0026b3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Payment Status Dropdown */}
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value as any)}
            className="bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none shadow-xs cursor-pointer focus:border-[#0026b3]"
          >
            <option value="all">การชำระเงิน: ทั้งหมด</option>
            <option value="paid">ชำระแล้ว ({roundAttendees.filter((a) => a.paymentStatus === 'paid').length})</option>
            <option value="pending">รอชำระ ({roundAttendees.filter((a) => a.paymentStatus === 'pending').length})</option>
          </select>
        </div>
      </div>

      {/* ─── Attendees Table ─────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs bg-white">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
              <th className="px-5 py-3.5">รหัสสมาชิก</th>
              <th className="px-5 py-3.5">ชื่อ-นามสกุล / สังกัด</th>
              <th className="px-5 py-3.5">รอบการประชุม</th>
              <th className="px-5 py-3.5">ประเภทสมาชิก / ตั๋ว</th>
              <th className="px-5 py-3.5">การชำระเงิน</th>
              <th className="px-5 py-3.5">สถานะเช็คอิน</th>
              <th className="px-5 py-3.5 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredAttendees.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <div className="font-bold text-slate-700">ไม่พบข้อมูลผู้เข้าร่วมตามเงื่อนไขที่เลือก</div>
                  <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาหรือเลือกตัวกรองรอบการประชุมใหม่</p>
                </td>
              </tr>
            ) : (
              paginatedAttendees.map((a) => {
                const meeting = meetings.find((m) => m.id === a.meetingId || m.titleTh === a.meetingTitle);

                return (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition group">
                    <td className="px-5 py-4 font-mono text-slate-700 font-bold">
                      {a.code}
                      <div className="text-xs text-slate-400 font-normal">ID4: {a.id4Digits}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 group-hover:text-[#0026b3] transition">
                        {a.nameTh}
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-[220px]">{a.workplace}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-[#0026b3] border border-blue-200 max-w-[200px] truncate">
                        <CalendarDays className="w-3 h-3 shrink-0 text-[#0026b3]" />
                        <span className="truncate">{meeting ? meeting.titleTh : a.meetingTitle}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-slate-700 font-semibold">{a.memberType}</div>
                      <div className="text-xs text-[#0026b3] font-mono font-medium">{a.ticketCode}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${a.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                      >
                        {a.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {a.checkInStatus === 'checked_in' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5" /> เช็คอินแล้ว
                          </span>
                          <div className="text-xs text-slate-500 mt-0.5">{a.checkInTime}</div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                          <XCircle className="w-3.5 h-3.5" /> ยังไม่เข้าร่วม
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {a.paymentStatus === 'paid' && onPrintReceipt && (
                          <button
                            onClick={() => onPrintReceipt(a)}
                            className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0026b3] border border-blue-200 transition cursor-pointer"
                            title="พิมพ์ใบเสร็จรับเงิน"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onToggleCheckIn(a.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${a.checkInStatus === 'checked_in'
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            : 'bg-[#0026b3] hover:bg-[#001f94] text-white shadow-xs'
                            }`}
                        >
                          {a.checkInStatus === 'checked_in' ? 'ยกเลิก' : 'เช็คอิน'}
                        </button>
                        <button
                          onClick={() => setSelectedAttendee(a)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Pagination Controls Bar (Default 5 items) ───────────────────── */}
      {filteredAttendees.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-600 font-medium">
            <span>
              แสดง <strong className="text-slate-900 font-bold">{(currentPage - 1) * pageSize + 1}</strong> - <strong className="text-slate-900 font-bold">{Math.min(currentPage * pageSize, filteredAttendees.length)}</strong> จากทั้งหมด <strong className="text-slate-900 font-bold">{filteredAttendees.length.toLocaleString()}</strong> รายชื่อ
            </span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">แสดงหน้าละ:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0026b3] cursor-pointer"
              >
                <option value={5}>5 รายชื่อ</option>
                <option value={10}>10 รายชื่อ</option>
                <option value={20}>20 รายชื่อ</option>
                <option value={50}>50 รายชื่อ</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition ${
                currentPage === 1
                  ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">ก่อนหน้า</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;

                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-slate-400 text-xs">...</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                          currentPage === p
                            ? 'bg-[#0026b3] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition ${
                currentPage === totalPages
                  ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs'
              }`}
            >
              <span className="hidden sm:inline">ถัดไป</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Attendee Details Modal ──────────────────────────────────────── */}
      {selectedAttendee && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#0026b3]" />
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">รายละเอียดข้อมูลผู้เข้าร่วม</h3>
              </div>
              <button
                onClick={() => setSelectedAttendee(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-lg font-extrabold text-slate-900">{selectedAttendee.nameTh}</div>
                <div className="text-xs text-slate-500">{selectedAttendee.nameEn}</div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-500">รหัสสมาชิก:</span>{' '}
                    <span className="font-bold text-[#0026b3]">{selectedAttendee.code}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">ID 4 ตัวท้าย:</span>{' '}
                    <span className="font-bold text-slate-800">{selectedAttendee.id4Digits}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">โทรศัพท์:</span>{' '}
                    <span className="text-slate-800 font-medium">{selectedAttendee.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">อีเมล:</span>{' '}
                    <span className="text-slate-800 truncate font-medium">{selectedAttendee.email}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">รอบการประชุม:</span>
                  <span className="text-[#0026b3] font-bold text-right max-w-[260px]">{selectedAttendee.meetingTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">สถานที่ทำงาน:</span>
                  <span className="text-slate-800 font-bold">{selectedAttendee.workplace}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ประเภทสมาชิก:</span>
                  <span className="text-slate-800 font-bold">{selectedAttendee.memberType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ประเภทบัตร:</span>
                  <span className="text-emerald-700 font-bold">{selectedAttendee.ticketType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">รหัสตั๋ว:</span>
                  <span className="font-mono font-bold text-[#0026b3]">{selectedAttendee.ticketCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">สถานะการชำระเงิน:</span>
                  <span className={`font-bold ${selectedAttendee.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {selectedAttendee.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2.5 pt-2">
              {selectedAttendee.paymentStatus === 'paid' && onPrintReceipt && (
                <button
                  onClick={() => {
                    onPrintReceipt(selectedAttendee);
                    setSelectedAttendee(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-sm shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ใบเสร็จ</span>
                </button>
              )}
              <button
                onClick={() => {
                  onToggleCheckIn(selectedAttendee.id);
                  setSelectedAttendee(null);
                }}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer shadow-xs transition ${selectedAttendee.checkInStatus === 'checked_in'
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-[#0026b3] hover:bg-[#001f94] text-white'
                  }`}
              >
                {selectedAttendee.checkInStatus === 'checked_in' ? 'ยกเลิกการเช็คอิน' : 'เช็คอินผู้เข้าร่วมทันที'}
              </button>
              <button
                onClick={() => setSelectedAttendee(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Walk-in Registration Modal */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#0026b3]">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  ลงทะเบียนผู้เข้าร่วมหน้างาน (Walk-in)
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWalkIn} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รอบการประชุมที่ลงทะเบียน *
                </label>
                <select
                  value={walkInData.meetingId}
                  onChange={(e) => setWalkInData({ ...walkInData, meetingId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  required
                >
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.titleTh} ({m.date})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อ-นามสกุล (ภาษาไทย) *
                  </label>
                  <input
                    type="text"
                    required
                    value={walkInData.nameTh}
                    onChange={(e) => setWalkInData({ ...walkInData, nameTh: e.target.value })}
                    placeholder="เช่น นพ.สมศักดิ์ สุขใจ"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อ-นามสกุล (ภาษาอังกฤษ)
                  </label>
                  <input
                    type="text"
                    value={walkInData.nameEn}
                    onChange={(e) => setWalkInData({ ...walkInData, nameEn: e.target.value })}
                    placeholder="e.g. Dr. Somsak Sookjai"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เบอร์โทรศัพท์ติดต่อ *
                  </label>
                  <input
                    type="tel"
                    required
                    value={walkInData.phone}
                    onChange={(e) => setWalkInData({ ...walkInData, phone: e.target.value })}
                    placeholder="081-234-5678"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เลขท้าย 4 หลักบัตรประชาชน
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={walkInData.id4Digits}
                    onChange={(e) => setWalkInData({ ...walkInData, id4Digits: e.target.value })}
                    placeholder="1234"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    อีเมล (Email)
                  </label>
                  <input
                    type="email"
                    value={walkInData.email}
                    onChange={(e) => setWalkInData({ ...walkInData, email: e.target.value })}
                    placeholder="doctor@hospital.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หน่วยงาน / สถานที่ทำงาน
                  </label>
                  <input
                    type="text"
                    value={walkInData.workplace}
                    onChange={(e) => setWalkInData({ ...walkInData, workplace: e.target.value })}
                    placeholder="เช่น รพ.รามาธิบดี"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ประเภทสมาชิก
                  </label>
                  <select
                    value={walkInData.memberType}
                    onChange={(e) => setWalkInData({ ...walkInData, memberType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  >
                    <option value="แพทย์เวชศาสตร์การเจริญพันธุ์ (RM)">แพทย์เวชศาสตร์การเจริญพันธุ์ (RM)</option>
                    <option value="สูตินรีแพทย์ทั่วไป (OB-GYN)">สูตินรีแพทย์ทั่วไป (OB-GYN)</option>
                    <option value="นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อน (Embryologist)">นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อน (Embryologist)</option>
                    <option value="พยาบาลและบุคลากรทางการแพทย์">พยาบาลและบุคลากรทางการแพทย์</option>
                    <option value="สมาชิกทั่วไป">สมาชิกทั่วไป</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ประเภทบัตร
                  </label>
                  <select
                    value={walkInData.ticketType}
                    onChange={(e) => setWalkInData({ ...walkInData, ticketType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-[#0026b3]"
                  >
                    <option value="THAISRM Congress Full Pass">THAISRM Congress Full Pass (3,500 บาท)</option>
                    <option value="Special Workshop: Hands-on Embryo">Special Workshop (5,000 บาท)</option>
                    <option value="Single Day Pass: Day 1">Single Day Pass: Day 1 (2,000 บาท)</option>
                    <option value="Single Day Pass: Day 2">Single Day Pass: Day 2 (2,000 บาท)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentStatus"
                      checked={walkInData.paymentStatus === 'paid'}
                      onChange={() => setWalkInData({ ...walkInData, paymentStatus: 'paid' })}
                      className="accent-[#0026b3]"
                    />
                    <span className="text-xs font-bold text-emerald-700">ชำระเงินแล้ว (Paid)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentStatus"
                      checked={walkInData.paymentStatus === 'pending'}
                      onChange={() => setWalkInData({ ...walkInData, paymentStatus: 'pending' })}
                      className="accent-[#0026b3]"
                    />
                    <span className="text-xs font-bold text-amber-700">รอชำระ (Pending)</span>
                  </label>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-blue-50/80 px-3 py-1.5 rounded-xl border border-blue-200/60">
                  <input
                    type="checkbox"
                    checked={walkInData.checkInNow}
                    onChange={(e) => setWalkInData({ ...walkInData, checkInNow: e.target.checked })}
                    className="rounded accent-[#0026b3] w-4 h-4"
                  />
                  <span className="text-xs font-bold text-[#0026b3]">เช็คอินเข้างานทันที</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#0026b3]/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-[#4ade80]" />
                  <span>บันทึกผู้เข้าร่วม</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ─── MAIN ADMIN ROOT COMPONENT ───────────────────────────────────────────── */

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [meetings, setMeetings] = useState<MeetingItem[]>(INITIAL_MEETINGS);
  const [slips, setSlips] = useState<SlipItem[]>(INITIAL_SLIPS);
  const [attendees, setAttendees] = useState<AttendeeItem[]>(INITIAL_ATTENDEES);
  const [receipts, setReceipts] = useState<ReceiptData[]>(INITIAL_RECEIPTS);
  const [membersCount, setMembersCount] = useState<number>(0);

  // ─── 1. Fetch meetings from API on mount ───
  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch('/api/meetings?limit=100&sort_by=meeting_date&order=desc');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const formatRangeFromDates = (start?: string | null, end?: string | null) => {
          if (!start) return '';
          const dStart = new Date(start);
          if (isNaN(dStart.getTime())) return '';
          const yStart = dStart.getUTCFullYear() + 543;
          const mStart = dStart.getUTCMonth();
          const dayStart = dStart.getUTCDate();

          const THAI_MONTHS_FULL = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
          ];

          if (!end) {
            return `${dayStart} ${THAI_MONTHS_FULL[mStart]} ${yStart}`;
          }

          const dEnd = new Date(end);
          if (isNaN(dEnd.getTime()) || dStart.toISOString().slice(0, 10) === dEnd.toISOString().slice(0, 10)) {
            return `${dayStart} ${THAI_MONTHS_FULL[mStart]} ${yStart}`;
          }

          const yEnd = dEnd.getUTCFullYear() + 543;
          const mEnd = dEnd.getUTCMonth();
          const dayEnd = dEnd.getUTCDate();

          if (yStart === yEnd && mStart === mEnd) {
            return `${dayStart} - ${dayEnd} ${THAI_MONTHS_FULL[mStart]} ${yStart}`;
          } else if (yStart === yEnd) {
            return `${dayStart} ${THAI_MONTHS_FULL[mStart]} - ${dayEnd} ${THAI_MONTHS_FULL[mEnd]} ${yStart}`;
          } else {
            return `${dayStart} ${THAI_MONTHS_FULL[mStart]} ${yStart} - ${dayEnd} ${THAI_MONTHS_FULL[mEnd]} ${yEnd}`;
          }
        };

        const mapped: MeetingItem[] = json.data.map((m: Record<string, unknown>) => ({
          id: m.meeting_id as string,
          titleTh: m.meeting_name as string,
          titleEn: m.meeting_name as string,
          date: (m.pricing_tiers as any)?.dateRange?.formatted
            || formatRangeFromDates((m.start_date || m.meeting_date) as string, m.end_date as string)
            || (m.meeting_date ? new Date(m.meeting_date as string).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : ''),
          time: (m.meeting_time as string) || '08:30 - 17:00 น.',
          location: (m.location as string) || '',
          type: ((m.meeting_type as string) || 'onsite') as 'hybrid' | 'onsite' | 'online',
          staffCode: (m.staff_code as string) || '',
          maxSeats: (m.max_seats as number) || 0,
          basePrice: (m.base_price as number) || 0,
          pricingTiers: m.pricing_tiers as MeetingPricingTiers | undefined,
          activities: (m.activities as any[]) || undefined,
          description: (m.description as string) || '',
          registered: ((m._count as Record<string, number>)?.meeting_attendances) || 0,
          attended: (m.attended_count as number) || 0,
          revenue: (m.approved_revenue as number) || 0,
          status: ((m.status as string) || 'upcoming') as 'upcoming' | 'ongoing' | 'completed',
        }));
        // Sort by status priority (ongoing -> upcoming -> completed) then newest sequence
        const STATUS_PRIORITY: Record<string, number> = { ongoing: 1, upcoming: 2, completed: 3 };
        mapped.sort((a, b) => {
          const pA = STATUS_PRIORITY[a.status] || 99;
          const pB = STATUS_PRIORITY[b.status] || 99;
          if (pA !== pB) return pA - pB;
          const numA = parseInt((a.id.match(/\d+/) || ['0'])[0], 10);
          const numB = parseInt((b.id.match(/\d+/) || ['0'])[0], 10);
          if (numA !== numB) return numB - numA;
          return b.id.localeCompare(a.id);
        });
        setMeetings(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    }
  }, []);

  // ─── 2. Fetch slips from API ───
  const fetchSlips = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/slips');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const mapped: SlipItem[] = json.data.map((s: any) => ({
          id: s.id,
          refNo: s.refNo,
          nameTh: s.nameTh,
          nameEn: s.nameEn || '',
          email: s.email,
          phone: s.phone,
          memberCode: s.memberNo || undefined,
          workplace: s.workplace,
          ticketType: s.ticketType,
          meetingId: s.meetingId,
          amount: s.amount,
          bank: s.bank,
          transferDate: s.transferDate,
          transferTime: s.transferTime,
          slipUrl: s.slipUrl,
          status: s.status,
          rejectionReason: s.notes,
        }));
        setSlips(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch slips:', err);
    }
  }, []);

  // ─── 3. Fetch attendees from real DB API ───
  const fetchAttendees = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/attendees');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAttendees(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch attendees:', err);
    }
  }, []);

  // ─── 4. Fetch total members count from DB ───
  const fetchMembersCount = useCallback(async () => {
    try {
      const res = await fetch('/api/members?limit=1');
      const json = await res.json();
      if (json.success) {
        setMembersCount(json.stats?.total || json.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch members count:', err);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
    fetchSlips();
    fetchAttendees();
    fetchMembersCount();
  }, [fetchMeetings, fetchSlips, fetchAttendees, fetchMembersCount]);

  // ─── 5. Auto-populate Receipts from approved slips ───
  useEffect(() => {
    const approvedSlips = slips.filter((s) => s.status === 'approved');
    if (approvedSlips.length > 0) {
      const generatedReceipts: ReceiptData[] = approvedSlips.map((slip) => {
        const m = meetings.find((mtg) => mtg.id === slip.meetingId);
        return {
          id: `REC-${slip.id}`,
          receiptNo: `2569/${slip.id.slice(0, 8).toUpperCase()}`,
          receiptDate: slip.transferDate || new Date().toLocaleDateString('th-TH'),
          purposeText: 'ได้รับเงินค่าลงทะเบียน ประจำปี 2569',
          payerType: 'individual',
          payerName: slip.nameTh,
          payerAddressLine1: slip.workplace || 'กรุงเทพมหานคร',
          payerAddressLine2: 'กรุงเทพมหานคร 10330',
          payerPhone: slip.phone,
          items: [
            {
              id: `item-${slip.id}`,
              itemNumber: 1,
              title: `ค่าลงทะเบียน ${slip.ticketType}`,
              subDetails: [
                m ? m.titleTh : 'การประชุมวิชาการประจำปี THAISRM Congress 2026',
                m ? `จัดขึ้นวันที่ ${m.date}` : 'จัดขึ้นวันที่ 10-12 มีนาคม 2569',
                m ? m.location : 'โรงแรมอีสติน แกรนด์ พญาไท กรุงเทพฯ',
              ],
              amount: slip.amount,
            },
          ],
          totalAmount: slip.amount,
          payerSignerRole: 'ผู้จ่ายเงิน',
          authorizedSignerName: 'แพทย์หญิงพิมพกา ชวนะเวสน์',
          authorizedSignerRole: '',
          preparedByName: 'ปณตพร ภวภูตานนท์ ณ มหาสารคาม',
          preparedByRole: 'ผู้จัดทำ',
          meetingId: slip.meetingId,
          slipId: slip.id,
          createdAt: new Date().toISOString().split('T')[0],
          status: 'issued',
        };
      });

      setReceipts((prev) => {
        const customOnes = prev.filter((r) => !r.slipId);
        const uniqueKeys = new Set();
        const merged: ReceiptData[] = [];
        [...customOnes, ...generatedReceipts].forEach((r) => {
          const key = r.slipId || r.id;
          if (!uniqueKeys.has(key)) {
            uniqueKeys.add(key);
            merged.push(r);
          }
        });
        return merged;
      });
    }
  }, [slips, meetings]);

  // Global Receipt Modal for quick print from attendees/slips
  const [globalReceipt, setGlobalReceipt] = useState<ReceiptData | null>(null);
  const [isGlobalReceiptOpen, setIsGlobalReceiptOpen] = useState(false);

  // Find current ongoing meeting for global badges
  const currentOngoingMeeting = useMemo(() => {
    return meetings.find((m) => m.status === 'ongoing') || meetings.find((m) => m.status === 'upcoming') || meetings[0];
  }, [meetings]);

  const ongoingAttendees = useMemo(() => {
    if (!currentOngoingMeeting) return attendees;
    return attendees.filter(
      (a) => a.meetingId === currentOngoingMeeting.id || a.meetingTitle === currentOngoingMeeting.titleTh
    );
  }, [attendees, currentOngoingMeeting]);

  const pendingSlipsCount = slips.filter((s) => s.status === 'pending').length;
  const ongoingCheckedInCount = ongoingAttendees.filter((a) => a.checkInStatus === 'checked_in').length;

  const handleApproveSlip = async (slipId: string) => {
    try {
      const res = await fetch('/api/admin/slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slipId, action: 'approve' }),
      });
      const json = await res.json();
      if (json.success) {
        fetchSlips();
        fetchMeetings();
        fetchAttendees();
        setGlobalToastMessage('อนุมัติสลิปและปรับปรุงสถานะผู้เข้าร่วมเรียบร้อยแล้ว');
        setTimeout(() => setGlobalToastMessage(null), 4000);
      }
    } catch (err) {
      console.error('Failed to approve slip:', err);
    }
  };

  const handleRejectSlip = async (slipId: string, reason: string) => {
    try {
      const res = await fetch('/api/admin/slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slipId, action: 'reject', notes: reason }),
      });
      const json = await res.json();
      if (json.success) {
        fetchSlips();
        fetchMeetings();
        fetchAttendees();
        setGlobalToastMessage('ปฏิเสธสลิปและส่งอีเมลแจ้งผู้สมัครแล้ว');
        setTimeout(() => setGlobalToastMessage(null), 4000);
      }
    } catch (err) {
      console.error('Failed to reject slip:', err);
    }
  };

  const handleResetSlip = async (slipId: string) => {
    try {
      const res = await fetch('/api/admin/slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slipId, action: 'reset' }),
      });
      const json = await res.json();
      if (json.success) {
        fetchSlips();
        fetchMeetings();
        fetchAttendees();
      }
    } catch (err) {
      console.error('Failed to reset slip:', err);
    }
  };

  const handleToggleCheckIn = async (attendeeId: string) => {
    const targetAttendee = attendees.find((a) => a.id === attendeeId);
    if (!targetAttendee) return;
    const nextStatus = targetAttendee.checkInStatus === 'checked_in' ? 'not_checked_in' : 'checked_in';

    // Optimistic UI update
    setAttendees((prev) =>
      prev.map((a) => {
        if (a.id === attendeeId) {
          return {
            ...a,
            checkInStatus: nextStatus,
            checkInTime:
              nextStatus === 'checked_in'
                ? new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
                : undefined,
          };
        }
        return a;
      })
    );

    // Sync to backend DB
    try {
      const res = await fetch('/api/admin/attendees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: attendeeId,
          action: nextStatus === 'checked_in' ? 'checkin' : 'checkout',
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchMeetings();
      }
    } catch (err) {
      console.error('Failed to update check-in in DB:', err);
    }
  };

  const handleAddAttendee = async (newAttendee: AttendeeItem) => {
    // Optimistic UI update
    setAttendees((prev) => [newAttendee, ...prev]);

    // Persist to real DB
    try {
      const res = await fetch('/api/admin/attendees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: newAttendee.meetingId,
          nameTh: newAttendee.nameTh,
          nameEn: newAttendee.nameEn,
          phone: newAttendee.phone,
          email: newAttendee.email,
          workplace: newAttendee.workplace,
          memberType: newAttendee.memberType,
          ticketType: newAttendee.ticketType,
          paymentStatus: newAttendee.paymentStatus,
          checkInNow: newAttendee.checkInStatus === 'checked_in',
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchAttendees();
        fetchMeetings();
        fetchSlips();
        setGlobalToastMessage(`บันทึกผู้เข้าร่วม "${newAttendee.nameTh}" ลงฐานข้อมูลเรียบร้อยแล้ว!`);
        setTimeout(() => setGlobalToastMessage(null), 4000);
      }
    } catch (err) {
      console.error('Failed to save walk-in attendee to DB:', err);
    }
  };

  const handleUpdateMeetingStatus = async (meetingId: string, status: 'upcoming' | 'ongoing' | 'completed') => {
    // Optimistic update
    setMeetings((prev) =>
      prev.map((m) => (m.id === meetingId ? { ...m, status } : m))
    );
    // Sync to API
    try {
      await fetch(`/api/meetings/${meetingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchMeetings();
    } catch (err) {
      console.error('Failed to update meeting status:', err);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    // Optimistic update
    setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
    // Sync to API
    try {
      await fetch(`/api/meetings/${meetingId}`, { method: 'DELETE' });
      fetchMeetings();
    } catch (err) {
      console.error('Failed to delete meeting:', err);
    }
  };

  const handleMeetingCreated = (newMeeting: MeetingItem) => {
    setMeetings((prev) => [newMeeting, ...prev]);
    fetchMeetings();
  };

  // Receipt Handlers
  const handleSaveReceipt = (receipt: ReceiptData) => {
    setReceipts((prev) => {
      const idx = prev.findIndex((r) => r.id === receipt.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = receipt;
        return next;
      }
      return [receipt, ...prev];
    });
  };

  const handleDeleteReceipt = (id: string) => {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  };

  const handlePrintAttendeeReceipt = (attendee: AttendeeItem) => {
    const existing = receipts.find((r) => r.attendeeId === attendee.id);
    if (existing) {
      setGlobalReceipt(existing);
      setIsGlobalReceiptOpen(true);
      return;
    }

    const m = meetings.find((mtg) => mtg.id === attendee.meetingId || mtg.titleTh === attendee.meetingTitle);

    let amount = 3500;
    if (attendee.ticketType.includes('Workshop')) amount = 5000;
    if (attendee.ticketType.includes('Day')) amount = 2000;

    const newReceipt: ReceiptData = {
      id: `REC-${Date.now()}`,
      receiptNo: `2569/03-${Math.floor(Math.random() * 900 + 100)}`,
      receiptDate: '10 มีนาคม 2569',
      purposeText: 'ได้รับเงินค่าลงทะเบียน ประจำปี 2569',
      payerType: 'individual',
      payerName: attendee.nameTh,
      payerAddressLine1: attendee.workplace || 'กรุงเทพมหานคร',
      payerAddressLine2: 'กรุงเทพมหานคร 10330',
      payerPhone: attendee.phone,
      items: [
        {
          id: `item-${Date.now()}`,
          itemNumber: 1,
          title: `ค่าลงทะเบียน ${attendee.ticketType}`,
          subDetails: [
            attendee.meetingTitle || 'การประชุมวิชาการประจำปี THAISRM Congress 2026',
            m ? `จัดขึ้นวันที่ ${m.date}` : 'จัดขึ้นวันที่ 10-12 มีนาคม 2569',
            m ? m.location : 'โรงแรมอีสติน แกรนด์ พญาไท กรุงเทพฯ',
          ],
          amount: amount,
        },
      ],
      totalAmount: amount,
      payerSignerRole: 'ผู้จ่ายเงิน',
      authorizedSignerName: 'แพทย์หญิงพิมพกา ชวนะเวสน์',
      authorizedSignerRole: '',
      preparedByName: 'ปณตพร ภวภูตานนท์ ณ มหาสารคาม',
      preparedByRole: 'ผู้จัดทำ',
      meetingId: attendee.meetingId,
      attendeeId: attendee.id,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'issued',
    };

    setReceipts((prev) => [newReceipt, ...prev]);
    setGlobalReceipt(newReceipt);
    setIsGlobalReceiptOpen(true);
  };

  const handlePrintSlipReceipt = (slip: SlipItem) => {
    const existing = receipts.find((r) => r.slipId === slip.id);
    if (existing) {
      setGlobalReceipt(existing);
      setIsGlobalReceiptOpen(true);
      return;
    }

    const m = meetings.find((mtg) => mtg.id === slip.meetingId);

    const newReceipt: ReceiptData = {
      id: `REC-${Date.now()}`,
      receiptNo: `2569/03-${Math.floor(Math.random() * 900 + 100)}`,
      receiptDate: slip.transferDate || '10 มีนาคม 2569',
      purposeText: 'ได้รับเงินค่าลงทะเบียน ประจำปี 2569',
      payerType: 'individual',
      payerName: slip.nameTh,
      payerAddressLine1: slip.workplace || 'กรุงเทพมหานคร',
      payerAddressLine2: 'กรุงเทพมหานคร 10330',
      payerPhone: slip.phone,
      items: [
        {
          id: `item-${Date.now()}`,
          itemNumber: 1,
          title: `ค่าลงทะเบียน ${slip.ticketType}`,
          subDetails: [
            m ? m.titleTh : 'การประชุมวิชาการประจำปี THAISRM Congress 2026',
            m ? `จัดขึ้นวันที่ ${m.date}` : 'จัดขึ้นวันที่ 10-12 มีนาคม 2569',
            m ? m.location : 'โรงแรมอีสติน แกรนด์ พญาไท กรุงเทพฯ',
          ],
          amount: slip.amount,
        },
      ],
      totalAmount: slip.amount,
      payerSignerRole: 'ผู้จ่ายเงิน',
      authorizedSignerName: 'แพทย์หญิงพิมพกา ชวนะเวสน์',
      authorizedSignerRole: '',
      preparedByName: 'ปณตพร ภวภูตานนท์ ณ มหาสารคาม',
      preparedByRole: 'ผู้จัดทำ',
      meetingId: slip.meetingId,
      slipId: slip.id,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'issued',
    };

    setReceipts((prev) => [newReceipt, ...prev]);
    setGlobalReceipt(newReceipt);
    setIsGlobalReceiptOpen(true);
  };

  // Meeting Edit Modal State
  const [editingMeeting, setEditingMeeting] = useState<MeetingItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [globalToastMessage, setGlobalToastMessage] = useState<string | null>(null);

  const handleEditMeeting = (m: MeetingItem) => {
    setEditingMeeting(m);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedMeeting = (updatedMeeting: MeetingItem) => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === updatedMeeting.id ? updatedMeeting : m))
    );
    fetchMeetings();
    setGlobalToastMessage(`บันทึกการแก้ไขการประชุม "${updatedMeeting.titleTh}" สำเร็จเรียบร้อยแล้ว!`);
    setTimeout(() => setGlobalToastMessage(null), 5000);
  };

  const renderActivePanel = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardOverviewPanel
            onNavigateTab={setActiveTab}
            meetings={meetings}
            slips={slips}
            attendees={attendees}
            onEditMeeting={handleEditMeeting}
          />
        );
      case 'members':
        return <MemberManagementPanel />;
      case 'revenue-report':
        return (
          <RevenueReportPanel
            meetings={meetings}
            slips={slips}
            attendees={attendees}
          />
        );
      case 'receipts':
        return (
          <ReceiptManagementPanel
            receipts={receipts}
            meetings={meetings}
            onSaveReceipt={handleSaveReceipt}
            onDeleteReceipt={handleDeleteReceipt}
          />
        );
      case 'add-meeting':
        return <AddMeetingPanel onMeetingCreated={handleMeetingCreated} onNavigateTab={setActiveTab} />;
      case 'meeting-history':
        return (
          <MeetingHistoryPanel
            meetings={meetings}
            onNavigateTab={setActiveTab}
            onUpdateStatus={handleUpdateMeetingStatus}
            onDeleteMeeting={handleDeleteMeeting}
            onEditMeeting={handleEditMeeting}
          />
        );
      case 'verify-slip':
        return <AdminSlipsView />;
      case 'verify-attendees':
        return (
          <VerifyAttendeesPanel
            attendees={attendees}
            meetings={meetings}
            onToggleCheckIn={handleToggleCheckIn}
            onPrintReceipt={handlePrintAttendeeReceipt}
            onAddAttendee={handleAddAttendee}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-[#0026b3] selection:text-white">
      {/* Global Toast Notification */}
      <ToastNotification message={globalToastMessage} />

      {/* Navigation Sidebar (desktop) & Top bar (mobile) */}
      <AdminNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingSlipsCount={pendingSlipsCount}
        totalAttendeesCount={ongoingAttendees.length}
        checkedInCount={ongoingCheckedInCount}
        receiptsCount={receipts.length}
        membersCount={membersCount}
        onLogout={() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }}
      />

      {/* Main Content Area */}
      <main className="lg:pl-72 min-h-screen transition-all duration-300">
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
          {renderActivePanel()}
        </div>
      </main>

      {/* Quick Print Receipt Modal */}
      <ReceiptModal
        receipt={globalReceipt}
        isOpen={isGlobalReceiptOpen}
        onClose={() => setIsGlobalReceiptOpen(false)}
        onEdit={(r) => {
          setIsGlobalReceiptOpen(false);
          setActiveTab('receipts');
        }}
      />

      {/* Meeting Edit Modal */}
      <MeetingEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingMeeting(null);
        }}
        meeting={editingMeeting}
        onSave={handleSaveEditedMeeting}
      />
    </div>
  );
}


