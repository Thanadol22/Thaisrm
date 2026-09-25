'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Receipt,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Check,
  X,
  CreditCard,
  Building2,
  AlertCircle,
  RotateCw,
  UserCheck,
  UserX,
  ExternalLink,
  BookOpen,
  Layers,
  Sparkles,
  User,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { PaginationControls } from '@/components/PaginationControls';
import { MemberDetailModal } from '@/components/MemberDetailModal';

export interface SlipActivityItem {
  id?: string;
  name: string;
  date?: string;
  type?: string;
  price?: number;
  rateBadgeTh?: string;
  rateBadgeEn?: string;
}

export function getAttendeeActivities(att: any): { name: string; price?: number }[] {
  if (!att) return [];

  // 1. Array of activity objects
  if (Array.isArray(att.selectedActivityObjects) && att.selectedActivityObjects.length > 0) {
    return att.selectedActivityObjects.map((act: any) => ({
      name: typeof act === 'object' && act !== null ? (act.name || act.title || 'กิจกรรมการประชุม') : String(act),
      price: typeof act === 'object' && act !== null ? (act.price || 0) : 0,
    }));
  }

  // 2. selectedActivities
  if (Array.isArray(att.selectedActivities) && att.selectedActivities.length > 0) {
    return att.selectedActivities.map((act: any) => {
      if (typeof act === 'object' && act !== null) {
        return {
          name: act.name || act.title || act.id || 'กิจกรรมการประชุม',
          price: act.price || 0,
        };
      }
      return {
        name: String(act),
        price: 0,
      };
    });
  }

  // 3. programNameTh
  if (att.programNameTh) {
    return [{
      name: att.programNameTh,
      price: att.subtotal || att.price || 0,
    }];
  }

  // 4. selectedPackage
  if (att.selectedPackage) {
    return [{
      name: att.selectedPackage,
      price: att.subtotal || att.price || 0,
    }];
  }

  return [];
}

export interface SlipRecord {
  id: string;
  dbId?: string;
  meetingId?: string;
  meetingName?: string;
  memberNo?: string | null;
  isMember: boolean;
  isMembershipRegistration?: boolean;
  isGroupMembership?: boolean;
  isGroupConference?: boolean;
  groupPayload?: any;
  companyName?: string;
  isFormatChange?: boolean;
  formatChangePayload?: any;
  memberPayload?: any;
  nameTh: string;
  nameEn: string;
  email: string;
  phone: string;
  workplace: string;
  ticketType: string;
  ticketCode: string;
  amount: number;
  bank: string;
  transferTime: string;
  transferDate: string;
  refNo: string;
  slipUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  resubmitToken?: string | null;
  selectedActivities?: SlipActivityItem[] | string;
  createdAt?: string;
  coordinatorName?: string | null;
  coordinatorEmail?: string | null;
  coordinatorPhone?: string | null;
  couponCode?: string | null;
  couponInfo?: {
    code: string;
    companyName?: string;
    discountType?: string;
    discountValue?: number;
    remarks?: string;
    usedCount?: number;
  } | null;
  couponUsages?: Array<{
    id: string;
    couponCode?: string;
    memberNo?: string | null;
    attendeeName?: string;
    attendeeEmail?: string;
    attendeePhone?: string;
    workplace?: string;
    discountApplied?: number;
    finalAmount?: number;
  }>;
  discountTotal?: number;
}

export function parseSlipActivities(raw?: SlipActivityItem[] | string | any, fallbackAmount?: number): SlipActivityItem[] {
  if (!raw) {
    if (fallbackAmount !== undefined && Number(fallbackAmount) > 0) {
      return [{
        name: 'การลงทะเบียน',
        price: Number(fallbackAmount),
      }];
    }
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map((item: any) => ({
      ...item,
      price: (item.price !== undefined && Number(item.price) > 0)
        ? Number(item.price)
        : (raw.length === 1 && fallbackAmount !== undefined && Number(fallbackAmount) > 0
            ? Number(fallbackAmount)
            : Number(item.price || 0)),
    }));
  }
  if (typeof raw === 'object') {
    if (raw.attendees && Array.isArray(raw.attendees)) {
      const attendeeCount = raw.attendees.length;
      const attendeesSum = raw.attendees.reduce((sum: number, a: any) => sum + Number(a.subtotal || a.price || 0), 0);
      const effectivePrice = (fallbackAmount !== undefined && Number(fallbackAmount) > 0)
        ? Number(fallbackAmount)
        : (Number(raw.amount) || attendeesSum || 0);
      const hasMemberAttendees = raw.attendees.some((a: any) => a.isMember || a.memberNo);

      return [{
        id: 'conference_group_registration',
        name: hasMemberAttendees
          ? `ลงทะเบียนประชุมแบบกลุ่ม - สมาชิกสมาคม (${raw.companyName || 'Corporate'} - รวม ${attendeeCount} ท่าน)`
          : `ลงทะเบียนประชุมแบบกลุ่ม (${raw.companyName || 'Corporate'} - รวม ${attendeeCount} ท่าน)`,
        type: 'conference_group',
        price: effectivePrice,
        rateBadgeTh: hasMemberAttendees ? `กลุ่มสมาชิก ${attendeeCount} ท่าน` : `กลุ่ม ${attendeeCount} ท่าน`,
        rateBadgeEn: hasMemberAttendees ? `Member Group (${attendeeCount})` : `Group (${attendeeCount})`,
      }];
    }
    if (raw.activities && Array.isArray(raw.activities)) {
      return parseSlipActivities(raw.activities, fallbackAmount);
    }
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parseSlipActivities(parsed, fallbackAmount);
      if (typeof parsed === 'object') return parseSlipActivities(parsed, fallbackAmount);
    } catch {
      return [];
    }
  }
  return [];
}

export function AdminSlipsView() {
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [slips, setSlips] = useState<SlipRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'pay_later'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'individual' | 'corporate' | 'corporate_pay_later'>('all');
  const [selectedSlip, setSelectedSlip] = useState<SlipRecord | null>(null);
  const [viewingApplicant, setViewingApplicant] = useState<any | null>(null);
  const [viewingAttendee, setViewingAttendee] = useState<any | null>(null);
  const [showAllGroupAttendees, setShowAllGroupAttendees] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setShowAllGroupAttendees(false);
  }, [selectedSlip?.id]);

  // Pagination state (Default 5 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Reject modal state
  const [rejectingSlipId, setRejectingSlipId] = useState<string | null>(null);
  const [rejectType, setRejectType] = useState<'info' | 'slip'>('info');
  const [rejectReason, setRejectReason] = useState('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและแก้ไขข้อมูลให้ถูกต้อง');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSlipId, setProcessingSlipId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchSlips();
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.slip_rejection_reason) {
          setRejectReason(json.data.slip_rejection_reason);
        }
      })
      .catch(() => {});
  }, []);

  // Reset to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter]);

  const fetchSlips = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/slips');
      const json = await res.json();
      if (json.success) {
        setSlips(json.data || []);
      }
    } catch (err) {
      console.error('Error loading slips:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleApprove = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setIsProcessing(true);
      setProcessingSlipId(id);
      const res = await fetch('/api/admin/slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slipId: id, action: 'approve' }),
      });
      const json = await res.json();
      if (json.success) {
        const approvedMemberNo = json.data?.memberNo;
        setSlips((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: 'approved',
                  notes: undefined,
                  memberNo: approvedMemberNo || s.memberNo,
                  isMember: Boolean(approvedMemberNo || s.isMember),
                }
              : s
          )
        );
        if (selectedSlip && selectedSlip.id === id) {
          setSelectedSlip((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'approved',
                  notes: undefined,
                  memberNo: approvedMemberNo || prev.memberNo,
                  isMember: Boolean(approvedMemberNo || prev.isMember),
                }
              : null
          );
        }
        const targetSlip = slips.find((s) => s.id === id) || selectedSlip;
        const isPayLaterSlip =
          targetSlip?.bank?.includes('ชำระเงินภายหลัง') ||
          targetSlip?.bank?.toLowerCase().includes('pay later') ||
          targetSlip?.slipUrl === 'PAY_LATER';
        showToast(
          approvedMemberNo
            ? (lang === 'th' ? `✓ อนุมัติสิทธิ์และสร้างบัญชีสมาชิกเรียบร้อยแล้ว (รหัส: ${approvedMemberNo})` : `✓ Access approved and member created (No: ${approvedMemberNo})`)
            : isPayLaterSlip
            ? (lang === 'th' ? '✓ อนุมัติคำขอและสร้างบัญชีสมาชิกเรียบร้อยแล้ว (สถานะ: รอชำระเงิน/รอสลิป)' : '✓ Request approved (Awaiting Payment)')
            : (lang === 'th' ? '✓ อนุมัติรายการเรียบร้อยแล้ว' : '✓ Approved successfully')
        );
      } else {
        showToast(`✕ ${json.error || 'เกิดข้อผิดพลาดในการอนุมัติ'}`);
      }
    } catch (err: any) {
      showToast(`✕ ${err.message || 'Error approving slip'}`);
    } finally {
      setIsProcessing(false);
      setProcessingSlipId(null);
    }
  };

  const openRejectModal = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRejectingSlipId(id);
    setRejectType('info');
    setRejectReason('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและแก้ไขข้อมูลให้ถูกต้อง');
  };

  const handleConfirmReject = async () => {
    if (!rejectingSlipId) return;
    try {
      setIsProcessing(true);
      const res = await fetch('/api/admin/slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slipId: rejectingSlipId,
          action: 'reject',
          notes: rejectReason,
          rejectType,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSlips((prev) =>
          prev.map((s) =>
            s.id === rejectingSlipId
              ? { ...s, status: 'rejected', notes: rejectReason, resubmitToken: json.data?.resubmitToken }
              : s
          )
        );
        if (selectedSlip && selectedSlip.id === rejectingSlipId) {
          setSelectedSlip((prev) =>
            prev ? { ...prev, status: 'rejected', notes: rejectReason, resubmitToken: json.data?.resubmitToken } : null
          );
        }
        showToast(lang === 'th' ? 'ปฏิเสธสลิปและส่งอีเมลแจ้งแนบใหม่แล้ว' : 'Slip rejected and email sent');
        setRejectingSlipId(null);
      } else {
        showToast(json.error || 'เกิดข้อผิดพลาดในการปฏิเสธ');
      }
    } catch (err: any) {
      showToast(err.message || 'Error rejecting slip');
    } finally {
      setIsProcessing(false);
    }
  };

  const isCorporateSlip = (s: SlipRecord) =>
    Boolean(
      s.isGroupMembership ||
      s.isGroupConference ||
      s.groupPayload?.attendees ||
      s.groupPayload?.applicants ||
      s.ticketCode?.startsWith('MEMGRP') ||
      s.ticketCode?.startsWith('GRP-')
    );

  const isPayLaterSlip = (s: SlipRecord) =>
    Boolean(
      s.bank?.includes('ชำระเงินภายหลัง') ||
      s.bank?.toLowerCase().includes('pay later') ||
      s.slipUrl === 'PAY_LATER' ||
      s.slipUrl === 'pay_later_pending' ||
      s.slipUrl === '/placeholder-slip.png' ||
      !s.slipUrl
    );

  // Slips filtered only by Category (used for scoped metrics and status filter counts)
  const categorySlips = React.useMemo(() => {
    return slips.filter((s) => {
      const isCorporate = isCorporateSlip(s);
      const isPayLater = isPayLaterSlip(s);
      if (categoryFilter === 'individual' && isCorporate) return false;
      if (categoryFilter === 'corporate' && !isCorporate) return false;
      if (categoryFilter === 'corporate_pay_later' && (!isCorporate || !isPayLater)) return false;
      return true;
    });
  }, [slips, categoryFilter]);

  // Overall category counts
  const totalCount = slips.length;
  const individualSlips = React.useMemo(
    () => slips.filter((s) => !isCorporateSlip(s)),
    [slips]
  );
  const corporateSlips = React.useMemo(
    () => slips.filter((s) => isCorporateSlip(s)),
    [slips]
  );
  const corporatePayLaterSlips = React.useMemo(
    () => slips.filter((s) => isCorporateSlip(s) && isPayLaterSlip(s)),
    [slips]
  );

  // Scoped metrics for current category
  const categoryTotalCount = categorySlips.length;
  const categoryPendingCount = React.useMemo(
    () => categorySlips.filter((s) => s.status === 'pending').length,
    [categorySlips]
  );
  const categoryApprovedCount = React.useMemo(
    () => categorySlips.filter((s) => s.status === 'approved').length,
    [categorySlips]
  );
  const categoryRejectedCount = React.useMemo(
    () => categorySlips.filter((s) => s.status === 'rejected').length,
    [categorySlips]
  );
  const categoryPayLaterCount = React.useMemo(
    () => categorySlips.filter((s) => isPayLaterSlip(s)).length,
    [categorySlips]
  );

  // Total pending across all categories (for header quick badge)
  const allPendingCount = React.useMemo(
    () => slips.filter((s) => s.status === 'pending').length,
    [slips]
  );

  const filteredSlips = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return categorySlips.filter((s) => {
      // Status filter
      if (statusFilter === 'pay_later') {
        if (!isPayLaterSlip(s)) return false;
      } else if (statusFilter !== 'all' && s.status !== statusFilter) {
        return false;
      }

      // Search query filter
      if (!q) return true;

      const acts = parseSlipActivities(s.selectedActivities);
      const matchesActivities = acts.some((a) => a.name && a.name.toLowerCase().includes(q));

      // Also search group applicants names / email / phone
      const matchesApplicants = Boolean(
        s.groupPayload?.applicants &&
          Array.isArray(s.groupPayload.applicants) &&
          s.groupPayload.applicants.some(
            (app: any) =>
              (app.full_name_th && app.full_name_th.toLowerCase().includes(q)) ||
              (app.full_name_en && app.full_name_en.toLowerCase().includes(q)) ||
              (app.email && app.email.toLowerCase().includes(q)) ||
              (app.mobile && app.mobile.toLowerCase().includes(q))
          )
      );

      return (
        (s.nameTh && s.nameTh.toLowerCase().includes(q)) ||
        (s.nameEn && s.nameEn.toLowerCase().includes(q)) ||
        (s.companyName && s.companyName.toLowerCase().includes(q)) ||
        (s.ticketCode && s.ticketCode.toLowerCase().includes(q)) ||
        (s.refNo && s.refNo.toLowerCase().includes(q)) ||
        (s.workplace && s.workplace.toLowerCase().includes(q)) ||
        (s.memberNo && s.memberNo.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        matchesActivities ||
        matchesApplicants
      );
    });
  }, [categorySlips, searchQuery, statusFilter]);

  // Paginated slips (5 items per page)
  const paginatedSlips = React.useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filteredSlips.length / pageSize));
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (validPage - 1) * pageSize;
    return filteredSlips.slice(start, start + pageSize);
  }, [filteredSlips, currentPage, pageSize]);

  return (
    <div className="flex-1 flex flex-col justify-start animate-fade-in p-3 sm:p-6 space-y-4 max-w-6xl mx-auto w-full">
      {/* Toast Notification */}
      {mounted &&
        toastMessage &&
        createPortal(
          <div className="fixed bottom-6 right-6 z-[10000] bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-[#4ade80]/40 flex items-center gap-2 animate-slide-up text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
            <span>{toastMessage}</span>
          </div>,
          document.body
        )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white p-4 sm:p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#4ade80]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md text-[#4ade80]">
                <Receipt className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {lang === 'th' ? 'ตรวจสอบการชำระเงิน' : 'Payment Verification & Review'}
              </h1>
            </div>
            <p className="text-xs text-blue-100/90 font-normal">
              {lang === 'th'
                ? 'ตรวจสอบหลักฐานการชำระเงินค่าประชุม อนุมัติสิทธิ์เข้างาน หรือแจ้งส่งสลิปใหม่'
                : 'Review payment slips, verify bank transaction details, and approve event access.'}
            </p>
          </div>

          {/* Quick Summary Badges & Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchSlips}
              disabled={loading}
              className="bg-white/15 hover:bg-white/25 text-white backdrop-blur-md px-3 py-1.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 border border-white/20 transition cursor-pointer active:scale-95"
              title="รีเฟรชข้อมูล"
            >
              <RotateCw className={`w-3.5 h-3.5 text-blue-200 ${loading ? 'animate-spin' : ''}`} />
              <span>{lang === 'th' ? 'รีเฟรช' : 'Refresh'}</span>
            </button>
            <span className="bg-white/15 text-white backdrop-blur-md px-3 py-1.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 border border-white/20">
              <Receipt className="w-3.5 h-3.5 text-blue-200" />
              <span>
                {lang === 'th' ? 'ทั้งหมด' : 'Total'}: {totalCount}
              </span>
            </span>
            <span className="bg-amber-400 text-amber-950 px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-sm">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {lang === 'th' ? 'รอตรวจ' : 'Pending'}: {allPendingCount}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── Mode / Module Switcher: Individual vs Corporate Group vs Corporate Pay Later ─── */}
      <div className="flex items-center p-1.5 bg-slate-100 rounded-2xl w-full border border-slate-200 shadow-2xs gap-1.5 overflow-x-auto">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
            categoryFilter === 'all'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-600" />
          <span>{lang === 'th' ? 'ทุกประเภท' : 'All Types'}</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              categoryFilter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {totalCount}
          </span>
        </button>

        <button
          onClick={() => setCategoryFilter('individual')}
          className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
            categoryFilter === 'individual'
              ? 'bg-white text-slate-900 shadow-sm border border-purple-200 ring-1 ring-purple-400/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <User className="w-4 h-4 text-purple-600" />
          <span>{lang === 'th' ? 'บุคคลทั่วไป / สมาชิกเดี่ยว' : 'Individual & Member'}</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              categoryFilter === 'individual' ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {individualSlips.length}
          </span>
        </button>

        <button
          onClick={() => setCategoryFilter('corporate')}
          className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
            categoryFilter === 'corporate'
              ? 'bg-white text-slate-900 shadow-sm border border-indigo-200 ring-1 ring-indigo-400/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>{lang === 'th' ? 'องค์กร / กลุ่มบริษัททั้งหมด' : 'Corporate Group (All)'}</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              categoryFilter === 'corporate' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {corporateSlips.length}
          </span>
        </button>

        <button
          onClick={() => setCategoryFilter('corporate_pay_later')}
          className={`flex-1 min-w-[165px] flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
            categoryFilter === 'corporate_pay_later'
              ? 'bg-amber-500 text-amber-950 shadow-sm border border-amber-600 ring-2 ring-amber-400/40 font-black'
              : 'text-amber-800 bg-amber-50/80 hover:bg-amber-100 border border-amber-200/70'
          }`}
        >
          <CreditCard className="w-4 h-4 text-amber-900" />
          <span>{lang === 'th' ? 'กลุ่มรอชำระเงิน' : 'Corporate Pay Later'}</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              categoryFilter === 'corporate_pay_later' ? 'bg-amber-950 text-amber-100' : 'bg-amber-200 text-amber-900'
            }`}
          >
            {corporatePayLaterSlips.length}
          </span>
        </button>
      </div>

      {/* Metrics Row (Scoped to selected Category) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-blue-50/80 border-[#0026b3] shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-bold text-slate-500">{lang === 'th' ? 'ทั้งหมด (ในหมวดนี้)' : 'All (In Category)'}</p>
          <p className="text-xl font-black text-slate-900 mt-0.5">{categoryTotalCount}</p>
        </div>

        <div
          onClick={() => setStatusFilter('pending')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-50 border-amber-400 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-amber-800">{lang === 'th' ? 'รอตรวจสอบ' : 'Pending Review'}</p>
            {categoryPendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
          </div>
          <p className="text-xl font-black text-amber-900 mt-0.5">{categoryPendingCount}</p>
        </div>

        <div
          onClick={() => setStatusFilter('pay_later')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'pay_later'
              ? 'bg-orange-50 border-orange-400 shadow-sm ring-1 ring-orange-400/30'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-orange-800">{lang === 'th' ? 'รอชำระเงิน' : 'Pay Later'}</p>
            {categoryPayLaterCount > 0 && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
          </div>
          <p className="text-xl font-black text-orange-900 mt-0.5">{categoryPayLaterCount}</p>
        </div>

        <div
          onClick={() => setStatusFilter('approved')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'approved'
              ? 'bg-emerald-50 border-emerald-400 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-bold text-emerald-800">{lang === 'th' ? 'อนุมัติแล้ว' : 'Approved'}</p>
          <p className="text-xl font-black text-emerald-900 mt-0.5">{categoryApprovedCount}</p>
        </div>

        <div
          onClick={() => setStatusFilter('rejected')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'rejected'
              ? 'bg-rose-50 border-rose-400 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-bold text-rose-800">{lang === 'th' ? 'ปฏิเสธ / แก้ไข' : 'Rejected'}</p>
          <p className="text-xl font-black text-rose-900 mt-0.5">{categoryRejectedCount}</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === 'th'
                ? 'ค้นหาตามชื่อ, เลขสมาชิก, เลขอ้างอิง, รหัสตั๋ว, สังกัด...'
                : 'Search by name, member no, ref, ticket code, hospital...'
            }
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-[#0026b3] focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Buttons with scoped counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <span>{lang === 'th' ? 'ทั้งหมด' : 'All'}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
                statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
              }`}
            >
              {categoryTotalCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-amber-950 font-black shadow-xs'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <span>{lang === 'th' ? 'รอตรวจ' : 'Pending'}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
                statusFilter === 'pending' ? 'bg-amber-950/20 text-amber-950' : 'bg-amber-200/80 text-amber-900'
              }`}
            >
              {categoryPendingCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('pay_later')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusFilter === 'pay_later'
                ? 'bg-orange-500 text-orange-950 font-black shadow-xs'
                : 'text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-200/60'
            }`}
          >
            <span>{lang === 'th' ? 'รอชำระเงิน' : 'Pay Later'}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
                statusFilter === 'pay_later' ? 'bg-orange-950/20 text-orange-950' : 'bg-orange-200/80 text-orange-900'
              }`}
            >
              {categoryPayLaterCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white font-black shadow-xs'
                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <span>{lang === 'th' ? 'อนุมัติแล้ว' : 'Approved'}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
                statusFilter === 'approved' ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-900'
              }`}
            >
              {categoryApprovedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusFilter === 'rejected'
                ? 'bg-rose-600 text-white font-black shadow-xs'
                : 'text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <span>{lang === 'th' ? 'ปฏิเสธ' : 'Rejected'}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
                statusFilter === 'rejected' ? 'bg-white/20 text-white' : 'bg-rose-200/80 text-rose-900'
              }`}
            >
              {categoryRejectedCount}
            </span>
          </button>
        </div>
      </div>

      {/* Slip Cards List */}
      <div className="space-y-3">
        {filteredSlips.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300 space-y-2">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              {lang === 'th' ? 'ไม่พบข้อมูลสลิปตามเงื่อนไข' : 'No slip records found'}
            </p>
            <p className="text-xs text-slate-400">
              {lang === 'th' ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ' : 'Try adjusting your search query or filter'}
            </p>
          </div>
        ) : (
          paginatedSlips.map((slip) => (
            <div
              key={slip.id}
              onClick={() => setSelectedSlip(slip)}
              className="bg-white hover:bg-slate-50/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="flex items-start gap-3.5 min-w-0">
                {/* Slip Thumbnail Preview & Status Overlay */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSlip(slip);
                  }}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 cursor-pointer hover:border-[#0026b3] transition shadow-2xs relative group"
                  title="คลิกเพื่อดูรูปสลิปขนาดใหญ่"
                >
                  {slip.slipUrl && slip.slipUrl !== 'PAY_LATER' && slip.slipUrl !== 'pay_later_pending' && slip.slipUrl !== '/placeholder-slip.png' ? (
                    <img
                      src={slip.slipUrl}
                      alt="Slip Thumbnail"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : slip.slipUrl === 'PAY_LATER' || slip.slipUrl === 'pay_later_pending' ? (
                    <div className="flex flex-col items-center justify-center p-1 text-center bg-amber-50 text-amber-700 w-full h-full">
                      <Clock className="w-4 h-4 text-amber-500 mb-0.5" />
                      <span className="text-[8px] font-bold leading-tight">ชำระภายหลัง</span>
                    </div>
                  ) : (
                    <Receipt className="w-5 h-5 text-slate-400" />
                  )}
                  {/* Small corner status badge */}
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-tl-lg flex items-center justify-center ${
                      slip.status === 'approved'
                        ? 'bg-emerald-500 text-white'
                        : slip.status === 'pending'
                        ? 'bg-amber-500 text-white'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    {slip.status === 'approved' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    {slip.status === 'pending' && <Clock className="w-2.5 h-2.5" />}
                    {slip.status === 'rejected' && <X className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                </div>

                {/* Main Information */}
                <div className="space-y-1.5 min-w-0">
                  {/* Row 1: Name & Ticket Code */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                      {slip.isGroupMembership || slip.isGroupConference || slip.groupPayload || slip.ticketCode?.startsWith('MEMGRP') || slip.ticketCode?.startsWith('GRP-')
                        ? (slip.companyName || (lang === 'th' ? slip.nameTh : slip.nameEn || slip.nameTh))
                        : (lang === 'th' ? slip.nameTh : slip.nameEn || slip.nameTh)}
                    </h3>

                    <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-mono tracking-wide">
                      {slip.ticketCode}
                    </span>
                  </div>

                  {/* Row 2: Status & Essential Badges directly UNDER the name */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {/* Primary Approval / Payment Status */}
                    {(() => {
                      const isPayLater = slip.bank?.includes('ชำระเงินภายหลัง') || slip.bank?.toLowerCase().includes('pay later') || slip.slipUrl === 'PAY_LATER' || slip.slipUrl === '/placeholder-slip.png' || !slip.slipUrl;
                      return (
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            slip.status === 'approved'
                              ? isPayLater
                                ? 'bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                              : slip.status === 'pending'
                              ? isPayLater
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                                : 'bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs'
                              : 'bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs'
                          }`}
                        >
                          {slip.status === 'approved' && (
                            isPayLater
                              ? (lang === 'th' ? '✓ อนุมัติสิทธิ์แล้ว (รอชำระเงิน)' : '✓ Access Approved (Awaiting Payment)')
                              : (lang === 'th' ? '✓ อนุมัติแล้ว' : '✓ Approved')
                          )}
                          {slip.status === 'pending' && (
                            isPayLater
                              ? (lang === 'th' ? '⏳ รออนุมัติสิทธิ์' : '⏳ Awaiting Approval')
                              : (lang === 'th' ? '⏳ รอตรวจสอบ' : '⏳ Pending')
                          )}
                          {slip.status === 'rejected' && (lang === 'th' ? '✕ ปฏิเสธ' : '✕ Rejected')}
                        </span>
                      );
                    })()}

                    {/* Essential Participant Role Badge (แสดงเฉพาะสถานะสำคัญ) */}
                    {slip.isMembershipRegistration ? (
                      <span className="text-[10px] font-black bg-purple-50 text-purple-800 px-2 py-0.5 rounded-md border border-purple-200 flex items-center gap-1 shadow-2xs">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span>{lang === 'th' ? 'คำขอสมัครสมาชิกใหม่' : 'New Member'}</span>
                      </span>
                    ) : (slip.isGroupConference || slip.ticketCode?.startsWith('GRP-') || (slip.groupPayload?.attendees && slip.groupPayload.attendees.length > 0)) ? (
                      (() => {
                        const attendees = slip.groupPayload?.attendees;
                        const isMemberGroup = Boolean(
                          slip.isMember ||
                          (Array.isArray(attendees) && attendees.some((a: any) => a.isMember || a.memberNo))
                        );
                        const count = attendees?.length || 1;
                        return (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-2xs ${
                            isMemberGroup
                              ? 'bg-blue-50 text-[#0026b3] border-blue-200'
                              : 'bg-sky-50 text-sky-800 border-sky-200'
                          }`}>
                            <Building2 className={`w-3 h-3 ${isMemberGroup ? 'text-[#0026b3]' : 'text-sky-600'}`} />
                            <span>
                              {lang === 'th'
                                ? (isMemberGroup ? `กลุ่มสมาชิก (${count} ท่าน)` : `กลุ่ม (${count} ท่าน)`)
                                : (isMemberGroup ? `Member Group (${count})` : `Group (${count})`)}
                            </span>
                          </span>
                        );
                      })()
                    ) : (slip.isGroupMembership || slip.ticketCode?.startsWith('MEMGRP') || (slip.groupPayload?.applicants && slip.groupPayload.applicants.length > 0)) ? (
                      <span className="text-[10px] font-black bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1 shadow-2xs">
                        <Building2 className="w-3 h-3 text-indigo-600" />
                        <span>{lang === 'th' ? `กลุ่มสมาชิก (${slip.groupPayload?.applicants?.length || 1} ท่าน)` : `Group Mem (${slip.groupPayload?.applicants?.length || 1})`}</span>
                      </span>
                    ) : slip.isMember ? (
                      <span className="text-[10px] font-black bg-blue-50 text-[#0026b3] px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1 shadow-2xs">
                        <UserCheck className="w-3 h-3" />
                        <span>Member #{slip.memberNo}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                        Non-Member
                      </span>
                    )}

                    {/* Applied Coupon Badge (ข้อ 4) */}
                    {(slip.couponCode || slip.couponInfo?.code) && (
                      <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1 shadow-2xs">
                        <span>🎟️ คูปอง: {slip.couponCode || slip.couponInfo?.code}</span>
                        {slip.discountTotal && slip.discountTotal > 0 ? (
                          <span className="text-emerald-700 font-black font-mono">
                            (-฿{slip.discountTotal.toLocaleString()})
                          </span>
                        ) : null}
                      </span>
                    )}
                  </div>

                  {/* Row 3: Meta Info (ธนาคาร, ชื่องานประชุม, หน่วยงานบุคคล) */}
                  <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap pt-0.5">
                    {/* ไม่แสดง workplace ส่วนบุคคลมาปนกับบริษัท (ข้อ 2) */}
                    {slip.workplace && !slip.isGroupMembership && !slip.isGroupConference && !slip.ticketCode?.startsWith('GRP-') && !slip.ticketCode?.startsWith('MEMGRP') && slip.workplace !== slip.nameTh && (
                      <>
                        <span className="flex items-center gap-1 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {slip.workplace}
                        </span>
                        <span className="text-slate-300">•</span>
                      </>
                    )}
                    <span className="flex items-center gap-1 font-medium">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      {slip.bank}
                    </span>
                    {slip.meetingName && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-blue-700 font-medium">{slip.meetingName}</span>
                      </>
                    )}
                  </div>

                  {/* Registered Courses / Activities Badges */}
                  {(() => {
                    const acts = parseSlipActivities(slip.selectedActivities, slip.amount);
                    if (acts.length > 0) {
                      return (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {acts.map((act, i) => {
                            const rawPrice = act.price !== undefined ? Number(act.price) : 0;
                            const effectivePrice = rawPrice > 0 ? rawPrice : Number(slip.amount || 0);

                            return (
                              <span
                                key={act.id || i}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-2xs ${
                                  act.type === 'format_change' || slip.isFormatChange
                                    ? 'bg-amber-50 text-amber-950 border border-amber-300 ring-1 ring-amber-400/30'
                                    : act.type === 'membership_registration' || act.type === 'membership_group_registration'
                                    ? 'bg-purple-50 text-purple-900 border border-purple-200'
                                    : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                                }`}
                              >
                                <BookOpen className={`w-3 h-3 shrink-0 ${
                                  act.type === 'format_change' || slip.isFormatChange
                                    ? 'text-amber-600'
                                    : act.type === 'membership_registration' || act.type === 'membership_group_registration'
                                    ? 'text-purple-600'
                                    : 'text-indigo-600'
                                }`} />
                                <span>{act.name}</span>
                                {effectivePrice > 0 ? (
                                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border font-mono ${
                                    act.type === 'format_change' || slip.isFormatChange
                                      ? 'text-amber-800 bg-white border-amber-200'
                                      : act.type === 'membership_registration' || act.type === 'membership_group_registration'
                                      ? 'text-purple-700 bg-white border-purple-100'
                                      : 'text-indigo-700 bg-white border-indigo-100'
                                  }`}>
                                    ฿{effectivePrice.toLocaleString()}
                                  </span>
                                ) : act.price !== undefined ? (
                                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border font-mono ${
                                    act.type === 'format_change' || slip.isFormatChange
                                      ? 'text-amber-800 bg-white border-amber-200'
                                      : act.type === 'membership_registration' || act.type === 'membership_group_registration'
                                      ? 'text-purple-700 bg-white border-purple-100'
                                      : 'text-indigo-700 bg-white border-indigo-100'
                                  }`}>
                                    ฿{Number(act.price).toLocaleString()}
                                  </span>
                                ) : null}
                              </span>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <p className="text-[11px] text-slate-400 font-normal">
                    {lang === 'th' ? 'วันที่โอน' : 'Transfer'}: {slip.transferDate || '-'} {slip.transferTime || ''} |
                    Ref: {slip.refNo}
                  </p>
                </div>
              </div>

              {/* Right Side: Amount & Action Buttons */}
              <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="text-left md:text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    {lang === 'th' ? 'ยอดเงินที่ชำระ' : 'Amount'}
                  </p>
                  <p className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    ฿{slip.amount.toLocaleString()} <span className="text-xs font-normal text-slate-500">THB</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {slip.isGroupMembership || slip.isGroupConference || slip.groupPayload?.attendees || slip.groupPayload?.applicants || slip.ticketCode?.startsWith('MEMGRP') || slip.ticketCode?.startsWith('GRP-') ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSlip(slip);
                      }}
                      className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                      title={lang === 'th' ? 'ดูรายชื่อผู้ลงทะเบียนในกลุ่ม' : 'View Group List'}
                    >
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>
                        {lang === 'th'
                          ? `ดูรายชื่อ (${slip.groupPayload?.attendees?.length || slip.groupPayload?.applicants?.length || 1} ท่าน)`
                          : `View List (${slip.groupPayload?.attendees?.length || slip.groupPayload?.applicants?.length || 1})`}
                      </span>
                    </button>
                  ) : !(slip.bank?.includes('ชำระเงินภายหลัง') || slip.bank?.toLowerCase().includes('pay later') || !slip.slipUrl || slip.slipUrl === '/placeholder-slip.png' || slip.slipUrl === 'PAY_LATER') ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSlip(slip);
                      }}
                      className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title={lang === 'th' ? 'ดูหลักฐานสลิป' : 'View Slip'}
                    >
                      <Eye className="w-4 h-4 text-[#0026b3]" />
                      <span className="hidden sm:inline">{lang === 'th' ? 'ดูสลิป' : 'View'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSlip(slip);
                      }}
                      className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title={lang === 'th' ? 'ดูรายละเอียด' : 'View Details'}
                    >
                      <Eye className="w-4 h-4 text-slate-600" />
                      <span className="hidden sm:inline">{lang === 'th' ? 'ดูรายละเอียด' : 'Details'}</span>
                    </button>
                  )}

                  {slip.status === 'pending' && (
                    <>
                      <button
                        onClick={(e) => handleApprove(slip.id, e)}
                        disabled={isProcessing}
                        className={`px-3 py-2 text-[#061d08] rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                          processingSlipId === slip.id
                            ? 'bg-emerald-300 opacity-90 cursor-wait'
                            : 'bg-[#4ade80] hover:bg-[#3ec424]'
                        }`}
                        title={lang === 'th' ? 'อนุมัติ' : 'Approve'}
                      >
                        {processingSlipId === slip.id ? (
                          <>
                            <RotateCw className="w-4 h-4 animate-spin text-[#061d08]" />
                            <span>{lang === 'th' ? 'กำลังอนุมัติ...' : 'Approving...'}</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>{lang === 'th' ? 'อนุมัติ' : 'Approve'}</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={(e) => openRejectModal(slip.id, e)}
                        disabled={isProcessing}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                        title={lang === 'th' ? 'ปฏิเสธ' : 'Reject'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={currentPage}
        totalItems={filteredSlips.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        itemLabel={lang === 'th' ? 'สลิป' : 'slips'}
      />

      {/* High Resolution Slip Preview & Action Modal */}
      {mounted &&
        selectedSlip &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md sm:max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3]">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                      {selectedSlip.isMembershipRegistration
                        ? (lang === 'th' ? 'คำขอสมัครสมาชิกสมาคม & สลิปโอนเงิน' : 'Membership Application & Slip')
                        : (selectedSlip.isGroupConference || selectedSlip.groupPayload?.attendees || selectedSlip.ticketCode?.startsWith('GRP-'))
                        ? (lang === 'th' ? 'คำขอลงทะเบียนประชุมแบบกลุ่ม & สลิปโอนเงิน' : 'Group Conference Registration & Slip')
                        : (selectedSlip.isGroupMembership || selectedSlip.groupPayload?.applicants || selectedSlip.ticketCode?.startsWith('MEMGRP'))
                        ? (lang === 'th' ? 'คำขอสมัครสมาชิกแบบกลุ่ม & สลิปโอนเงิน' : 'Group Membership Application & Slip')
                        : (lang === 'th' ? 'รายละเอียดสลิปโอนเงิน' : 'Slip Details')}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">Ref: {selectedSlip.refNo}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSlip(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 space-y-3.5">
                {/* Slip Viewport - Compact Display */}
                {selectedSlip.slipUrl && selectedSlip.slipUrl !== 'PAY_LATER' && selectedSlip.slipUrl !== 'pay_later_pending' && selectedSlip.slipUrl !== '/placeholder-slip.png' ? (
                  <div className="bg-slate-950 rounded-2xl p-2.5 flex flex-col items-center justify-center border border-slate-800/80">
                    <img
                      src={selectedSlip.slipUrl}
                      alt="Bank Slip"
                      className="max-h-56 sm:max-h-64 w-auto object-contain rounded-lg shadow-md"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <a
                        href={selectedSlip.slipUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition flex items-center gap-1 backdrop-blur-md cursor-pointer border border-white/15 active:scale-95"
                      >
                        <ExternalLink className="w-3 h-3 text-[#4ade80]" />
                        <span>เปิดดูภาพขนาดเต็ม</span>
                      </a>
                    </div>
                  </div>
                ) : selectedSlip.slipUrl === 'PAY_LATER' || selectedSlip.slipUrl === 'pay_later_pending' ? (
                  <div className="bg-amber-950/60 rounded-2xl p-4 flex flex-col items-center justify-center text-center text-amber-200 space-y-2 border border-amber-600/40">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                      <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                        PAY LATER / ชำระเงินภายหลัง
                      </span>
                      <p className="text-sm font-bold text-amber-100 mt-1">
                        ผู้สมัครเลือกชำระเงินภายหลัง (ยังไม่มีไฟล์สลิป)
                      </p>
                      <p className="text-xs text-amber-300/80 mt-0.5">
                        ยอดที่ต้องชำระ: ฿{selectedSlip.amount.toLocaleString()} THB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 rounded-2xl p-4 flex flex-col items-center justify-center text-center text-white space-y-2 relative overflow-hidden border border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                      <Receipt className="w-5 h-5 text-[#4ade80]" />
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-[#4ade80] tracking-wider block">
                        BANK TRANSFER SLIP PROOF
                      </span>
                      <p className="text-xl font-black text-white mt-0.5">
                        ฿{selectedSlip.amount.toLocaleString()} THB
                      </p>
                      <p className="text-[11px] text-slate-300">{selectedSlip.bank}</p>
                    </div>
                  </div>
                )}

                {/* Membership Applicant Detailed Profile (If Membership Application) */}
                {selectedSlip.isMembershipRegistration && selectedSlip.memberPayload ? (
                  <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
                      <div className="flex items-center gap-2 text-purple-900 font-extrabold text-xs sm:text-sm">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span>ข้อมูลผู้สมัครสมาชิกใหม่</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setViewingApplicant({
                            ...selectedSlip.memberPayload,
                            submittedAt:
                              selectedSlip.memberPayload.submittedAt ||
                              selectedSlip.memberPayload.submitted_at ||
                              selectedSlip.createdAt ||
                              (selectedSlip.transferDate ? `${selectedSlip.transferDate}T${selectedSlip.transferTime || '00:00:00'}` : undefined) ||
                              new Date().toISOString(),
                            workplace: selectedSlip.memberPayload.workplace || selectedSlip.companyName || selectedSlip.workplace,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-purple-100 text-purple-700 hover:text-purple-900 font-bold text-xs border border-purple-200 shadow-2xs transition active:scale-95 cursor-pointer shrink-0"
                        title="ดูข้อมูลทั้งหมดที่กรอกมา"
                      >
                        <Eye className="w-3.5 h-3.5 text-purple-600" />
                        <span>{lang === 'th' ? 'ดูทั้งหมด' : 'View All'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-xs bg-white p-3 rounded-xl border border-purple-100/90 shadow-2xs">
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-900 text-sm truncate">
                          {selectedSlip.memberPayload.full_name_th || selectedSlip.memberPayload.fullNameTh}
                        </p>
                        {(selectedSlip.memberPayload.full_name_en || selectedSlip.memberPayload.fullNameEn) && (
                          <p className="text-slate-500 font-normal truncate">
                            ({selectedSlip.memberPayload.full_name_en || selectedSlip.memberPayload.fullNameEn})
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] text-purple-700 font-mono font-bold shrink-0">
                        {selectedSlip.memberPayload.email || '-'}
                      </span>
                    </div>

                    {selectedSlip.status === 'pending' && (
                      <p className="text-[11px] text-purple-700 bg-purple-100/70 p-2.5 rounded-xl font-medium leading-relaxed">
                        ✨ เมื่อกด <strong>&ldquo;อนุมัติ&rdquo;</strong> ระบบจะทำการบันทึกข้อมูลสมาชิกนี้ลงฐานข้อมูล members พร้อมออกเลขที่สมาชิกอัตโนมัติ และส่งอีเมลแจ้งผล
                      </p>
                    )}
                  </div>
                ) : null}

                {/* Corporate / Group Membership Detailed List (If Corporate Group Application) */}
                {(selectedSlip.isGroupMembership || selectedSlip.groupPayload) && selectedSlip.groupPayload?.applicants && (
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2">
                      <div className="flex items-center gap-2 text-indigo-950 font-extrabold text-xs sm:text-sm">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span>รายชื่อผู้สมัครสมาชิกในกลุ่ม ({selectedSlip.groupPayload.applicants.length} ท่าน)</span>
                      </div>
                      {selectedSlip.companyName && (
                        <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                          {selectedSlip.companyName}
                        </span>
                      )}
                    </div>

                    {selectedSlip.groupPayload.groupContact && (
                      <div className="text-[11px] text-slate-600 bg-white/90 p-2.5 rounded-xl border border-indigo-100 flex flex-wrap gap-x-4 gap-y-1">
                        <span><strong>ผู้ประสานงาน:</strong> {selectedSlip.groupPayload.groupContact.coordinatorName || '-'}</span>
                        <span><strong>อีเมล:</strong> {selectedSlip.groupPayload.groupContact.coordinatorEmail || '-'}</span>
                        <span><strong>เบอร์โทร:</strong> {selectedSlip.groupPayload.groupContact.coordinatorPhone || '-'}</span>
                      </div>
                    )}

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {selectedSlip.groupPayload.applicants.map((app: any, idx: number) => (
                        <div
                          key={idx}
                          className="bg-white border border-indigo-100/90 rounded-2xl p-3 text-xs text-slate-800 shadow-2xs hover:border-indigo-300 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
                        >
                          <div className="min-w-0 flex-1 w-full space-y-0.5">
                            <div className="flex items-center gap-2 font-bold text-slate-900 flex-wrap">
                              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black shrink-0">
                                {idx + 1}
                              </span>
                              <span className="truncate">{app.full_name_th || app.full_name_en}</span>
                              {app.full_name_en && app.full_name_th && (
                                <span className="text-slate-400 font-normal truncate">({app.full_name_en})</span>
                              )}
                            </div>
                            <div className="pl-6 sm:pl-7 flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] text-indigo-600 font-mono break-all">
                                {app.email || app.mobile || '-'}
                              </span>
                              {Boolean(
                                (selectedSlip.groupPayload?.groupContact?.coordinatorEmail &&
                                  app.email?.trim().toLowerCase() === selectedSlip.groupPayload.groupContact.coordinatorEmail.trim().toLowerCase()) ||
                                (selectedSlip.email &&
                                  app.email?.trim().toLowerCase() === selectedSlip.email.trim().toLowerCase())
                              ) && (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded shadow-2xs whitespace-nowrap">
                                  ⚠️ ใช้อีเมลเดียวกับบริษัท
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setViewingApplicant({
                                ...app,
                                submittedAt:
                                  app.submittedAt ||
                                  app.submitted_at ||
                                  selectedSlip.groupPayload?.submittedAt ||
                                  selectedSlip.createdAt ||
                                  (selectedSlip.transferDate ? `${selectedSlip.transferDate}T${selectedSlip.transferTime || '00:00:00'}` : undefined) ||
                                  new Date().toISOString(),
                                workplace: app.workplace || selectedSlip.companyName || selectedSlip.workplace,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200 font-bold text-[11px] sm:text-xs shadow-2xs transition active:scale-95 cursor-pointer shrink-0 self-end sm:self-auto whitespace-nowrap"
                            title="ดูข้อมูลทั้งหมดที่กรอกมา"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{lang === 'th' ? 'ดูทั้งหมด' : 'View All'}</span>
                          </button>
                        </div>
                      ))}
                    </div>

                    {selectedSlip.status === 'pending' && isPayLaterSlip(selectedSlip) && (
                      <p className="text-[11px] text-indigo-900 bg-indigo-100/80 p-3 rounded-xl font-medium leading-relaxed border border-indigo-200">
                        🏢 เมื่อกด <strong>&ldquo;อนุมัติ&rdquo;</strong> ระบบจะทำการอนุมัติและสร้างบัญชีสมาชิกให้กับผู้สมัครทุกคนในกลุ่ม พร้อมออกเลขที่สมาชิกอัตโนมัติ โดยสถานะการชำระเงินจะยังคงเป็น <strong>&ldquo;รอชำระเงิน / รอแนบสลิป&rdquo;</strong> เพื่อให้บริษัทแนบสลิปเข้ามาในภายหลัง
                      </p>
                    )}
                  </div>
                )}

                {/* Corporate / Group Conference Attendees Detailed List (If Corporate Group Conference Application) */}
                {(selectedSlip.isGroupConference || selectedSlip.groupPayload?.attendees || selectedSlip.ticketCode?.startsWith('GRP-')) &&
                  selectedSlip.groupPayload?.attendees &&
                  Array.isArray(selectedSlip.groupPayload.attendees) && (
                    <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-sky-200/80 pb-2">
                        <div className="flex items-center gap-2 text-sky-950 font-extrabold text-xs sm:text-sm">
                          <Users className="w-4 h-4 text-[#0026b3]" />
                          <span>
                            {lang === 'th'
                              ? `รายชื่อผู้ลงทะเบียนเข้าร่วมประชุมในกลุ่ม (${selectedSlip.groupPayload.attendees.length} ท่าน)`
                              : `Group Conference Attendees (${selectedSlip.groupPayload.attendees.length})`}
                          </span>
                        </div>
                        {(selectedSlip.companyName || selectedSlip.groupPayload.companyName) && (
                          <span className="text-[11px] font-bold text-[#0026b3] bg-white px-2 py-0.5 rounded-md border border-sky-200 shadow-2xs">
                            {selectedSlip.companyName || selectedSlip.groupPayload.companyName}
                          </span>
                        )}
                      </div>

                      {selectedSlip.groupPayload.groupContact && (
                        <div className="text-[11px] text-slate-600 bg-white/90 p-2.5 rounded-xl border border-sky-100 flex flex-wrap gap-x-4 gap-y-1">
                          <span><strong>{lang === 'th' ? 'ผู้ประสานงาน:' : 'Coordinator:'}</strong> {selectedSlip.groupPayload.groupContact.coordinatorName || '-'}</span>
                          <span><strong>{lang === 'th' ? 'อีเมล:' : 'Email:'}</strong> {selectedSlip.groupPayload.groupContact.coordinatorEmail || '-'}</span>
                          <span><strong>{lang === 'th' ? 'เบอร์โทร:' : 'Phone:'}</strong> {selectedSlip.groupPayload.groupContact.coordinatorPhone || '-'}</span>
                        </div>
                      )}

                      {(() => {
                        const totalAttendees = selectedSlip.groupPayload.attendees;
                        const displayedAttendees = showAllGroupAttendees ? totalAttendees : totalAttendees.slice(0, 2);
                        return (
                          <>
                            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                              {displayedAttendees.map((att: any, idx: number) => {
                                const attName = att.nameTh || att.nameEn || `ผู้เข้าร่วมคนที่ ${idx + 1}`;
                                const isAttMember = Boolean(att.isMember || att.memberNo);
                                const attActivities = getAttendeeActivities(att);

                                // Check coupon discount for this attendee (ข้อ 3 & 4)
                                const attUsage = selectedSlip.couponUsages?.find(
                                  (cu) => (att.memberNo && cu.memberNo === att.memberNo) ||
                                          (att.email && cu.attendeeEmail?.toLowerCase() === att.email.toLowerCase()) ||
                                          (att.nameTh && cu.attendeeName === att.nameTh)
                                );

                                const isCouponActive = Boolean(selectedSlip.couponCode || selectedSlip.couponInfo?.code);
                                const isFreeCoupon = selectedSlip.couponInfo?.discountType === 'free';
                                const hasMainProgram = attActivities.some(a => 
                                  a.name.toLowerCase().includes('main') || 
                                  a.name.includes('การประชุมหลัก') || 
                                  a.name.includes('Main Program')
                                );

                                const attDiscount = attUsage?.discountApplied 
                                  ? Number(attUsage.discountApplied) 
                                  : (Number(att.discountTotal) || Number(att.discountAmount) || (isFreeCoupon && hasMainProgram ? 4000 : 0));

                                const hasDiscount = attDiscount > 0 || (isFreeCoupon && hasMainProgram) || Boolean(att.discountAppliedNotice);
                                const originalPrice = Number(att.originalTotal || att.subtotal || att.price || 0);
                                const netPrice = hasDiscount && originalPrice > 0 ? Math.max(0, originalPrice - attDiscount) : (att.subtotal || att.price || 0);

                                return (
                                  <div
                                    key={idx}
                                    className={`bg-white border rounded-2xl p-3 sm:p-3.5 text-xs text-slate-800 shadow-2xs transition flex flex-col sm:flex-row items-start justify-between gap-3 ${
                                      hasDiscount ? 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/20' : 'border-sky-100 hover:border-sky-300'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1 w-full space-y-1.5">
                                      {/* Row 1: Number + Thai Name + Member Badge + Mobile Action */}
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 font-bold text-slate-900 flex-wrap min-w-0">
                                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                            hasDiscount ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-[#0026b3]'
                                          }`}>
                                            {idx + 1}
                                          </span>
                                          <span className="text-sm font-extrabold text-slate-900 truncate">{attName}</span>

                                          {/* Member Badge Beside Thai Name */}
                                          {isAttMember ? (
                                            <span className="text-[10px] font-bold bg-blue-50 text-[#0026b3] border border-blue-200 px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap">
                                              {att.memberNo ? `สมาชิก (#${att.memberNo})` : 'สมาชิกสมาคม'}
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap">
                                              บุคคลทั่วไป
                                            </span>
                                          )}

                                          {(att.selectedFormat || att.format || att.selectedPackage) && (
                                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs whitespace-nowrap">
                                              {att.selectedFormat || att.format || att.selectedPackage}
                                            </span>
                                          )}
                                        </div>

                                        {/* View All Button on Top Right (Always accessible) */}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setViewingAttendee({
                                              ...att,
                                              meetingName: selectedSlip.meetingName,
                                              companyName: selectedSlip.companyName || selectedSlip.groupPayload.companyName,
                                              ticketCode: selectedSlip.ticketCode,
                                              submittedAt: selectedSlip.createdAt,
                                            })
                                          }
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-[11px] sm:text-xs shadow-2xs transition active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
                                          title="ดูรายละเอียดข้อมูลผู้ลงทะเบียน"
                                        >
                                          <Eye className="w-3.5 h-3.5 text-[#0026b3]" />
                                          <span>{lang === 'th' ? 'ดูทั้งหมด' : 'View'}</span>
                                        </button>
                                      </div>

                                      {/* Row 2: English Name Below Thai Name */}
                                      {att.nameEn && att.nameTh && (
                                        <div className="pl-6 sm:pl-7 -mt-1">
                                          <span className="text-xs text-slate-500 font-medium">({att.nameEn})</span>
                                        </div>
                                      )}

                                      {/* Row 3: Contact & Price (Responsive Row) */}
                                      <div className="pl-6 sm:pl-7 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                                          <span className="text-sky-700 font-mono font-medium break-all">
                                            {att.email || att.mobile || '-'}
                                          </span>
                                          {att.workplace && att.workplace !== selectedSlip.companyName && (
                                            <span className="truncate max-w-[200px]">🏢 {att.workplace}</span>
                                          )}
                                          {att.dietaryPreference && (
                                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 whitespace-nowrap">
                                              🍽️ {att.dietaryPreference}
                                            </span>
                                          )}
                                        </div>

                                        {originalPrice > 0 ? (
                                          <div className="flex items-center gap-1.5 font-mono text-xs shrink-0">
                                            {hasDiscount && attDiscount > 0 ? (
                                              <>
                                                <span className="line-through text-slate-400 text-[11px]">
                                                  ฿{originalPrice.toLocaleString()}
                                                </span>
                                                <span className="font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                  ฿{Number(netPrice).toLocaleString()}
                                                </span>
                                              </>
                                            ) : (
                                              <span className="font-bold text-slate-800">
                                                ฿{originalPrice.toLocaleString()}
                                              </span>
                                            )}
                                          </div>
                                        ) : null}
                                      </div>

                                      {/* Row 4: Individual Activities / Programs with Discounted Prices directly (ข้อ 3) */}
                                      {attActivities.length > 0 && (
                                        <div className="pl-6 sm:pl-7 pt-1.5 space-y-1">
                                          <span className="text-[10px] text-slate-400 font-bold block">
                                            {lang === 'th' ? 'หลักสูตร / กิจกรรมที่ลงทะเบียน:' : 'Registered Courses & Activities:'}
                                          </span>
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            {attActivities.map((act, actIdx) => {
                                              const isMainProgram = act.name.toLowerCase().includes('main') || 
                                                act.name.includes('การประชุมหลัก') || 
                                                act.name.includes('Main Program');
                                              const isActDiscounted = hasDiscount && isMainProgram && (isFreeCoupon || attDiscount >= (act.price || 4000));
                                              const rawActPrice = Number(act.price) || (isMainProgram ? 4000 : 0);
                                              const discountedActPrice = isActDiscounted ? Math.max(0, rawActPrice - attDiscount) : rawActPrice;

                                              return (
                                                <span
                                                  key={actIdx}
                                                  className={`text-[10px] font-bold border px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs ${
                                                    isActDiscounted
                                                      ? 'bg-emerald-50 text-emerald-950 border-emerald-300 ring-1 ring-emerald-400/20'
                                                      : 'bg-sky-50 text-[#0026b3] border-sky-200'
                                                  }`}
                                                >
                                                  <BookOpen className={`w-3 h-3 shrink-0 ${isActDiscounted ? 'text-emerald-600' : 'text-[#0026b3]'}`} />
                                                  <span className="truncate max-w-[200px]">{act.name}</span>
                                                  {isActDiscounted ? (
                                                    <span className="font-mono font-extrabold flex items-center gap-1 shrink-0 whitespace-nowrap">
                                                      {rawActPrice > 0 && (
                                                        <span className="line-through text-slate-400 font-normal">
                                                          ฿{rawActPrice.toLocaleString()}
                                                        </span>
                                                      )}
                                                      <span className="text-emerald-700 font-black">
                                                        {discountedActPrice === 0 ? '฿0' : `฿${discountedActPrice.toLocaleString()}`}
                                                      </span>
                                                    </span>
                                                  ) : rawActPrice > 0 ? (
                                                    <span className="font-mono text-sky-800 font-black shrink-0 whitespace-nowrap">
                                                      (฿{rawActPrice.toLocaleString()})
                                                    </span>
                                                  ) : null}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Show More / Show Less Toggle (Starts at 2) */}
                            {totalAttendees.length > 2 && (
                              <div className="pt-1.5 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => setShowAllGroupAttendees((prev) => !prev)}
                                  className="px-4 py-1.5 rounded-xl bg-white hover:bg-sky-100/70 text-[#0026b3] border border-sky-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                                >
                                  {showAllGroupAttendees ? (
                                    <>
                                      <ChevronUp className="w-3.5 h-3.5 text-[#0026b3]" />
                                      <span>{lang === 'th' ? 'ย่อรายชื่อ (แสดง 2 ท่าน)' : 'Show Less (2 Attendees)'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3.5 h-3.5 text-[#0026b3]" />
                                      <span>
                                        {lang === 'th'
                                          ? `แสดงทั้งหมด (${totalAttendees.length} ท่าน)`
                                          : `Show All (${totalAttendees.length} Attendees)`}
                                      </span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {selectedSlip.status === 'pending' && isPayLaterSlip(selectedSlip) && (
                        <p className="text-[11px] text-sky-950 bg-sky-100/80 p-3 rounded-xl font-medium leading-relaxed border border-sky-200">
                          🏢 เมื่อกด <strong>&ldquo;อนุมัติ&rdquo;</strong> ระบบจะทำการอนุมัติสิทธิ์การเข้าร่วมประชุมให้กับผู้ลงทะเบียนทุกคนในกลุ่ม
                        </p>
                      )}
                    </div>
                  )}

                {/* Participant & Ticket Info */}
                <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 space-y-3 border border-slate-200 text-sm">
                  {/* ชื่อบริษัท / หน่วยงาน หรือชื่อผู้เข้าร่วม */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                    <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                      {selectedSlip.isGroupMembership || selectedSlip.isGroupConference || selectedSlip.groupPayload?.attendees || selectedSlip.groupPayload?.applicants || selectedSlip.ticketCode?.startsWith('MEMGRP') || selectedSlip.ticketCode?.startsWith('GRP-')
                        ? (lang === 'th' ? 'ชื่อบริษัท / หน่วยงาน' : 'Company / Organization')
                        : (lang === 'th' ? 'ชื่อผู้เข้าร่วม' : 'Attendee Name')}
                    </span>
                    <span className="font-black text-sm sm:text-base text-slate-900 text-right">
                      {selectedSlip.companyName || selectedSlip.nameTh}
                    </span>
                  </div>

                  {/* สถานะผู้สมัคร */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                    <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                      {lang === 'th' ? 'สถานะผู้สมัคร' : 'Status'}
                    </span>
                    <span
                      className={`font-black text-xs sm:text-sm text-right ${
                        selectedSlip.isGroupConference || selectedSlip.ticketCode?.startsWith('GRP-')
                          ? 'text-[#0026b3]'
                          : selectedSlip.isGroupMembership || selectedSlip.groupPayload?.applicants
                          ? 'text-indigo-800'
                          : selectedSlip.isMember
                          ? 'text-[#0026b3]'
                          : selectedSlip.isMembershipRegistration
                          ? 'text-purple-700'
                          : 'text-amber-800'
                      }`}
                    >
                      {(() => {
                        const attendees = selectedSlip.groupPayload?.attendees;
                        const isMemberGroup = Boolean(
                          selectedSlip.isMember ||
                          (Array.isArray(attendees) && attendees.some((a: any) => a.isMember || a.memberNo))
                        );
                        const count = attendees?.length || 1;
                        if (selectedSlip.isGroupConference || (attendees && attendees.length > 0) || selectedSlip.ticketCode?.startsWith('GRP-')) {
                          return lang === 'th'
                            ? (isMemberGroup ? `ลงทะเบียนประชุมแบบกลุ่ม - สมาชิกสมาคม (${count} ท่าน)` : `ลงทะเบียนประชุมแบบกลุ่ม (${count} ท่าน)`)
                            : (isMemberGroup ? `Corporate Member Group (${count} Attendees)` : `Group Conference (${count} Attendees)`);
                        }
                        if (selectedSlip.isGroupMembership || selectedSlip.groupPayload?.applicants) {
                          return lang === 'th'
                            ? `สมัครสมาชิกสมาคมแบบกลุ่ม (${selectedSlip.groupPayload?.applicants?.length || ''} ท่าน)`
                            : `Group Membership (${selectedSlip.groupPayload?.applicants?.length || ''})`;
                        }
                        if (selectedSlip.isMember) {
                          return `สมาชิกสมาคม (#${selectedSlip.memberNo})`;
                        }
                        if (selectedSlip.isMembershipRegistration) {
                          return lang === 'th' ? 'คำขอสมัครสมาชิกใหม่ (รออนุมัติ)' : 'New Member Applicant (Pending)';
                        }
                        return lang === 'th' ? 'บุคคลทั่วไป' : 'Non-Member';
                      })()}
                    </span>
                  </div>

                  {/* รหัสตั๋ว / คำขอ */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                    <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                      {lang === 'th' ? 'รหัสตั๋ว / คำขอ' : 'Ticket / Request ID'}
                    </span>
                    <span className="font-black font-mono text-sm sm:text-base text-slate-900 tracking-wide text-right">
                      {selectedSlip.ticketCode}
                    </span>
                  </div>

                  {/* หน่วยงาน (แสดงเฉพาะกรณีบุคคลทั่วไป หรือสมาชิกรายบุคคล ไม่แสดงซ้ำในกรณีบริษัท - ข้อ 2) */}
                  {!selectedSlip.isGroupMembership && !selectedSlip.isGroupConference && !selectedSlip.groupPayload?.attendees && !selectedSlip.groupPayload?.applicants && !selectedSlip.ticketCode?.startsWith('GRP-') && !selectedSlip.ticketCode?.startsWith('MEMGRP') && (
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                      <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                        {lang === 'th' ? 'หน่วยงาน' : 'Workplace'}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-slate-800 text-right">
                        {selectedSlip.workplace || '-'}
                      </span>
                    </div>
                  )}

                  {/* ข้อมูลติดต่อ (กรณีบริษัท: แสดงข้อมูลผู้ประสานงานบริษัทเท่านั้น อย่านำอีเมลส่วนบุคคลมาปน - ข้อ 2) */}
                  {selectedSlip.isGroupMembership || selectedSlip.isGroupConference || selectedSlip.groupPayload?.attendees || selectedSlip.groupPayload?.applicants || selectedSlip.ticketCode?.startsWith('GRP-') || selectedSlip.ticketCode?.startsWith('MEMGRP') ? (
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                      <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                        {lang === 'th' ? 'ผู้ประสานงานบริษัท' : 'Company Coordinator'}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-slate-800 text-right break-all">
                        {selectedSlip.coordinatorName || selectedSlip.groupPayload?.groupContact?.coordinatorName || 'ตัวแทนบริษัทสปอนเซอร์'}
                        {(selectedSlip.coordinatorEmail || selectedSlip.groupPayload?.groupContact?.coordinatorEmail) ? (
                          <span className="text-sky-700 block font-mono text-[11px] font-normal">
                            {selectedSlip.coordinatorEmail || selectedSlip.groupPayload?.groupContact?.coordinatorEmail}
                            {(selectedSlip.coordinatorPhone || selectedSlip.groupPayload?.groupContact?.coordinatorPhone) ? ` (${selectedSlip.coordinatorPhone || selectedSlip.groupPayload?.groupContact?.coordinatorPhone})` : ''}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                      <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                        {lang === 'th' ? 'อีเมล / เบอร์ติดต่อ' : 'Contact'}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-slate-800 text-right break-all">
                        {selectedSlip.email} {selectedSlip.phone ? `(${selectedSlip.phone})` : ''}
                      </span>
                    </div>
                  )}

                  {/* คูปองที่ใช้ (ข้อ 4) */}
                  {(selectedSlip.couponCode || selectedSlip.couponInfo?.code) && (
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                      <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                        {lang === 'th' ? 'คูปองที่ใช้' : 'Applied Coupon'}
                      </span>
                      <div className="text-right">
                        <span className="font-mono font-black text-xs sm:text-sm px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5 shadow-2xs">
                          <span>🎟️ {selectedSlip.couponCode || selectedSlip.couponInfo?.code}</span>
                          <span className="text-[11px] text-emerald-700 font-medium">
                            {selectedSlip.couponInfo?.discountType === 'free'
                              ? '(สิทธิ์ฟรี Main Congress)'
                              : selectedSlip.couponInfo?.discountValue
                              ? `(ส่วนลด ${selectedSlip.couponInfo.discountValue})`
                              : ''}
                          </span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ส่วนลดที่ได้รับ (ข้อ 3) */}
                  {((selectedSlip.discountTotal && selectedSlip.discountTotal > 0) || selectedSlip.couponInfo?.discountType === 'free') && (
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                      <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                        {lang === 'th' ? 'ส่วนลดที่ได้รับ' : 'Discount Applied'}
                      </span>
                      <span className="font-black font-mono text-sm sm:text-base text-emerald-700 text-right">
                        -฿{(selectedSlip.discountTotal || ((selectedSlip.groupPayload?.attendees?.length || 1) * 4000)).toLocaleString()} THB
                      </span>
                    </div>
                  )}
                </div>

                {/* Registered Courses & Activities Section */}
                {(() => {
                  const isGroupConf = Boolean(
                    selectedSlip.isGroupConference ||
                    (selectedSlip.groupPayload?.attendees && selectedSlip.groupPayload.attendees.length > 0) ||
                    selectedSlip.ticketCode?.startsWith('GRP-')
                  );
                  const isGroupMem = Boolean(
                    selectedSlip.isGroupMembership ||
                    (selectedSlip.groupPayload?.applicants && selectedSlip.groupPayload.applicants.length > 0) ||
                    selectedSlip.ticketCode?.startsWith('MEMGRP')
                  );
                  const isGroup = isGroupConf || isGroupMem;
                  const attendeesCount = selectedSlip.groupPayload?.attendees?.length || selectedSlip.groupPayload?.applicants?.length || 1;
                  const acts = parseSlipActivities(selectedSlip.selectedActivities, selectedSlip.amount);

                  return (
                    <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 space-y-2.5 border border-slate-200 text-sm">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-extrabold text-xs sm:text-sm text-slate-800 block leading-tight">
                              {lang === 'th' ? 'หลักสูตร / กิจกรรมที่ลงทะเบียน' : 'Registered Courses & Activities'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {lang === 'th' ? 'รายการแพ็กเกจและกิจกรรมที่เลือก' : 'Selected packages & workshop items'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          {isGroup ? (lang === 'th' ? 'แพ็กเกจกลุ่ม' : 'Group Pass') : `${acts.length} ${lang === 'th' ? 'รายการ' : 'items'}`}
                        </span>
                      </div>

                      {isGroup ? (
                        /* สำหรับการสมัครแบบกลุ่ม: ไม่ต้องแสดงลิสต์แยกย่อยของทุกคน ให้แสดงสรุปแพ็กเกจกลุ่มภาพรวม 1 กล่อง */
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 text-xs shadow-2xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-sky-100 text-[#0026b3] border border-sky-200">
                                {isGroupConf ? 'CONFERENCE GROUP' : 'MEMBERSHIP GROUP'}
                              </span>
                              <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                {selectedSlip.meetingName || (lang === 'th' ? 'การประชุมวิชาการประจำปี' : 'Conference Registration')}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-black text-indigo-700 font-mono text-sm sm:text-base">
                                ฿{selectedSlip.amount.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">THB</span>
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            {lang === 'th'
                              ? `สรุปรวมสำหรับผู้ลงทะเบียนทั้งหมด ${attendeesCount} ท่าน (ดูรายละเอียดกิจกรรมที่แต่ละท่านเลือกลงทะเบียนได้ที่การ์ดรายชื่อด้านบน)`
                              : `Combined package for all ${attendeesCount} attendees (See individual activities listed under each attendee card above)`}
                          </p>
                        </div>
                      ) : acts.length > 0 ? (
                        <div className="space-y-1.5 pt-1">
                          {acts.map((act, i) => (
                            <div
                              key={act.id || i}
                              className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200/80 text-xs shadow-2xs hover:border-indigo-200 transition"
                            >
                              <div className="space-y-0.5 min-w-0 pr-3">
                                <div className="flex items-center gap-1.5">
                                  {act.type && (
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                      {act.type}
                                    </span>
                                  )}
                                  <p className="font-bold text-slate-900 truncate text-xs">{act.name}</p>
                                </div>
                                {act.date && <p className="text-[10px] text-slate-500 font-medium">{act.date}</p>}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-black text-indigo-700 font-mono text-xs sm:text-base">
                                  ฿{Number((act.price && Number(act.price) > 0) ? act.price : (acts.length === 1 ? selectedSlip.amount : (act.price || 0))).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 py-1 italic">
                          {lang === 'th' ? 'ไม่มีรายละเอียดกิจกรรมย่อย (ลงทะเบียนแพ็กเกจรวม)' : 'Standard pass registration'}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Status & Rejection Notes */}
                {selectedSlip.notes && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs sm:text-sm text-rose-800 flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{lang === 'th' ? 'หมายเหตุการปฏิเสธ: ' : 'Rejection Reason: '}</span>
                      <span>{selectedSlip.notes}</span>
                    </div>
                  </div>
                )}
              </div>


              {/* Modal Footer Actions */}
              <div className="p-3.5 sm:p-5 border-t border-slate-200 bg-slate-50/80 rounded-b-3xl flex items-center justify-between gap-2 sm:gap-3">
                <button
                  onClick={() => setSelectedSlip(null)}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                  title={lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
                >
                  <X className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}</span>
                </button>

                {selectedSlip.status === 'pending' && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={() => openRejectModal(selectedSlip.id)}
                      disabled={isProcessing}
                      className="px-3 sm:px-4 py-2 sm:py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                      title={lang === 'th' ? 'ปฏิเสธสลิป' : 'Reject Slip'}
                    >
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="hidden sm:inline">{lang === 'th' ? 'ปฏิเสธสลิป' : 'Reject'}</span>
                    </button>

                    <button
                      onClick={() => handleApprove(selectedSlip.id)}
                      disabled={isProcessing}
                      className={`px-3 sm:px-5 py-2 sm:py-2.5 text-[#061d08] text-xs font-black rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 whitespace-nowrap ${
                        processingSlipId === selectedSlip.id
                          ? 'bg-emerald-300 opacity-90 cursor-wait'
                          : 'bg-[#4ade80] hover:bg-[#3ec424]'
                      }`}
                      title={lang === 'th' ? 'อนุมัติการชำระเงิน' : 'Approve Payment'}
                    >
                      {processingSlipId === selectedSlip.id ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin text-[#061d08] shrink-0" />
                          <span>{lang === 'th' ? 'กำลังอนุมัติ...' : 'Approving...'}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#061d08] shrink-0" />
                          <span className="hidden sm:inline">{lang === 'th' ? 'อนุมัติการชำระเงิน' : 'Approve'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Reject Reason Dialog Modal */}
      {mounted &&
        rejectingSlipId &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="p-2 rounded-xl bg-rose-50">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">ระบุเหตุผลการปฏิเสธ / ส่งกลับแก้ไข</h3>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                ระบบจะส่งอีเมลแจ้งเหตุผลนี้ไปยังผู้ลงทะเบียน พร้อมแบบฟอร์มรายการและลิงก์ให้ผู้ลงทะเบียนเข้ามากดตรวจสอบ แก้ไขข้อมูล หรือแนบสลิปใหม่ได้ทันที
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  เลือกเหตุผลด่วน (คลิกเพื่อเลือกรูปแบบการส่งกลับ):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectType('info');
                      setRejectReason('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและแก้ไขข้อมูลให้ถูกต้อง');
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      rejectType === 'info'
                        ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300 text-rose-950 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold text-xs">
                      <span>⚠️</span>
                      <span className="leading-snug">ข้อมูลไม่ถูกต้อง</span>
                    </div>
                    <span className="inline-block mt-1 text-[11px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md w-fit">
                      แนบการแก้ไขข้อมูลกลับไป
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      ส่งลิงก์แบบฟอร์มให้ผู้ลงทะเบียนเข้ามากรอกแก้ไขข้อมูลส่วนตัว
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRejectType('slip');
                      setRejectReason('หลักฐานการโอนเงิน (สลิป) ไม่ถูกต้อง หรือไม่ชัดเจน กรุณาแนบสลิปใหม่');
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      rejectType === 'slip'
                        ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300 text-rose-950 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold text-xs">
                      <span>🧾</span>
                      <span className="leading-snug">สลิปไม่ถูกต้อง</span>
                    </div>
                    <span className="inline-block mt-1 text-[11px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md w-fit">
                      แนบฟอร์มแนบสลิปกลับไป
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      ส่งลิงก์แบบฟอร์มให้ผู้ลงทะเบียนเข้ามากดอัปโหลดสลิปใหม่
                    </p>
                  </button>
                </div>

                <label className="block text-xs font-bold text-slate-700 mb-1.5">เหตุผล / คำแนะนำเพิ่มเติม:</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs text-slate-800 outline-none focus:border-rose-500 focus:bg-white transition"
                  placeholder="ระบุเหตุผลการปฏิเสธ หรือคำแนะนำเพิ่มเติม..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingSlipId(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmReject}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {isProcessing ? <RotateCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  <span>ยืนยันปฏิเสธ & ส่งอีเมล</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Member / Applicant Detail Modal */}
      <MemberDetailModal
        member={viewingApplicant}
        isOpen={Boolean(viewingApplicant)}
        onClose={() => setViewingApplicant(null)}
        isApplicant={true}
        zIndexClass="z-[10000]"
      />

      {/* Conference Attendee Detail Modal */}
      {mounted &&
        viewingAttendee &&
        createPortal(
          <div className="fixed inset-0 z-[10000] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md sm:max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-50 text-[#0026b3]">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                      {lang === 'th' ? 'ข้อมูลผู้ลงทะเบียนเข้าร่วมประชุม' : 'Attendee Details'}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {viewingAttendee.ticketCode || 'Group Conference Attendee'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingAttendee(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* Profile Overview Card */}
                <div className="bg-gradient-to-br from-sky-50 to-indigo-50/40 p-4 rounded-2xl border border-sky-100 flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#0026b3] text-white flex items-center justify-center font-black text-lg shrink-0 shadow-md">
                    {(viewingAttendee.nameTh || viewingAttendee.nameEn || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-slate-900 text-base leading-snug">
                      {viewingAttendee.nameTh || viewingAttendee.nameEn}
                    </h4>
                    {viewingAttendee.nameEn && viewingAttendee.nameTh && (
                      <p className="text-xs text-slate-500 font-medium">({viewingAttendee.nameEn})</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {Boolean(viewingAttendee.isMember || viewingAttendee.memberNo) ? (
                        <span className="text-[10px] font-black bg-blue-100 text-[#0026b3] px-2 py-0.5 rounded-md border border-blue-200">
                          {viewingAttendee.memberNo ? `สมาชิก (#${viewingAttendee.memberNo})` : 'สมาชิกสมาคม'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                          บุคคลทั่วไป (Non-Member)
                        </span>
                      )}
                      {(viewingAttendee.selectedFormat || viewingAttendee.format || viewingAttendee.selectedPackage) && (
                        <span className="text-[10px] font-black bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                          {viewingAttendee.selectedFormat || viewingAttendee.format || viewingAttendee.selectedPackage}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Fields */}
                <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 border border-slate-200 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/80 gap-2">
                    <span className="text-slate-500 font-bold shrink-0">บริษัท / หน่วยงาน:</span>
                    <span className="font-bold text-slate-800 text-right">{viewingAttendee.companyName || viewingAttendee.workplace || '-'}</span>
                  </div>
                  {viewingAttendee.position && (
                    <div className="flex justify-between py-1 border-b border-slate-200/80 gap-2">
                      <span className="text-slate-500 font-bold shrink-0">ตำแหน่ง:</span>
                      <span className="font-bold text-slate-800 text-right">{viewingAttendee.position}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-slate-200/80 gap-2">
                    <span className="text-slate-500 font-bold shrink-0">อีเมล:</span>
                    <span className="font-bold text-slate-800 text-right font-mono">{viewingAttendee.email || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/80 gap-2">
                    <span className="text-slate-500 font-bold shrink-0">เบอร์โทรศัพท์:</span>
                    <span className="font-bold text-slate-800 text-right font-mono">{viewingAttendee.mobile || '-'}</span>
                  </div>
                  {viewingAttendee.lineId && (
                    <div className="flex justify-between py-1 border-b border-slate-200/80 gap-2">
                      <span className="text-slate-500 font-bold shrink-0">LINE ID:</span>
                      <span className="font-bold text-slate-800 text-right font-mono">{viewingAttendee.lineId}</span>
                    </div>
                  )}
                  {viewingAttendee.dietaryPreference && (
                    <div className="flex justify-between py-1 border-b border-slate-200/80 gap-2">
                      <span className="text-slate-500 font-bold shrink-0">ข้อกำหนดอาหาร:</span>
                      <span className="font-bold text-emerald-700 text-right">🍽️ {viewingAttendee.dietaryPreference}</span>
                    </div>
                  )}
                  {viewingAttendee.foodAllergies && (
                    <div className="flex justify-between py-1 border-b border-slate-200/80 gap-2">
                      <span className="text-slate-500 font-bold shrink-0">อาหารที่แพ้:</span>
                      <span className="font-bold text-rose-600 text-right">⚠️ {viewingAttendee.foodAllergies}</span>
                    </div>
                  )}
                  {viewingAttendee.specialRequirements && (
                    <div className="flex justify-between py-1 border-b border-slate-200/80 gap-2">
                      <span className="text-slate-500 font-bold shrink-0">ความต้องการพิเศษ:</span>
                      <span className="font-bold text-slate-800 text-right">{viewingAttendee.specialRequirements}</span>
                    </div>
                  )}
                  {viewingAttendee.subtotal ? (
                    <div className="flex justify-between py-1 gap-2 pt-1 border-t border-slate-200">
                      <span className="text-slate-500 font-bold shrink-0">ค่าลงทะเบียน:</span>
                      <span className="font-black text-indigo-700 font-mono text-sm">฿{Number(viewingAttendee.subtotal).toLocaleString()} THB</span>
                    </div>
                  ) : null}
                </div>

                {/* Selected Activities / Workshops */}
                {(() => {
                  const attendeeActs = getAttendeeActivities(viewingAttendee);
                  if (attendeeActs.length === 0) return null;
                  return (
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-200 text-xs">
                      <h5 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#0026b3]" />
                        <span>กิจกรรมและหลักสูตรที่เลือก ({attendeeActs.length} รายการ)</span>
                      </h5>
                      <div className="space-y-1.5 pt-1">
                        {attendeeActs.map((act: any, idx: number) => (
                          <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between items-center gap-2">
                            <span className="font-bold text-slate-800 truncate">{act.name}</span>
                            {act.price ? (
                              <span className="font-black text-indigo-700 font-mono shrink-0">฿{Number(act.price).toLocaleString()}</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingAttendee(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Toast Notification (Portal at z-[10000]) */}
      {mounted &&
        toastMessage &&
        createPortal(
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] max-w-lg w-[92%] sm:w-auto bg-slate-900/95 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 animate-fade-in backdrop-blur-md">
            <div className="w-2.5 h-2.5 rounded-full bg-[#4ade80] animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-bold flex-1 leading-snug">{toastMessage}</span>
          </div>,
          document.body
        )}
    </div>
  );
}
