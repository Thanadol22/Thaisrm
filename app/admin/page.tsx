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
  ChevronLeft,
  CreditCard,
  Landmark,
  Wallet,
  Percent
} from 'lucide-react';
import { ThaiDateRangePicker } from '@/components/ThaiDateRangePicker';
import { ThaiTimeRangePicker } from '@/components/ThaiTimeRangePicker';
import { ReceiptData } from '@/types/receipt';
import { generateReceiptNo } from '@/lib/receiptNumber';
import { ReceiptManagementPanel } from '@/components/ReceiptManagementPanel';
import { ReceiptModal } from '@/components/ReceiptModal';
import { MemberManagementPanel } from '@/components/MemberManagementPanel';
import { ToastNotification } from '@/components/ToastNotification';
import { MeetingEditModal } from '@/components/MeetingEditModal';
import { AdminSlipsView } from '@/components/views/AdminSlipsView';
import { AdminLoginView } from '@/components/views/AdminLoginView';
import { AdminSettingsPanel } from '@/components/AdminSettingsPanel';
import { ThaiSrmLogo } from '@/components/ThaiSrmLogo';

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
  activities?: any[];
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
  selectedActivities?: Array<{
    id: string;
    name: string;
    type?: string;
    price: number;
    date?: string;
  }>;
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
                        className={`h-full rounded-full transition-all duration-700 ${slot.highlight
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
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${m.status === 'ongoing'
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

function RevenueReportPanel({ meetings, slips, attendees = [] }: RevenueReportProps) {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'hybrid' | 'onsite' | 'online'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeChartTab, setActiveChartTab] = useState<'programs' | 'rounds' | 'comparison' | 'donut'>('programs');
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<'all' | 'approved' | 'pending'>('all');

  // Filtered Meetings based on comprehensive filters (sorted newest first)
  const filteredMeetings = useMemo(() => {
    return meetings
      .filter((m) => {
        const matchType = filterType === 'all' || m.type === filterType;
        const matchStatus = filterStatus === 'all' || m.status === filterStatus;
        const q = searchQuery.toLowerCase().trim();
        const matchSearch =
          !q ||
          m.titleTh.toLowerCase().includes(q) ||
          m.titleEn.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q);
        return matchType && matchStatus && matchSearch;
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
  }, [meetings, filterType, filterStatus, searchQuery]);

  const hasActiveFilters = selectedMeetingId !== 'all' || filterType !== 'all' || filterStatus !== 'all' || searchQuery.trim() !== '';

  const resetAllFilters = () => {
    setSelectedMeetingId('all');
    setFilterType('all');
    setFilterStatus('all');
    setSearchQuery('');
  };

  // Helper to compute effective revenue: strictly approved database revenue
  const getMeetingRevenue = useCallback((m: MeetingItem) => {
    return m.revenue || 0;
  }, []);

  const approvedSlips = useMemo(() => slips.filter((s) => s.status === 'approved'), [slips]);

  // Grand total of approved revenue across all filtered courses/rounds
  const grandTotalRevenue = useMemo(() => {
    return filteredMeetings.reduce((sum, m) => sum + getMeetingRevenue(m), 0);
  }, [filteredMeetings, getMeetingRevenue]);

  // Total count of verified paid transactions (from approved slips)
  const totalPaidCount = useMemo(() => {
    return approvedSlips.length;
  }, [approvedSlips]);

  // Selected Meeting / Round data
  const currentMeeting = meetings.find((m) => m.id === selectedMeetingId);

  // Active revenue to display (real data only)
  const displayRevenue = useMemo(() => {
    if (selectedMeetingId === 'all') return grandTotalRevenue;
    const target = filteredMeetings.find((m) => m.id === selectedMeetingId) || currentMeeting;
    return target ? getMeetingRevenue(target) : 0;
  }, [selectedMeetingId, grandTotalRevenue, filteredMeetings, currentMeeting, getMeetingRevenue]);

  // Verified paid attendees count
  const displayPaidCount = useMemo(() => {
    if (selectedMeetingId === 'all') return totalPaidCount;
    return approvedSlips.filter((s) => s.meetingId === selectedMeetingId).length;
  }, [selectedMeetingId, totalPaidCount, approvedSlips]);

  const avgPerPerson = displayPaidCount > 0 ? Math.round(displayRevenue / displayPaidCount) : 0;

  // Pending slips amount and count
  const pendingAmount = useMemo(() => {
    if (selectedMeetingId === 'all') {
      return slips.filter((s) => s.status === 'pending').reduce((sum, s) => sum + s.amount, 0);
    }
    return slips
      .filter((s) => s.status === 'pending' && s.meetingId === selectedMeetingId)
      .reduce((sum, s) => sum + s.amount, 0);
  }, [selectedMeetingId, slips]);

  const pendingCount = useMemo(() => {
    if (selectedMeetingId === 'all') {
      return slips.filter((s) => s.status === 'pending').length;
    }
    return slips.filter((s) => s.status === 'pending' && s.meetingId === selectedMeetingId).length;
  }, [selectedMeetingId, slips]);

  // Total Inflow & Collection Rate
  const totalInflow = displayRevenue + pendingAmount;
  const collectionRate = totalInflow > 0 ? Math.round((displayRevenue / totalInflow) * 100) : (displayRevenue > 0 ? 100 : 0);

  // Dynamic Breakdown tiers computed strictly from approved slips
  const ticketTiers = useMemo(() => {
    const relevantSlips = selectedMeetingId === 'all'
      ? approvedSlips
      : approvedSlips.filter((s) => s.meetingId === selectedMeetingId);

    const tierMap = new Map<string, { count: number; total: number }>();
    relevantSlips.forEach((s) => {
      const type = s.ticketType || (s.memberCode ? 'สมาชิกสมาคม (Member Pass)' : 'บุคคลทั่วไป (Non-Member Pass)');
      const cur = tierMap.get(type) || { count: 0, total: 0 };
      tierMap.set(type, { count: cur.count + 1, total: cur.total + s.amount });
    });

    if (tierMap.size === 0) {
      return [];
    }

    const COLORS = ['#0026b3', '#16a34a', '#0284c7', '#d97706', '#9333ea', '#e11d48'];
    const BG_CLASSES = ['bg-[#0026b3]', 'bg-emerald-600', 'bg-sky-600', 'bg-amber-600', 'bg-purple-600', 'bg-rose-600'];

    return Array.from(tierMap.entries()).map(([name, data], idx) => ({
      name,
      price: data.count > 0 ? Math.round(data.total / data.count) : 0,
      count: data.count,
      total: data.total,
      color: COLORS[idx % COLORS.length],
      bgClass: BG_CLASSES[idx % BG_CLASSES.length],
      fill: COLORS[idx % COLORS.length],
    }));
  }, [selectedMeetingId, approvedSlips]);

  const totalTierRevenue = ticketTiers.reduce((s, t) => s + t.total, 0);

  // Dynamic Bank Channels Breakdown computed strictly from approved slips
  const bankBreakdown = useMemo(() => {
    const relevantSlips = selectedMeetingId === 'all'
      ? approvedSlips
      : approvedSlips.filter((s) => s.meetingId === selectedMeetingId);

    const bankMap = new Map<string, { amount: number; count: number }>();
    let totalAmt = 0;
    relevantSlips.forEach((s) => {
      const b = s.bank || 'ธนาคารไทยพาณิชย์ (SCB)';
      const cur = bankMap.get(b) || { amount: 0, count: 0 };
      bankMap.set(b, { amount: cur.amount + s.amount, count: cur.count + 1 });
      totalAmt += s.amount;
    });

    if (bankMap.size === 0) {
      return [];
    }

    const BANK_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
      SCB: { bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-700', hex: '#7e22ce' },
      KBANK: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'text-emerald-800', hex: '#166534' },
      BBL: { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700', hex: '#1d4ed8' },
      KTB: { bg: 'bg-sky-50 text-sky-700 border-sky-200', text: 'text-sky-700', hex: '#0369a1' },
      BAY: { bg: 'bg-amber-50 text-amber-800 border-amber-200', text: 'text-amber-800', hex: '#92400e' },
      TTB: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-700', hex: '#4338ca' },
    };

    return Array.from(bankMap.entries()).map(([bank, data]) => {
      const percent = totalAmt > 0 ? Math.round((data.amount / totalAmt) * 100) : 0;
      let styling = { bg: 'bg-slate-50 text-slate-700 border-slate-200', text: 'text-slate-700', hex: '#475569' };
      for (const [k, s] of Object.entries(BANK_COLORS)) {
        if (bank.toUpperCase().includes(k)) {
          styling = s;
          break;
        }
      }
      return { bank, amount: data.amount, count: data.count, percent, styling };
    });
  }, [selectedMeetingId, approvedSlips]);

  // Helper for Donut SVG circumference calculation
  const donutRadius = 70;
  const donutCircumference = 2 * Math.PI * donutRadius;

  // ─── Bar Chart Data: Broken down by opened course/program in each round ───
  const courseBarChartData = useMemo(() => {
    return filteredMeetings.map((m) => {
      const meetingSlips = slips.filter((s) => s.meetingId === m.id);
      const approvedMeetingSlips = meetingSlips.filter((s) => s.status === 'approved');
      const pendingMeetingSlips = meetingSlips.filter((s) => s.status === 'pending');

      let approvedMainRev = 0;
      let approvedWorkshopRev = 0;

      approvedMeetingSlips.forEach((s) => {
        const acts = Array.isArray(s.selectedActivities) && s.selectedActivities.length > 0 ? s.selectedActivities : null;
        if (acts) {
          acts.forEach((a) => {
            const price = Number(a.price) || 0;
            const type = (a.type || '').toLowerCase();
            const name = (a.name || '').toLowerCase();
            if (type === 'workshop' || type === 'ws' || name.includes('workshop') || name.includes('ws') || name.includes('nurse')) {
              approvedWorkshopRev += price;
            } else {
              approvedMainRev += price;
            }
          });
        } else {
          approvedMainRev += (s.amount || 0);
        }
      });

      let pendingMainRev = 0;
      let pendingWorkshopRev = 0;

      pendingMeetingSlips.forEach((s) => {
        const acts = Array.isArray(s.selectedActivities) && s.selectedActivities.length > 0 ? s.selectedActivities : null;
        if (acts) {
          acts.forEach((a) => {
            const price = Number(a.price) || 0;
            const type = (a.type || '').toLowerCase();
            const name = (a.name || '').toLowerCase();
            if (type === 'workshop' || type === 'ws' || name.includes('workshop') || name.includes('ws') || name.includes('nurse')) {
              pendingWorkshopRev += price;
            } else {
              pendingMainRev += price;
            }
          });
        } else {
          pendingMainRev += (s.amount || 0);
        }
      });

      const calculatedApproved = approvedMainRev + approvedWorkshopRev;
      const approvedRev = calculatedApproved > 0 ? calculatedApproved : getMeetingRevenue(m);
      const pendingRev = pendingMainRev + pendingWorkshopRev;

      return {
        id: m.id,
        titleTh: m.titleTh,
        titleEn: m.titleEn,
        date: m.date,
        type: m.type,
        status: m.status,
        maxSeats: m.maxSeats,
        registered: m.registered,
        attended: m.attended,
        approvedRevenue: approvedRev,
        approvedMainRevenue: approvedMainRev,
        approvedWorkshopRevenue: approvedWorkshopRev,
        pendingRevenue: pendingRev,
        pendingMainRevenue: pendingMainRev,
        pendingWorkshopRevenue: pendingWorkshopRev,
        totalInflow: approvedRev + pendingRev,
        approvedSlipCount: approvedMeetingSlips.length,
        pendingSlipCount: pendingMeetingSlips.length,
      };
    });
  }, [filteredMeetings, getMeetingRevenue, slips]);

  // Benchmark max revenue for scaling bar heights proportionally
  const maxBarRevenue = useMemo(() => {
    const max = Math.max(...courseBarChartData.map((d) => d.totalInflow), 0);
    return max > 0 ? max : 10000;
  }, [courseBarChartData]);

  // ─── Real Individual Course Programs from Database ───
  const allCoursePrograms = useMemo(() => {
    const list: Array<{
      id: string;
      meetingId: string;
      meetingName: string;
      programName: string;
      programType: 'main' | 'workshop';
      dateText: string;
      approvedRevenue: number;
      pendingRevenue: number;
      totalInflow: number;
      approvedSlipCount: number;
      pendingSlipCount: number;
      maxSeats?: number;
    }> = [];

    const targetMeetings = selectedMeetingId === 'all'
      ? filteredMeetings
      : filteredMeetings.filter((m) => m.id === selectedMeetingId);

    targetMeetings.forEach((m) => {
      const meetingSlips = slips.filter((s) => s.meetingId === m.id);
      const approvedMeetingSlips = meetingSlips.filter((s) => s.status === 'approved');
      const pendingMeetingSlips = meetingSlips.filter((s) => s.status === 'pending');

      const mActivities = Array.isArray(m.activities) && m.activities.length > 0 ? m.activities : null;

      if (mActivities) {
        mActivities.forEach((act: any, actIdx: number) => {
          const actName = act.name || `หลักสูตร ${actIdx + 1}`;
          const actType = (act.type || '').toLowerCase() === 'workshop' ? 'workshop' : 'main';

          // Match approved slips
          let approvedRev = 0;
          let approvedCount = 0;
          approvedMeetingSlips.forEach((s) => {
            const sActs = Array.isArray(s.selectedActivities) ? s.selectedActivities : [];
            const matched = sActs.find((sa: any) =>
              sa.id === act.id ||
              (sa.name && act.name && sa.name.trim().toLowerCase() === act.name.trim().toLowerCase()) ||
              (sActs.length === 1 && sa.type && act.type && sa.type.toLowerCase() === act.type.toLowerCase())
            );
            if (matched) {
              approvedRev += (Number(matched.price) || 0);
              approvedCount += 1;
            }
          });

          // Match pending slips
          let pendingRev = 0;
          let pendingCount = 0;
          pendingMeetingSlips.forEach((s) => {
            const sActs = Array.isArray(s.selectedActivities) ? s.selectedActivities : [];
            const matched = sActs.find((sa: any) =>
              sa.id === act.id ||
              (sa.name && act.name && sa.name.trim().toLowerCase() === act.name.trim().toLowerCase()) ||
              (sActs.length === 1 && sa.type && act.type && sa.type.toLowerCase() === act.type.toLowerCase())
            );
            if (matched) {
              pendingRev += (Number(matched.price) || 0);
              pendingCount += 1;
            }
          });

          list.push({
            id: `${m.id}_${act.id || actName}`,
            meetingId: m.id,
            meetingName: m.titleTh,
            programName: actName,
            programType: actType,
            dateText: act.date || m.date,
            approvedRevenue: approvedRev,
            pendingRevenue: pendingRev,
            totalInflow: approvedRev + pendingRev,
            approvedSlipCount: approvedCount,
            pendingSlipCount: pendingCount,
            maxSeats: act.maxSeats || 0,
          });
        });
      } else {
        let approvedRev = getMeetingRevenue(m);
        let pendingRev = pendingMeetingSlips.reduce((sum, s) => sum + s.amount, 0);

        list.push({
          id: `${m.id}_main`,
          meetingId: m.id,
          meetingName: m.titleTh,
          programName: m.titleTh,
          programType: 'main',
          dateText: m.date,
          approvedRevenue: approvedRev,
          pendingRevenue: pendingRev,
          totalInflow: approvedRev + pendingRev,
          approvedSlipCount: approvedMeetingSlips.length,
          pendingSlipCount: pendingMeetingSlips.length,
          maxSeats: m.maxSeats || 0,
        });
      }
    });

    return list;
  }, [filteredMeetings, selectedMeetingId, slips, getMeetingRevenue]);

  // Benchmark max revenue for individual programs
  const maxProgramRevenue = useMemo(() => {
    const max = Math.max(...allCoursePrograms.map((d) => d.totalInflow), 0);
    return max > 0 ? max : 10000;
  }, [allCoursePrograms]);

  const programsWithRevenueCount = useMemo(() => {
    return allCoursePrograms.filter((d) => d.approvedRevenue > 0).length;
  }, [allCoursePrograms]);

  // Slips to display in the recent transaction audit section
  const scopedRecentSlips = useMemo(() => {
    let filtered = slips;
    if (selectedMeetingId !== 'all') {
      filtered = filtered.filter((s) => s.meetingId === selectedMeetingId);
    }
    if (txFilter === 'approved') {
      filtered = filtered.filter((s) => s.status === 'approved');
    } else if (txFilter === 'pending') {
      filtered = filtered.filter((s) => s.status === 'pending');
    }
    return filtered.slice(0, 8);
  }, [slips, selectedMeetingId, txFilter]);

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
      getMeetingRevenue(m),
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
      {/* ─── 1. HEADER & ACTIONS ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0026b3] text-xs font-bold">
            <DollarSign className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
            <span className="truncate">รายงานการเงินและรายได้ค่าลงทะเบียน (Financial Analytics)</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            รายงานรายได้จากการลงทะเบียน
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            วิเคราะห์รายได้ ยอดชำระเงิน และสถิติทางการเงินทุกหลักสูตรและรอบการประชุม
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Active Scope Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 max-w-full">
            <Layers className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
            <span className="truncate max-w-[180px] sm:max-w-[260px]">
              {selectedMeetingId === 'all' ? `รวมทุกรอบ (${filteredMeetings.length} โครงการ)` : currentMeeting?.titleTh}
            </span>
          </div>

          <button
            onClick={handleExportFinancialExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="whitespace-nowrap">Export ข้อมูล (Excel)</span>
          </button>
        </div>
      </div>

      {/* ─── 2. 5 CORE FINANCIAL KPI SCORECARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Approved Net Revenue (Hero Card) */}
        <div className="bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 border border-[#0026b3]/30 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#0026b3]/5 rounded-full blur-xl pointer-events-none" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                {selectedMeetingId === 'all' ? 'ยอดรายได้สุทธิรวม' : 'ยอดรายได้รอบนี้'}
              </span>
              <div className="p-2 rounded-xl bg-[#0026b3] text-white shadow-2xs">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-extrabold text-[#0026b3]">฿</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {displayRevenue.toLocaleString()}
              </span>
            </div>
          </div>
          {(() => {
            const curBar = selectedMeetingId !== 'all' ? courseBarChartData.find((c) => c.id === selectedMeetingId) : null;
            if (curBar && (curBar.approvedMainRevenue > 0 || curBar.approvedWorkshopRevenue > 0)) {
              return (
                <div className="flex items-center gap-1.5 text-[10px] font-bold mt-2 pt-2 border-t border-slate-100 flex-wrap">
                  {curBar.approvedMainRevenue > 0 && (
                    <span className="text-[#0026b3] bg-blue-100/70 px-1.5 py-0.5 rounded border border-blue-200 truncate">
                      Main: ฿{curBar.approvedMainRevenue.toLocaleString()}
                    </span>
                  )}
                  {curBar.approvedWorkshopRevenue > 0 && (
                    <span className="text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-200 truncate">
                      WS: ฿{curBar.approvedWorkshopRevenue.toLocaleString()}
                    </span>
                  )}
                </div>
              );
            }
            return (
              <div className="text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-100/80 truncate mt-2">
                {selectedMeetingId === 'all' ? `จาก ${meetings.length} รอบการประชุม` : currentMeeting?.id}
              </div>
            );
          })()}
        </div>

        {/* Card 2: Verified Slips */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">สลิปที่อนุมัติแล้ว</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{displayPaidCount.toLocaleString()}</span>
            <span className="text-xs font-medium text-slate-500">รายการ</span>
          </div>
          <div className="text-[11px] text-emerald-800 font-bold pt-2 border-t border-slate-100 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>สถานะชำระเงินเรียบร้อย 100%</span>
          </div>
        </div>

        {/* Card 3: Avg per Attendee */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">ค่าเฉลี่ยต่อผู้สมัคร</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-extrabold text-[#0026b3]">฿</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{avgPerPerson.toLocaleString()}</span>
            <span className="text-[11px] text-slate-500 font-normal">/ รายการ</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-medium truncate">
            คำนวณจากยอดสลิปจริงในระบบ
          </div>
        </div>

        {/* Card 4: Pending Inflow */}
        <div className="bg-white border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-2 bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-800">ยอดเงินรอตรวจสลิป</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-extrabold text-amber-800">฿</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{pendingAmount.toLocaleString()}</span>
          </div>
          <div className="text-[11px] text-amber-800 font-bold pt-2 border-t border-amber-200/60 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>จำนวน {pendingCount} รายการรอตรวจสอบ</span>
          </div>
        </div>

        {/* Card 5: Collection Rate & Total Inflow */}
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-2 bg-emerald-50/20 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800">อัตราการจัดเก็บสำเร็จ</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
              <BadgePercent className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight">{collectionRate}%</span>
            <span className="text-[11px] text-slate-500 font-medium">สำเร็จ</span>
          </div>
          <div className="pt-2 border-t border-emerald-200/60 space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${collectionRate}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 font-medium flex justify-between">
              <span>รวมยอดเข้า:</span>
              <span className="font-bold text-slate-700">฿{totalInflow.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. SMART CONTROL & FILTER BAR ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Row 1: Search, Format Pills, Status Dropdown & Reset */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อการประชุม, สถานที่, หรือรหัสโครงการ..."
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition"
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
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Format Filter (Pills) */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 text-xs font-bold overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${filterType === 'all'
                  ? 'bg-[#0026b3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                ทุกรูปแบบ
              </button>
              <button
                type="button"
                onClick={() => setFilterType('hybrid')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${filterType === 'hybrid'
                  ? 'bg-[#0026b3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Hybrid
              </button>
              <button
                type="button"
                onClick={() => setFilterType('onsite')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${filterType === 'onsite'
                  ? 'bg-[#0026b3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Onsite
              </button>
              <button
                type="button"
                onClick={() => setFilterType('online')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${filterType === 'online'
                  ? 'bg-[#0026b3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Online
              </button>
            </div>

            {/* Status Dropdown Filter */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full sm:w-auto appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl pl-3 pr-8 py-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition cursor-pointer"
              >
                <option value="all">ทุกสถานะโครงการ</option>
                <option value="ongoing">กำลังจัดงาน / เปิดรับ</option>
                <option value="upcoming">เร็วๆ นี้ (Upcoming)</option>
                <option value="completed">เสร็จสิ้นแล้ว</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Reset All Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>ล้างตัวกรอง</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Meeting Round Dropdown Selector */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 w-full min-w-0">
            <label htmlFor="revenue-meeting-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
                <span>เลือกรอบการประชุมเจาะจง:</span>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                แสดง <span className="text-[#0026b3] font-black">{filteredMeetings.length}</span> จาก {meetings.length} โครงการ
              </span>
            </label>

            <div className="relative">
              <CalendarDays className="w-4 h-4 text-[#0026b3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="revenue-meeting-select"
                value={selectedMeetingId}
                onChange={(e) => setSelectedMeetingId(e.target.value)}
                className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition cursor-pointer shadow-2xs truncate"
              >
                <option value="all">
                  🌐 รวมทุกรอบที่กรอง (Grand Total) — ฿{grandTotalRevenue >= 1000000 ? `${(grandTotalRevenue / 1000000).toFixed(2)}M` : grandTotalRevenue.toLocaleString()}
                </option>
                {filteredMeetings.map((m) => {
                  const mRev = getMeetingRevenue(m);
                  return (
                    <option key={m.id} value={m.id}>
                      📅 {m.titleTh} ({m.id}) — ฿{mRev >= 1000000 ? `${(mRev / 1000000).toFixed(2)}M` : mRev.toLocaleString()}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Quick Active Meeting Pill */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto md:self-end md:mb-0.5">
            {selectedMeetingId === 'all' ? (
              <div className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-200 text-xs font-bold shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 shrink-0" />
                  <span>รวมรายได้ทั้งหมด:</span>
                </div>
                <span className="font-black text-xs sm:text-sm bg-white px-2 py-0.5 rounded-lg border border-blue-200 text-[#0026b3]">
                  ฿{grandTotalRevenue.toLocaleString()}
                </span>
              </div>
            ) : (
              (() => {
                const sel = filteredMeetings.find((m) => m.id === selectedMeetingId) || currentMeeting;
                const mRev = sel ? getMeetingRevenue(sel) : 0;
                return (
                  <div className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold shadow-2xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CalendarDays className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate max-w-[140px] sm:max-w-[200px]">{sel?.titleTh || selectedMeetingId}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-black text-xs sm:text-sm bg-white px-2 py-0.5 rounded-lg border border-emerald-200 text-emerald-700">
                        ฿{mRev.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedMeetingId('all')}
                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-emerald-100 transition cursor-pointer"
                        title="กลับไปดูภาพรวมทุกรอบ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>

      {/* ─── 4. MAIN VISUAL ANALYTICS SECTION (Interactive Charts Hub) ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 lg:p-7 shadow-xs space-y-6">
        {/* Chart Header & View Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3]">
                <BarChart3 className="w-5 h-5 text-[#0026b3]" />
              </div>
              <h2 className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight">
                กราฟวิเคราะห์รายได้และสถิติเชิงลึก
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              {activeChartTab === 'programs' && 'กราฟแท่งแสดงรายได้จริงแยกแท่งเดี่ยวตามรายชื่อหลักสูตรที่เปิดในฐานข้อมูล (Revenue by Real Course / Program)'}
              {activeChartTab === 'rounds' && 'กราฟแท่งแยกแท่งคู่เปรียบเทียบ Main vs Workshop แยกตามรอบโครงการ (Grouped Bars by Round)'}
              {activeChartTab === 'comparison' && 'กราฟแท่งคู่เปรียบเทียบจำนวนผู้ลงทะเบียน vs ผู้เข้าร่วมงานจริงในแต่ละรอบ (Attendee Comparison)'}
              {activeChartTab === 'donut' && 'กราฟวงแหวนสัดส่วนรายได้แยกตามประเภทสมาชิกและบัตร (Donut Ring Chart)'}
            </p>
          </div>

          {/* Chart Type Toggle Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto max-w-full scrollbar-none">
            <button
              onClick={() => setActiveChartTab('programs')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${activeChartTab === 'programs'
                ? 'bg-white text-[#0026b3] shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <BarChart3 className="w-4 h-4 text-[#0026b3] shrink-0" />
              <span>รายได้ตามหลักสูตรจริง</span>
            </button>
            <button
              onClick={() => setActiveChartTab('rounds')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${activeChartTab === 'rounds'
                ? 'bg-white text-[#0026b3] shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Layers className="w-4 h-4 text-[#0026b3] shrink-0" />
              <span>แยกแท่งคู่ตามรอบ</span>
            </button>
            <button
              onClick={() => setActiveChartTab('comparison')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${activeChartTab === 'comparison'
                ? 'bg-white text-[#0026b3] shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Users className="w-4 h-4 text-[#0026b3] shrink-0" />
              <span>เปรียบเทียบผู้ลงทะเบียน</span>
            </button>
            <button
              onClick={() => setActiveChartTab('donut')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${activeChartTab === 'donut'
                ? 'bg-white text-[#0026b3] shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <PieChart className="w-4 h-4 text-[#0026b3] shrink-0" />
              <span>สัดส่วนบัตร & ธนาคาร</span>
            </button>
          </div>
        </div>

        {/* ── 1. BAR CHART: REAL INDIVIDUAL COURSE PROGRAMS ── */}
        {activeChartTab === 'programs' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Bar Summary & Legend */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
              <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#0026b3] shrink-0 shadow-xs" />
                  <span>Main Program (หลักสูตรหลัก)</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-xs bg-emerald-500 shrink-0 shadow-xs" />
                  <span>Workshop / WS (เวิร์กช็อป)</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-xs bg-amber-400 shrink-0 shadow-xs" />
                  <span>ยอดรอตรวจสลิป (Pending)</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500">
                  <span className="w-3.5 h-3.5 rounded-xs bg-slate-200 border border-slate-300 shrink-0" />
                  <span>ยังไม่มีข้อมูลรายได้ (฿0)</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 whitespace-nowrap">
                  มีรายได้จริง {programsWithRevenueCount} จาก {allCoursePrograms.length} หลักสูตร
                </span>
                {selectedMeetingId !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedMeetingId('all')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-[#0026b3] border border-blue-200 hover:bg-blue-100 text-xs font-bold transition cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>ดูภาพรวมทุกรอบ</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bar Chart Canvas Area */}
            <div className="relative pt-8 pb-6 px-4 sm:px-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
                <div className="min-w-[760px] relative">
                  {/* Horizontal Gridlines with Currency Values */}
                  <div className="absolute inset-x-0 top-0 h-64 pointer-events-none flex flex-col justify-between opacity-50 z-0">
                    {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => {
                      const val = Math.round(maxProgramRevenue * ratio);
                      return (
                        <div key={idx} className="border-b border-dashed border-slate-200 w-full flex justify-between items-center text-[10px] text-slate-400">
                          <span>฿{val.toLocaleString()}</span>
                          <span className="opacity-40">{Math.round(ratio * 100)}%</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Vertical Individual Bars Grid */}
                  <div
                    className="grid gap-3 sm:gap-4 relative z-10"
                    style={{ gridTemplateColumns: `repeat(${Math.max(allCoursePrograms.length, 3)}, minmax(0, 1fr))` }}
                  >
                    {allCoursePrograms.map((p) => {
                      const isSelected = selectedMeetingId === p.meetingId;
                      const hasRevenue = p.approvedRevenue > 0;
                      const hasPending = p.pendingRevenue > 0;

                      const maxBarHeight = 150;
                      const approvedHeight = maxProgramRevenue > 0 && p.approvedRevenue > 0
                        ? Math.max(12, Math.round((p.approvedRevenue / maxProgramRevenue) * maxBarHeight))
                        : 0;
                      const pendingHeight = maxProgramRevenue > 0 && p.pendingRevenue > 0
                        ? Math.max(10, Math.round((p.pendingRevenue / maxProgramRevenue) * maxBarHeight))
                        : 0;

                      const isMain = p.programType === 'main';

                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedMeetingId(isSelected && selectedMeetingId !== 'all' ? 'all' : p.meetingId)}
                          className={`flex flex-col items-center group cursor-pointer transition-all duration-200 p-2 rounded-xl ${isSelected && selectedMeetingId !== 'all'
                            ? 'bg-blue-50/60 ring-2 ring-[#0026b3] shadow-sm'
                            : 'hover:bg-slate-50/80'
                            }`}
                        >
                          {/* 1. Bar Pillar Area */}
                          <div className="h-64 w-full flex flex-col justify-end items-center pb-1">
                            {/* Value Tag Above Bar */}
                            <div className="mb-2 text-center transition-transform group-hover:-translate-y-0.5 flex flex-col items-center gap-0.5">
                              {hasRevenue ? (
                                <div
                                  className={`text-xs sm:text-sm font-black px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap border ${isMain
                                    ? 'text-[#0026b3] bg-blue-50 border-blue-200'
                                    : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                    }`}
                                >
                                  ฿{p.approvedRevenue.toLocaleString()}
                                </div>
                              ) : (
                                <div className="text-[11px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/80 whitespace-nowrap">
                                  ฿0
                                </div>
                              )}

                              {hasPending && (
                                <div className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5 border border-amber-200 shadow-2xs whitespace-nowrap">
                                  +฿{p.pendingRevenue.toLocaleString()} (รอตรวจ)
                                </div>
                              )}
                            </div>

                            {/* The Separate Bar Pillar */}
                            <div className="w-full max-w-[64px] flex flex-col justify-end items-center relative">
                              {hasRevenue || hasPending ? (
                                <div className="w-full flex flex-col justify-end items-center rounded-t-lg overflow-hidden shadow-xs border border-slate-200/60 transition-all duration-300 group-hover:brightness-105">
                                  {pendingHeight > 0 && (
                                    <div
                                      style={{ height: `${pendingHeight}px` }}
                                      className="w-full bg-gradient-to-t from-amber-400 to-amber-300 border-b border-amber-500/30 transition-all duration-500"
                                      title={`ยอดรอตรวจ: ฿${p.pendingRevenue.toLocaleString()}`}
                                    />
                                  )}
                                  {approvedHeight > 0 && (
                                    <div
                                      style={{ height: `${approvedHeight}px` }}
                                      className={`w-full transition-all duration-500 ${isMain
                                        ? 'bg-gradient-to-t from-[#0026b3] via-[#1d4ed8] to-[#3b82f6]'
                                        : 'bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400'
                                        }`}
                                      title={`${p.programName}: ฿${p.approvedRevenue.toLocaleString()}`}
                                    />
                                  )}
                                </div>
                              ) : (
                                <div
                                  className="w-full h-2.5 bg-slate-200 rounded-t-sm border border-slate-300 transition-all group-hover:bg-slate-300"
                                  title="ยังไม่มีข้อมูลรายได้ในหลักสูตรนี้"
                                />
                              )}
                            </div>
                          </div>

                          {/* Horizontal Axis Divider */}
                          <div className="w-full border-t border-slate-200 my-1" />

                          {/* 2. X-Axis Labels Below Bar */}
                          <div className="pt-2 text-center space-y-1.5 w-full">
                            <div className="flex items-center justify-center">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${hasRevenue
                                  ? isMain
                                    ? 'bg-[#0026b3] text-white shadow-2xs'
                                    : 'bg-emerald-600 text-white shadow-2xs'
                                  : 'bg-slate-200 text-slate-700'
                                  }`}
                              >
                                {isMain ? 'Main Program' : 'Workshop (WS)'}
                              </span>
                            </div>

                            <div
                              className={`text-xs font-extrabold line-clamp-2 leading-snug px-0.5 transition ${isSelected ? 'text-[#0026b3]' : 'text-slate-900 group-hover:text-[#0026b3]'
                                }`}
                              title={p.programName}
                            >
                              {p.programName}
                            </div>

                            <div className="text-[10px] font-bold text-slate-500 truncate" title={p.meetingName}>
                              {p.meetingName.split('(')[0]} ({p.meetingId})
                            </div>

                            <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                              {p.dateText}
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

        {/* ── 2. BAR CHART: SIDE-BY-SIDE DUAL BARS BY ROUND ── */}
        {activeChartTab === 'rounds' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Bar Summary & Legend */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
              <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#0026b3] shrink-0 shadow-xs" />
                  <span>Main Program</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <span className="w-3.5 h-3.5 rounded-xs bg-emerald-500 shrink-0 shadow-xs" />
                  <span>Workshop (WS)</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500">
                  <span className="w-3.5 h-3.5 rounded-xs bg-slate-200 border border-slate-300 shrink-0" />
                  <span>ยังไม่มีข้อมูลรายได้ (฿0)</span>
                </div>
              </div>

              <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                แยกแท่งคู่เคียงข้างกันตาม {courseBarChartData.length} รอบโครงการ
              </div>
            </div>

            {/* Side-by-Side Bar Chart Canvas */}
            <div className="relative pt-8 pb-6 px-4 sm:px-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
                <div className="min-w-[700px] relative">
                  <div className="absolute inset-x-0 top-0 h-64 pointer-events-none flex flex-col justify-between opacity-50 z-0">
                    {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => {
                      const val = Math.round(maxBarRevenue * ratio);
                      return (
                        <div key={idx} className="border-b border-dashed border-slate-200 w-full flex justify-between items-center text-[10px] text-slate-400">
                          <span>฿{val.toLocaleString()}</span>
                          <span className="opacity-40">{Math.round(ratio * 100)}%</span>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className="grid gap-3 sm:gap-4 relative z-10"
                    style={{ gridTemplateColumns: `repeat(${Math.max(courseBarChartData.length, 3)}, minmax(0, 1fr))` }}
                  >
                    {courseBarChartData.map((course) => {
                      const isSelected = selectedMeetingId === course.id;
                      const maxBarHeight = 150;
                      const mainH = maxBarRevenue > 0 && course.approvedMainRevenue > 0
                        ? Math.max(12, Math.round((course.approvedMainRevenue / maxBarRevenue) * maxBarHeight))
                        : 0;
                      const wsH = maxBarRevenue > 0 && course.approvedWorkshopRevenue > 0
                        ? Math.max(12, Math.round((course.approvedWorkshopRevenue / maxBarRevenue) * maxBarHeight))
                        : 0;

                      return (
                        <div
                          key={course.id}
                          onClick={() => setSelectedMeetingId(isSelected ? 'all' : course.id)}
                          className={`flex flex-col items-center group cursor-pointer transition-all duration-200 p-2 rounded-xl ${isSelected
                            ? 'bg-blue-50/60 ring-2 ring-[#0026b3] shadow-sm'
                            : 'hover:bg-slate-50/80'
                            }`}
                        >
                          <div className="h-64 w-full flex flex-col justify-end items-center pb-1">
                            <div className="mb-2 text-center">
                              {course.approvedRevenue > 0 ? (
                                <div className="text-xs sm:text-sm font-black text-[#0026b3] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs whitespace-nowrap">
                                  ฿{course.approvedRevenue.toLocaleString()}
                                </div>
                              ) : (
                                <div className="text-[11px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/80 whitespace-nowrap">
                                  ฿0
                                </div>
                              )}
                            </div>

                            <div className="flex items-end justify-center gap-1.5 w-full max-w-[80px]">
                              {/* Left Bar: Main Program */}
                              <div className="flex-1 flex flex-col items-center">
                                {mainH > 0 && (
                                  <span className="text-[9px] font-black text-[#0026b3] mb-1">
                                    ฿{(course.approvedMainRevenue / 1000).toFixed(1)}k
                                  </span>
                                )}
                                {mainH > 0 ? (
                                  <div
                                    style={{ height: `${mainH}px` }}
                                    className="w-full bg-gradient-to-t from-[#0026b3] via-[#1d4ed8] to-[#3b82f6] rounded-t-md shadow-xs"
                                    title={`Main Program: ฿${course.approvedMainRevenue.toLocaleString()}`}
                                  />
                                ) : (
                                  <div className="w-full h-2 bg-slate-200 rounded-t-sm" />
                                )}
                              </div>

                              {/* Right Bar: Workshop */}
                              <div className="flex-1 flex flex-col items-center">
                                {wsH > 0 && (
                                  <span className="text-[9px] font-black text-emerald-700 mb-1">
                                    ฿{(course.approvedWorkshopRevenue / 1000).toFixed(1)}k
                                  </span>
                                )}
                                {wsH > 0 ? (
                                  <div
                                    style={{ height: `${wsH}px` }}
                                    className="w-full bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 rounded-t-md shadow-xs"
                                    title={`Workshop: ฿${course.approvedWorkshopRevenue.toLocaleString()}`}
                                  />
                                ) : (
                                  <div className="w-full h-2 bg-slate-200 rounded-t-sm" />
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="w-full border-t border-slate-200 my-1" />

                          <div className="pt-2 text-center space-y-1 w-full">
                            <span
                              className={`text-[11px] font-black px-2.5 py-0.5 rounded-md ${course.approvedRevenue > 0
                                ? 'bg-[#0026b3] text-white shadow-2xs'
                                : 'bg-slate-200 text-slate-700'
                                }`}
                            >
                              {course.id}
                            </span>
                            <div className="text-xs font-extrabold text-slate-800 line-clamp-2 leading-snug">
                              {course.titleTh}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                              {course.date}
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

        {/* ── 3. DUAL BAR CHART: ATTENDEES COMPARISON ── */}
        {activeChartTab === 'comparison' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4 px-1">
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
                เปรียบเทียบ {filteredMeetings.length} รอบการประชุม
              </div>
            </div>

            <div className="relative pt-8 pb-4 px-4 sm:px-8 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto pb-2 scrollbar-none">
                <div className="min-w-[540px] relative">
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

                  <div className="grid gap-3 sm:gap-6 h-72 items-end pt-6 pb-2 relative z-10" style={{ gridTemplateColumns: `repeat(${Math.max(3, filteredMeetings.length)}, minmax(0, 1fr))` }}>
                    {filteredMeetings.map((m) => {
                      const maxVal = Math.max(...filteredMeetings.map((x) => Math.max(x.registered, x.attended, 100)), 100);
                      const h1 = `${Math.max(12, Math.min(100, Math.round((m.registered / maxVal) * 100)))}%`;
                      const h2 = `${Math.max(8, Math.min(100, Math.round((m.attended / maxVal) * 100)))}%`;

                      return (
                        <div
                          key={m.id}
                          className="flex flex-col items-center h-full justify-end group cursor-pointer"
                          onClick={() => setSelectedMeetingId(m.id)}
                        >
                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 mb-2 text-center pointer-events-none transform -translate-y-1 z-20">
                            <div className="bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                              <div className="text-slate-200 font-extrabold">{m.titleTh}</div>
                              <div className="text-blue-300">ลงทะเบียน: {m.registered.toLocaleString()} คน</div>
                              <div className="text-[#4ade80]">เช็คอินเข้างาน: {m.attended.toLocaleString()} คน ({m.registered > 0 ? Math.round((m.attended / m.registered) * 100) : 0}%)</div>
                            </div>
                          </div>

                          <div className="flex items-end justify-center w-full max-w-[80px] h-[210px] gap-0 sm:gap-0.5">
                            <div
                              className="w-1/2 bg-[#0026b3] rounded-t-md hover:brightness-110 transition-all duration-500 shadow-2xs"
                              style={{ height: h1 }}
                              title={`ลงทะเบียน: ${m.registered} คน`}
                            />
                            <div
                              className="w-1/2 bg-[#4ade80] rounded-t-md hover:brightness-110 transition-all duration-500 shadow-2xs"
                              style={{ height: h2 }}
                              title={`เช็คอินจริง: ${m.attended} คน`}
                            />
                          </div>

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

        {/* ── 4. DONUT & BANK CHANNELS ── */}
        {activeChartTab === 'donut' && (
          <div className="space-y-6 animate-fade-in">
            {ticketTiers.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-50/70 border border-slate-200/80 rounded-2xl relative">
                  <svg className="w-56 h-56 transform -rotate-90 drop-shadow-xs" viewBox="0 0 180 180">
                    <circle
                      cx="90"
                      cy="90"
                      r={donutRadius}
                      fill="transparent"
                      stroke="#e2e8f0"
                      strokeWidth="24"
                    />

                    {(() => {
                      let accumulatedDonutPercent = 0;
                      return ticketTiers.map((tier) => {
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
                      });
                    })()}
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {selectedMeetingId === 'all' ? 'รวมทุกรอบ' : 'ยอดรอบนี้'}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                      ฿{totalTierRevenue >= 1000000 ? `${(totalTierRevenue / 1000000).toFixed(2)}M` : totalTierRevenue.toLocaleString()}
                    </span>
                    <span className="text-[11px] font-bold text-[#0026b3] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 mt-1">
                      {ticketTiers.reduce((s, t) => s + t.count, 0)} ที่นั่ง
                    </span>
                  </div>
                </div>

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

      {/* ─── 5. DEEP-DIVE COURSE BREAKDOWN TABLE ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3]">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                ตารางสรุปรายได้แยกตามหลักสูตรจริงในฐานข้อมูล (Course Program Breakdown)
              </h3>
              <p className="text-xs text-slate-500">
                แจกแจงรายได้จริง จำนวนที่นั่ง และสลิปที่อนุมัติแล้วของแต่ละหลักสูตร
              </p>
            </div>
          </div>
          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
            {allCoursePrograms.length} หลักสูตรย่อย
          </div>
        </div>

        {/* Breakdown Table Grid */}
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-3.5 rounded-l-xl">หลักสูตร / โครงการ</th>
                <th className="py-3 px-3">ประเภท</th>
                <th className="py-3 px-3 text-center">สลิปอนุมัติ</th>
                <th className="py-3 px-3 text-right">ยอดรอตรวจ</th>
                <th className="py-3 px-3 text-right">รายได้อนุมัติ (บาท)</th>
                <th className="py-3 px-3 text-center rounded-r-xl">สัดส่วนรายได้</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {allCoursePrograms.map((p) => {
                const isMain = p.programType === 'main';
                const pct = grandTotalRevenue > 0 ? Number(((p.approvedRevenue / grandTotalRevenue) * 100).toFixed(1)) : 0;

                return (
                  <tr key={p.id} className="hover:bg-blue-50/30 transition">
                    <td className="py-3.5 px-3.5">
                      <div className="font-extrabold text-slate-900">{p.programName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-slate-700">{p.meetingName}</span>
                        <span>•</span>
                        <span className="text-slate-400">{p.dateText}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold ${isMain
                          ? 'bg-blue-100 text-[#0026b3]'
                          : 'bg-emerald-100 text-emerald-800'
                          }`}
                      >
                        {isMain ? 'Main Program' : 'Workshop'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-extrabold text-slate-900">{p.approvedSlipCount}</span>
                      <span className="text-xs text-slate-500"> รายการ</span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {p.pendingRevenue > 0 ? (
                        <span className="text-amber-700 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          +฿{p.pendingRevenue.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-black text-slate-900 text-sm sm:text-base">
                      ฿{p.approvedRevenue.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isMain ? 'bg-[#0026b3]' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-10 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 font-black border-t-2 border-[#0026b3]/30">
                <td className="py-3.5 px-3.5 rounded-l-xl text-slate-900">
                  รวมรายได้หลักสูตรทั้งหมด ({allCoursePrograms.length} หลักสูตร)
                </td>
                <td className="py-3.5 px-3 text-xs text-slate-600">ทุกประเภท</td>
                <td className="py-3.5 px-3 text-center text-slate-900">{displayPaidCount} รายการ</td>
                <td className="py-3.5 px-3 text-right text-amber-800 text-xs">
                  {pendingAmount > 0 ? `+฿${pendingAmount.toLocaleString()}` : '-'}
                </td>
                <td className="py-3.5 px-3 text-right text-base sm:text-lg text-[#0026b3]">
                  ฿{grandTotalRevenue.toLocaleString()}
                </td>
                <td className="py-3.5 px-3 text-center rounded-r-xl">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#4ade80] text-slate-950 text-xs font-black">
                    <Check className="w-3.5 h-3.5" />
                    <span>100% สมบูรณ์</span>
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ─── 6. SIDE-BY-SIDE FINANCIAL DISTRIBUTION (Bank Channels & Ticket Tiers) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Panel 1: Bank Payment Channels */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <Landmark className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                ช่องทางการชำระเงิน (Bank Channels Breakdown)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {bankBreakdown.length} ธนาคาร
            </span>
          </div>

          {bankBreakdown.length > 0 ? (
            <div className="space-y-3">
              {bankBreakdown.map((item) => (
                <div
                  key={item.bank}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.styling.hex }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">{item.bank}</div>
                      <div className="text-[11px] text-slate-500">{item.count} รายการสลิปที่โอนเข้า</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-black text-slate-900">
                      ฿{item.amount.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-bold text-[#0026b3]">{item.percent}% ของยอดรวม</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-1">
              <Landmark className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">ยังไม่มีข้อมูลช่องทางธนาคาร</p>
              <p className="text-[11px] text-slate-400">ระบบจะประมวลผลเมื่อมีสลิปที่ได้รับการอนุมัติ</p>
            </div>
          )}
        </div>

        {/* Panel 2: Ticket Tiers & Member Categories */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <Tag className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                สัดส่วนประเภทบัตรและสมาชิก (Ticket & Member Tiers)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {ticketTiers.length} ประเภทบัตร
            </span>
          </div>

          {ticketTiers.length > 0 ? (
            <div className="space-y-3">
              {ticketTiers.map((tier) => {
                const percent = totalTierRevenue > 0 ? Math.round((tier.total / totalTierRevenue) * 100) : 0;
                return (
                  <div
                    key={tier.name}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: tier.color }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">{tier.name}</div>
                        <div className="text-[11px] text-slate-500">
                          ฿{tier.price.toLocaleString()} / ที่นั่ง • {tier.count} ที่นั่ง
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-black text-slate-900">
                        ฿{tier.total.toLocaleString()}
                      </div>
                      <div className="text-[11px] font-bold text-emerald-700">{percent}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-1">
              <Tag className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">ยังไม่มีข้อมูลประเภทบัตร</p>
              <p className="text-[11px] text-slate-400">ระบบจะแสดงสถิติเมื่อมีรายการลงทะเบียน</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── 7. RECENT REVENUE TRANSACTIONS LOG ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 lg:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                รายการสลิปและธุรกรรมรายได้ล่าสุด (Recent Revenue Slips)
              </h3>
              <p className="text-xs text-slate-500">
                ตรวจสอบความถูกต้องของรายการโอนเงินและสลิปที่ส่งเข้ามาในรอบที่เลือก
              </p>
            </div>
          </div>

          {/* Quick Filter: All, Approved, Pending */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setTxFilter('all')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${txFilter === 'all' ? 'bg-white text-[#0026b3] shadow-xs font-black' : 'text-slate-600'}`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setTxFilter('approved')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${txFilter === 'approved' ? 'bg-white text-emerald-700 shadow-xs font-black' : 'text-slate-600'}`}
            >
              อนุมัติแล้ว
            </button>
            <button
              onClick={() => setTxFilter('pending')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${txFilter === 'pending' ? 'bg-white text-amber-700 shadow-xs font-black' : 'text-slate-600'}`}
            >
              รอตรวจสอบ
            </button>
          </div>
        </div>

        {scopedRecentSlips.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full min-w-[580px] text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-3.5 rounded-l-xl">ผู้ชำระเงิน / สมาชิก</th>
                  <th className="py-3 px-3">รอบการประชุม / หลักสูตร</th>
                  <th className="py-3 px-3">ธนาคาร & วันที่โอน</th>
                  <th className="py-3 px-3 text-right">ยอดเงิน</th>
                  <th className="py-3 px-3 text-center rounded-r-xl">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {scopedRecentSlips.map((s) => {
                  const m = meetings.find((mtg) => mtg.id === s.meetingId);
                  const isApproved = s.status === 'approved';
                  const isPending = s.status === 'pending';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-3.5">
                        <div className="font-extrabold text-slate-900">{s.nameTh}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          {s.memberCode && <span className="text-[#0026b3] font-bold">[{s.memberCode}]</span>}
                          <span>{s.phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-800 line-clamp-1">{m ? m.titleTh : s.meetingId}</div>
                        <div className="text-[11px] text-slate-500">{s.ticketType}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-700">{s.bank || 'ธนาคารพาณิชย์'}</div>
                        <div className="text-[11px] text-slate-400">{s.transferDate} {s.transferTime ? `• ${s.transferTime}` : ''}</div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-black text-slate-900 text-sm sm:text-base">
                        ฿{s.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>อนุมัติแล้ว</span>
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>รอตรวจสอบ</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>ปฏิเสธ</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-1">
            <Receipt className="w-6 h-6 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">ไม่มีรายการสลิปในตัวกรองนี้</p>
            <p className="text-[11px] text-slate-400">เลือกรอบการประชุมหรือล้างตัวกรองเพื่อดูรายการทั้งหมด</p>
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

    if (formData.staffCode && formData.staffCode.trim().length !== 6) {
      alert('รหัส Staff PIN ต้องเป็นตัวเลข 6 หลัก (เช่น 810773) หรือลบให้ว่างหากยังไม่ต้องการตั้ง');
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
            placeholder="ระบุรายละเอียดการประชุม วิทยากรรับเชิญ หรือหมายเหตุ..."
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

// Note: Slip verification is handled by <AdminSlipsView /> (components/views/AdminSlipsView.tsx)

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
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition ${currentPage === 1
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
                        className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${currentPage === p
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
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition ${currentPage === totalPages
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

  // ─── Admin Authentication State ───
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [adminUser, setAdminUser] = useState<{ username: string; role: string } | null>(null);

  // Check Admin Session on mount
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.authenticated && isMounted) {
            setIsAuthenticated(true);
            setAdminUser(data.user);
          }
        }
      } catch (e) {
        console.error('Failed to verify admin auth:', e);
      } finally {
        if (isMounted) setIsCheckingAuth(false);
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Failed to logout admin:', e);
    }
    setIsAuthenticated(false);
    setAdminUser(null);
  };

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
          selectedActivities: s.selectedActivities || [],
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
    const approvedSlips = [...slips]
      .filter((s) => s.status === 'approved')
      .sort((a, b) => {
        const timeA = new Date(a.transferDate || 0).getTime();
        const timeB = new Date(b.transferDate || 0).getTime();
        return timeA - timeB;
      });

    if (approvedSlips.length > 0) {
      const generatedReceipts: ReceiptData[] = approvedSlips.map((slip, index) => {
        const m = meetings.find((mtg) => mtg.id === slip.meetingId);
        const receiptNo = generateReceiptNo(slip.transferDate, index + 1);
        return {
          id: `REC-${slip.id}`,
          receiptNo,
          receiptDate: slip.transferDate || new Date().toLocaleDateString('th-TH'),
          purposeText: 'ได้รับเงินค่าลงทะเบียน ประจำปี 2569',
          payerType: 'individual',
          payerName: slip.nameTh,
          payerAddressLine1: '',
          payerAddressLine2: '',
          payerPhone: slip.phone,
          items: [
            {
              id: `item-${slip.id}`,
              itemNumber: 1,
              title: 'ค่าลงทะเบียน',
              subDetails: [
                'การประชุมวิชาการ และการประชุมใหญ่สามัญประจำปี 2569',
                'ด้านเทคโนโลยีช่วยการเจริญพันธุ์ทางการแพทย์',
                m ? `จัดขึ้นวันที่ ${m.date}` : 'จัดขึ้นวันที่ 20-21-22 ตุลาคม  2569',
                m ? `${m.location}` : 'โรงแรมแกรนด์ เซนเตอร์ พอยต์ ลุมพินี กรุงเทพฯ',
                slip.nameTh || '',
              ].filter(Boolean),
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
        // Normalize any old/custom receipts to follow the same YYYY/MM-NNN standard
        const normalizedCustom = customOnes.map((r, i) => {
          if (!r.receiptNo || r.receiptNo.includes('SLIP-') || r.receiptNo.includes('SAMPLE-')) {
            return {
              ...r,
              receiptNo: generateReceiptNo(r.receiptDate || r.createdAt, generatedReceipts.length + i + 1),
            };
          }
          return r;
        });

        const uniqueKeys = new Set();
        const merged: ReceiptData[] = [];
        [...normalizedCustom, ...generatedReceipts].forEach((r) => {
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
      receiptNo: generateReceiptNo(new Date(), receipts.length + 1),
      receiptDate: '10 มีนาคม 2569',
      purposeText: 'ได้รับเงินค่าลงทะเบียน ประจำปี 2569',
      payerType: 'individual',
      payerName: attendee.nameTh,
      payerAddressLine1: '',
      payerAddressLine2: '',
      payerPhone: attendee.phone,
      items: [
        {
          id: `item-${Date.now()}`,
          itemNumber: 1,
          title: 'ค่าลงทะเบียน',
          subDetails: [
            'การประชุมวิชาการ และการประชุมใหญ่สามัญประจำปี 2569',
            'ด้านเทคโนโลยีช่วยการเจริญพันธุ์ทางการแพทย์',
            m ? `จัดขึ้นวันที่ ${m.date}` : 'จัดขึ้นวันที่ 20-21-22 ตุลาคม  2569',
            m ? `${m.location}` : 'โรงแรมแกรนด์ เซนเตอร์ พอยต์ ลุมพินี กรุงเทพฯ',
            attendee.nameTh || '',
          ].filter(Boolean),
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
      receiptNo: generateReceiptNo(slip.transferDate, receipts.length + 1),
      receiptDate: slip.transferDate || '10 มีนาคม 2569',
      purposeText: 'ได้รับเงินค่าลงทะเบียน ประจำปี 2569',
      payerType: 'individual',
      payerName: slip.nameTh,
      payerAddressLine1: '',
      payerAddressLine2: '',
      payerPhone: slip.phone,
      items: [
        {
          id: `item-${Date.now()}`,
          itemNumber: 1,
          title: 'ค่าลงทะเบียน',
          subDetails: [
            'การประชุมวิชาการ และการประชุมใหญ่สามัญประจำปี 2569',
            'ด้านเทคโนโลยีช่วยการเจริญพันธุ์ทางการแพทย์',
            m ? `จัดขึ้นวันที่ ${m.date}` : 'จัดขึ้นวันที่ 20-21-22 ตุลาคม  2569',
            m ? `${m.location}` : 'โรงแรมแกรนด์ เซนเตอร์ พอยต์ ลุมพินี กรุงเทพฯ',
            slip.nameTh || '',
          ].filter(Boolean),
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
      case 'settings':
        return (
          <AdminSettingsPanel
            onShowToast={(msg) => {
              setGlobalToastMessage(msg);
              setTimeout(() => setGlobalToastMessage(null), 4000);
            }}
          />
        );
      default:
        return null;
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
        <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 p-2.5 flex items-center justify-center animate-pulse mb-4">
          <ThaiSrmLogo className="w-full h-full object-contain" />
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-ping" />
          <span>กำลังตรวจสอบสิทธิ์การเข้าถึงระบบผู้ดูแล...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminLoginView
        onLoginSuccess={(user) => {
          setIsAuthenticated(true);
          setAdminUser(user);
        }}
      />
    );
  }

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
        onLogout={handleLogout}
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


