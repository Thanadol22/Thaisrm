'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AttendeeItem, MeetingItem } from './types';
import { PaginationControls } from '@/components/PaginationControls';
import { SmartEmailInput } from '@/components/SmartEmailInput';
import {
  UserCheck,
  PlusCircle,
  FileSpreadsheet,
  Filter,
  CalendarDays,
  ChevronDown,
  MapPin,
  Search,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Pencil,
  Eye,
  RefreshCw,
  Check,
} from 'lucide-react';

/* ─── 5. VERIFY ATTENDEES PANEL (Light Theme with Round Filter) ───────────── */

export interface VerifyAttendeesPanelProps {
  attendees: AttendeeItem[];
  meetings: MeetingItem[];
  initialMeetingId?: string;
  onToggleCheckIn: (id: string) => void;
  onAddAttendee?: (newAttendee: AttendeeItem) => void;
  onPrintReceipt?: (attendee: AttendeeItem) => void;
  onUpdatePaymentStatus?: (
    attendeeId: string,
    paymentStatus: 'paid' | 'pending' | 'rejected',
    rejectionReason?: string
  ) => Promise<void>;
}

export function VerifyAttendeesPanel({
  attendees,
  meetings,
  initialMeetingId,
  onToggleCheckIn,
  onAddAttendee,
  onPrintReceipt,
  onUpdatePaymentStatus,
}: VerifyAttendeesPanelProps) {
  // Find current ongoing meeting (or first upcoming, or fallback to first meeting)
  const currentOngoingMeeting = useMemo(() => {
    return (
      meetings.find((m) => m.status === 'ongoing') ||
      meetings.find((m) => m.status === 'upcoming') ||
      meetings[0]
    );
  }, [meetings]);

  const [selectedMeetingId, setSelectedMeetingId] = useState<string>(initialMeetingId || 'default');

  useEffect(() => {
    if (initialMeetingId) {
      setSelectedMeetingId(initialMeetingId);
    }
  }, [initialMeetingId]);

  const activeMeetingId =
    selectedMeetingId === 'default'
      ? currentOngoingMeeting
        ? currentOngoingMeeting.id
        : 'all'
      : selectedMeetingId;

  const currentMeeting = meetings.find((m) => m.id === activeMeetingId);

  const [search, setSearch] = useState('');
  const [filterCheckIn, setFilterCheckIn] = useState<'all' | 'checked_in' | 'not_checked_in'>('all');
  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'pending' | 'rejected'>('all');
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeItem | null>(null);

  // Status Edit Modal State
  const [editingStatusAttendee, setEditingStatusAttendee] = useState<AttendeeItem | null>(null);
  const [editStatusValue, setEditStatusValue] = useState<'paid' | 'pending' | 'rejected'>('paid');
  const [editRejectionReason, setEditRejectionReason] = useState<string>('');
  const [isSavingStatus, setIsSavingStatus] = useState<boolean>(false);

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
    ticketType: 'TSRM Congress Full Pass',
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
      email: walkInData.email || 'attendee@tsrm.org',
      phone: walkInData.phone,
      workplace: walkInData.workplace || 'โรงพยาบาล/คลินิก',
      memberType: walkInData.memberType,
      ticketType: walkInData.ticketType,
      ticketCode: `TSRM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      meetingId: meeting?.id || '',
      meetingTitle: meeting?.titleTh || 'การประชุมวิชาการประจำปี TSRM Congress 2026',
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
      ticketType: 'TSRM Congress Full Pass',
      paymentStatus: 'paid',
      checkInNow: true,
    });
  };

  const handleSaveStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStatusAttendee || !onUpdatePaymentStatus) return;
    setIsSavingStatus(true);
    try {
      await onUpdatePaymentStatus(editingStatusAttendee.id, editStatusValue, editRejectionReason);
      setEditingStatusAttendee(null);
    } finally {
      setIsSavingStatus(false);
    }
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
      const matchPayment =
        filterPayment === 'all' ||
        (filterPayment === 'pending'
          ? a.paymentStatus === 'pending' || a.paymentStatus === 'unpaid'
          : a.paymentStatus === filterPayment);
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
  const pendingInRound = roundAttendees.filter(
    (a) => a.paymentStatus === 'pending' || a.paymentStatus === 'unpaid'
  ).length;
  const rejectedInRound = roundAttendees.filter((a) => a.paymentStatus === 'rejected').length;
  const rateInRound = totalInRound > 0 ? Math.round((checkedInInRound / totalInRound) * 100) : 0;

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = [
      'รหัสสมาชิก',
      'เลขท้าย 4 หลัก',
      'ชื่อ-นามสกุล (ไทย)',
      'ชื่อ-นามสกุล (อังกฤษ)',
      'อีเมล',
      'โทรศัพท์',
      'สถานที่ทำงาน',
      'ประเภทสมาชิก',
      'ประเภทบัตร',
      'รหัสตั๋ว',
      'รอบการประชุม',
      'สถานะชำระเงิน',
      'สถานะเช็คอิน',
      'เวลาเช็คอิน',
    ];
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
      a.paymentStatus === 'paid' ? 'ชำระแล้ว' : a.paymentStatus === 'rejected' ? 'สลิปถูกปฏิเสธ' : 'รอชำระ',
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
            <span>เลือกรอบการประชุม:</span>
          </label>
          <span className="text-xs text-slate-500 font-medium">
            ผู้ลงทะเบียนในรอบที่เลือก: <strong className="text-[#0026b3] font-bold">{roundAttendees.length}</strong> คน
            • เช็คอินแล้ว <strong className="text-emerald-700 font-bold">{checkedInInRound}</strong> คน
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
              const mAttendees = attendees.filter((a) => a.meetingId === m.id || a.meetingTitle === m.titleTh);
              const mChecked = mAttendees.filter((a) => a.checkInStatus === 'checked_in').length;
              return (
                <option key={m.id} value={m.id}>
                  {isOngoing ? '🟢 [รอบปัจจุบัน] ' : isUpcoming ? '🟡 [เร็วๆ นี้] ' : '📅 '}
                  [{m.id}] {m.titleTh} ({m.date}) — เช็คอิน {mChecked}/{mAttendees.length || m.registered} คน
                </option>
              );
            })}
            <option value="all">🌐 รวมทุกรอบการประชุม — รวมทั้งหมด {attendees.length} คน</option>
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
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    currentMeeting.status === 'ongoing'
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
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">{currentMeeting.titleTh}</h2>
              <div className="text-xs sm:text-sm text-slate-500 font-medium">{currentMeeting.titleEn}</div>
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
                <div className="text-base sm:text-lg font-extrabold text-emerald-600">{checkedInInRound}</div>
              </div>
              <div className="px-2 border-l border-slate-100">
                <div className="text-[11px] text-slate-500 font-bold">ยังไม่เช็คอิน</div>
                <div className="text-base sm:text-lg font-extrabold text-amber-600">{notCheckedInInRound}</div>
              </div>
              <div className="px-2 border-l border-slate-100">
                <div className="text-[11px] text-slate-500 font-bold">อัตราเช็คอิน</div>
                <div className="text-base sm:text-lg font-extrabold text-[#0026b3]">{rateInRound}%</div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>ความคืบหน้าการเช็คอินเข้างานรอบนี้</span>
              <span className="font-extrabold text-[#0026b3]">
                {rateInRound}% ({checkedInInRound}/{totalInRound} คน)
              </span>
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
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 text-xs p-1">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  filterCheckIn === tab.id
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
            <option value="paid">ชำระแล้ว ({paidInRound})</option>
            <option value="pending">รอชำระ ({pendingInRound})</option>
            <option value="rejected">สลิปถูกปฏิเสธ ({rejectedInRound})</option>
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
                      <div className="font-bold text-slate-900 group-hover:text-[#0026b3] transition">{a.nameTh}</div>
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
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                            a.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : a.paymentStatus === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {a.paymentStatus === 'paid' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> ชำระแล้ว
                            </>
                          ) : a.paymentStatus === 'rejected' ? (
                            <>
                              <XCircle className="w-3 h-3" /> สลิปถูกปฏิเสธ
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" /> รอชำระ
                            </>
                          )}
                        </span>
                      </div>
                      {a.paymentStatus === 'rejected' && a.rejectionReason && (
                        <div
                          className="text-[11px] text-rose-500 mt-0.5 truncate max-w-[170px]"
                          title={a.rejectionReason}
                        >
                          {a.rejectionReason}
                        </div>
                      )}
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
                          className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                            a.checkInStatus === 'checked_in'
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                              : 'bg-[#0026b3] hover:bg-[#001f94] text-white shadow-xs'
                          }`}
                        >
                          {a.checkInStatus === 'checked_in' ? 'ยกเลิก' : 'เช็คอิน'}
                        </button>
                        {onUpdatePaymentStatus && (
                          <button
                            onClick={() => {
                              setEditingStatusAttendee(a);
                              setEditStatusValue(
                                a.paymentStatus === 'paid'
                                  ? 'paid'
                                  : a.paymentStatus === 'rejected'
                                    ? 'rejected'
                                    : 'pending'
                              );
                              setEditRejectionReason(a.rejectionReason || '');
                            }}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-[#0026b3] border border-slate-200 transition cursor-pointer"
                            title="แก้ไขสถานะการชำระเงิน"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedAttendee(a)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer"
                          title="ดูรายละเอียด"
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
      <PaginationControls
        currentPage={currentPage}
        totalItems={filteredAttendees.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        itemLabel="รายชื่อ"
      />

      {/* ─── Edit Payment Status Modal ────────────────────────────────────── */}
      {editingStatusAttendee &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-[#0026b3]" />
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">แก้ไขสถานะการชำระเงิน</h3>
                </div>
                <button
                  onClick={() => setEditingStatusAttendee(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1 text-xs">
                <div className="font-bold text-sm text-slate-900">{editingStatusAttendee.nameTh}</div>
                <div className="text-slate-500">
                  รหัสสมาชิก: <span className="font-bold text-[#0026b3]">{editingStatusAttendee.code}</span> |
                  รหัสตั๋ว: <span className="font-mono">{editingStatusAttendee.ticketCode}</span>
                </div>
                <div className="text-slate-500 truncate">รอบ: {editingStatusAttendee.meetingTitle}</div>
              </div>

              <form onSubmit={handleSaveStatusChange} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">เลือกสถานะใหม่:</label>

                  <div className="space-y-2">
                    <label
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        editStatusValue === 'paid'
                          ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_status_radio"
                        value="paid"
                        checked={editStatusValue === 'paid'}
                        onChange={() => setEditStatusValue('paid')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-xs flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" /> ชำระเงินแล้ว
                        </div>
                        <div className="text-[11px] text-slate-500">
                          อนุมัติสิทธิ์การเข้าร่วมงานและสามารถออกใบเสร็จได้
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        editStatusValue === 'pending'
                          ? 'bg-amber-50/70 border-amber-500 text-amber-900 ring-1 ring-amber-500'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_status_radio"
                        value="pending"
                        checked={editStatusValue === 'pending'}
                        onChange={() => setEditStatusValue('pending')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-xs flex items-center gap-1.5 text-amber-700">
                          <Clock className="w-4 h-4" /> รอชำระเงิน
                        </div>
                        <div className="text-[11px] text-slate-500">
                          อยู่ระหว่างรอแนบสลิปหรือรอเจ้าหน้าที่ตรวจสอบ
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        editStatusValue === 'rejected'
                          ? 'bg-rose-50/70 border-rose-500 text-rose-900 ring-1 ring-rose-500'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_status_radio"
                        value="rejected"
                        checked={editStatusValue === 'rejected'}
                        onChange={() => setEditStatusValue('rejected')}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-xs flex items-center gap-1.5 text-rose-700">
                          <XCircle className="w-4 h-4" /> สลิปถูกปฏิเสธ
                        </div>
                        <div className="text-[11px] text-slate-500">
                          หลักฐานไม่ถูกต้อง หรือยอดเงินไม่ตรง แจ้งให้แนบใหม่
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {editStatusValue === 'rejected' && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-xs font-bold text-slate-700">
                      ระบุเหตุผลในการปฏิเสธ (ไม่บังคับ):
                    </label>
                    <textarea
                      value={editRejectionReason}
                      onChange={(e) => setEditRejectionReason(e.target.value)}
                      placeholder="เช่น ยอดเงินไม่ถูกต้อง, สลิปไม่ชัดเจน, วันที่โอนไม่ตรง..."
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0026b3] resize-none h-20"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingStatusAttendee(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingStatus}
                    className="px-4 py-2 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingStatus ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>บันทึกสถานะ</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ─── Attendee Details Modal ──────────────────────────────────────── */}
      {selectedAttendee &&
        typeof document !== 'undefined' &&
        createPortal(
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
                    <span className="text-[#0026b3] font-bold text-right max-w-[260px]">
                      {selectedAttendee.meetingTitle}
                    </span>
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
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">สถานะการชำระเงิน:</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold text-xs px-2.5 py-0.5 rounded-full ${
                          selectedAttendee.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : selectedAttendee.paymentStatus === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {selectedAttendee.paymentStatus === 'paid'
                          ? '✓ ชำระแล้ว'
                          : selectedAttendee.paymentStatus === 'rejected'
                            ? '✕ สลิปถูกปฏิเสธ'
                            : '⏳ รอชำระ'}
                      </span>
                      {onUpdatePaymentStatus && (
                        <button
                          onClick={() => {
                            const target = selectedAttendee;
                            setSelectedAttendee(null);
                            setEditingStatusAttendee(target);
                            setEditStatusValue(
                              target.paymentStatus === 'paid'
                                ? 'paid'
                                : target.paymentStatus === 'rejected'
                                  ? 'rejected'
                                  : 'pending'
                            );
                            setEditRejectionReason(target.rejectionReason || '');
                          }}
                          className="text-xs text-[#0026b3] hover:underline font-bold"
                        >
                          แก้ไขสถานะ
                        </button>
                      )}
                    </div>
                  </div>
                  {selectedAttendee.paymentStatus === 'rejected' && selectedAttendee.rejectionReason && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800">
                      <span className="font-bold">สาเหตุที่ปฏิเสธ:</span> {selectedAttendee.rejectionReason}
                    </div>
                  )}
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
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer shadow-xs transition ${
                    selectedAttendee.checkInStatus === 'checked_in'
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
      {isAddModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#0026b3]">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">ลงทะเบียนผู้เข้าร่วมหน้างาน</h3>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">รอบการประชุมที่ลงทะเบียน *</label>
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อ-นามสกุล (ภาษาไทย) *</label>
                    <input
                      type="text"
                      required
                      value={walkInData.nameTh}
                      onChange={(e) =>
                        setWalkInData({
                          ...walkInData,
                          nameTh: e.target.value.replace(/[^\u0E00-\u0E7F\s\.\-]/g, ''),
                        })
                      }
                      placeholder="ชื่อ-นามสกุล (ไม่ต้องมีคำนำหน้า)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อ-นามสกุล (ภาษาอังกฤษ)</label>
                    <input
                      type="text"
                      value={walkInData.nameEn}
                      onChange={(e) =>
                        setWalkInData({ ...walkInData, nameEn: e.target.value.replace(/[^a-zA-Z\s\.\-']/g, '') })
                      }
                      placeholder="Full Name (Without prefix)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={walkInData.phone}
                      onChange={(e) =>
                        setWalkInData({ ...walkInData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                      }
                      placeholder="081-234-5678"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">เลขท้าย 4 หลักบัตรประชาชน</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={walkInData.id4Digits}
                      onChange={(e) =>
                        setWalkInData({ ...walkInData, id4Digits: e.target.value.replace(/\D/g, '').slice(0, 4) })
                      }
                      placeholder="1234"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-[#0026b3]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <SmartEmailInput
                      value={walkInData.email}
                      onChange={(val) => setWalkInData({ ...walkInData, email: val })}
                      label="อีเมล"
                      placeholder="doctor@hospital.com"
                      helperText="กรุณากรอกอีเมลที่มีอยู่จริง"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">หน่วยงาน / สถานที่ทำงาน</label>
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทสมาชิก</label>
                    <select
                      value={walkInData.memberType}
                      onChange={(e) => setWalkInData({ ...walkInData, memberType: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-[#0026b3]"
                    >
                      <option value="แพทย์เวชศาสตร์การเจริญพันธุ์ (RM)">แพทย์เวชศาสตร์การเจริญพันธุ์ (RM)</option>
                      <option value="สูตินรีแพทย์ทั่วไป (OB-GYN)">สูตินรีแพทย์ทั่วไป (OB-GYN)</option>
                      <option value="นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อน">นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อน</option>
                      <option value="พยาบาลและบุคลากรทางการแพทย์">พยาบาลและบุคลากรทางการแพทย์</option>
                      <option value="สมาชิกทั่วไป">สมาชิกทั่วไป</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทบัตร</label>
                    <select
                      value={walkInData.ticketType}
                      onChange={(e) => setWalkInData({ ...walkInData, ticketType: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-[#0026b3]"
                    >
                      <option value="TSRM Congress Full Pass">TSRM Congress Full Pass (3,500 บาท)</option>
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
                      <span className="text-xs font-bold text-emerald-700">ชำระเงินแล้ว</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentStatus"
                        checked={walkInData.paymentStatus === 'pending'}
                        onChange={() => setWalkInData({ ...walkInData, paymentStatus: 'pending' })}
                        className="accent-[#0026b3]"
                      />
                      <span className="text-xs font-bold text-amber-700">รอชำระ</span>
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
