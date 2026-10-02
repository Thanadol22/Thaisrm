'use client';

import React, { useState, useEffect } from 'react';
import { AdminPageHeader, HeaderButton, HeaderTabs } from '@/components/admin/AdminPageHeader';
import { Btn, EmptyState, FilterSelect, StatGrid, StatCard, Toolbar, ToolbarGroup, SearchInput } from '@/components/admin/ui';
import { createPortal } from 'react-dom';
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Check,
  X,
  CreditCard,
  Building2,
  Mail,
  AlertCircle,
  RotateCw,
  Pencil,
  Monitor,
  MapPin,
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
  Trash2,
  UserPlus,
  ChevronUp,
  Upload,
  Download,
  CalendarDays,
  Loader2,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { uploadImageToStorage } from '@/lib/blobUpload';
import { buildZip, type ZipEntry } from '@/lib/zipStore';
import { PaginationControls } from '@/components/PaginationControls';
import { MemberDetailModal } from '@/components/MemberDetailModal';
import { GroupAttendeeEditorModal, type GroupAttendeeEditorTarget } from '@/components/admin/GroupAttendeeEditorModal';

export interface SlipActivityItem {
  id?: string;
  name: string;
  date?: string;
  type?: string;
  price?: number;
  rateBadgeTh?: string;
  rateBadgeEn?: string;
  /** กิจกรรมที่บริษัทลงทะเบียนเพิ่มให้ ยอดเงินอยู่ในบิลกลุ่ม ไม่รวมในยอดของรายการนี้ */
  paidByGroup?: { slipId: string; ticketCode: string; companyName: string; price: number };
}

export function getAttendeeActivities(att: any): { name: string; price?: number }[] {
  if (!att) return [];
  // รายการลงบิลย้อนหลัง (เช่น Main Program (เพิ่มเติม)) แสดงต่อท้ายในบิล ไม่ผูกกับสิทธิ์กิจกรรม
  const raw = att.backdatedCharge;
  const backdated = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .filter((c: any) => c && typeof c === 'object' && c.label)
    .map((c: any) => ({ name: String(c.label), price: Number(c.amount) || 0 }));
  return [...getRegisteredActivities(att), ...backdated];
}

function getRegisteredActivities(att: any): { name: string; price?: number }[] {

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

const MAIN_PROGRAM_PRICE = 4000;

function attendeeHasMainProgram(att: any): boolean {
  const raw = [
    ...(Array.isArray(att?.selectedActivityObjects) ? att.selectedActivityObjects : []),
    ...(Array.isArray(att?.selectedActivities) ? att.selectedActivities : []),
    ...(Array.isArray(att?.activities) ? att.activities : []),
  ];
  // ไม่มีข้อมูลกิจกรรม = ลงเฉพาะการประชุมหลัก
  if (raw.length === 0 && !att?.programNameTh && !att?.selectedPackage) return true;
  const isMainName = (name: unknown) => {
    const n = String(name || '').toLowerCase();
    return n.includes('การประชุมหลัก') || n.includes('main');
  };
  return (
    raw.some((a: any) =>
      typeof a === 'object' && a !== null
        ? a.type === 'main' || a.id === 'main' || isMainName(a.name || a.title)
        : a === 'main' || isMainName(a)
    ) ||
    isMainName(att?.programNameTh) ||
    isMainName(att?.selectedPackage)
  );
}

/**
 * ส่วนลดคูปองของผู้ลงทะเบียนในกลุ่ม: ใช้ค่าที่บันทึกไว้ตอนลงทะเบียน (รวมถึง 0)
 * ประมาณค่าเฉพาะรายการเก่าที่ไม่มีข้อมูลส่วนลด และคูปองครอบคลุมเฉพาะการประชุมหลักของสมาชิก
 */
export function getGroupAttendeeDiscount(att: any, slip: Pick<SlipRecord, 'couponCode' | 'couponInfo' | 'couponUsages'>): number {
  if (!att || att.isAddOn) return 0;

  const usage = slip.couponUsages?.find(
    (cu) => (att.memberNo && cu.memberNo === att.memberNo) ||
      (att.email && cu.attendeeEmail?.toLowerCase() === String(att.email).toLowerCase()) ||
      (att.nameTh && cu.attendeeName === att.nameTh)
  );
  if (usage?.discountApplied && Number(usage.discountApplied) > 0) return Number(usage.discountApplied);

  const stored = att.discountTotal ?? att.discountAmount;
  if (stored !== undefined && stored !== null && stored !== '') return Number(stored) || 0;

  const hasCoupon = Boolean(slip.couponCode || slip.couponInfo?.code);
  const isMember = Boolean(att.isMember || att.memberNo);
  return hasCoupon && isMember && attendeeHasMainProgram(att) ? MAIN_PROGRAM_PRICE : 0;
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
  /** ลงทะเบียนกิจกรรมเพิ่มเติม (อนุมัติแล้วจะรวมเข้ารายการเดิม) */
  isAddOn?: boolean;
  originalSlipId?: string | null;
  originalTicketCode?: string | null;
  originalActivities?: SlipActivityItem[];
  originalStatus?: 'pending' | 'approved' | 'rejected' | null;
  /** จำนวนรายการเพิ่มเติมของรายการนี้ที่ยังรอตรวจสอบ */
  pendingAddOnCount?: number;
  /** รายการเพิ่มเติมที่รวมเข้ารายการนี้แล้ว */
  addOnPayments?: Array<{
    slipId: string;
    ticketCode: string;
    amount: number;
    transferDate: string;
    transferTime: string;
    refNo: string;
    slipUrl: string;
    activities: SlipActivityItem[];
    reviewedBy: string;
    reviewedAt: string | null;
  }>;
  memberPayload?: any;
  guestPayload?: any;
  nameTh: string;
  nameEn: string;
  position?: string;
  attendanceType?: string;
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
  /** บันทึกแยกสำหรับผู้ดูแลระบบ (เช่น รายการ fellow) ยอดรวมอยู่ในบิล includedInTicketCode แล้ว */
  isAdminLedger?: boolean;
  includedInTicketCode?: string | null;
  isPayLater?: boolean;
  isPendingPaymentReview?: boolean;
  hasActualSlip?: boolean;
  /** แอดมินแนบสลิปไว้แล้ว รออนุมัติการชำระเงิน (slipUrl คือสลิปที่แนบ แต่ยังไม่นับเป็นชำระแล้ว) */
  adminAttachedSlip?: boolean;
}

/** รายการราคา fellow: มาจากฟอร์ม fellow (ทั้งบิล) หรือแอดมินระบุรายคน/แอดมินลงทะเบียนให้ */
export const isFellowSlip = (s?: SlipRecord | null, att?: any) =>
  Boolean(
    att?.isFellow ||
      att?.priceTier === 'fellow' ||
      s?.groupPayload?.isFellow ||
      s?.groupPayload?.priceTier === 'fellow' ||
      s?.guestPayload?.isFellow
  );

export const hasActualSlip = (s?: SlipRecord | null) =>
  Boolean(
    !s?.adminAttachedSlip &&
    s?.slipUrl &&
    s.slipUrl !== 'PAY_LATER' &&
    s.slipUrl !== 'pay_later_pending' &&
    s.slipUrl !== '/placeholder-slip.png' &&
    s.slipUrl !== 'GROUP_REGISTRATION' &&
    s.slipUrl !== 'GROUP_MEMBERSHIP' &&
    !s.slipUrl.startsWith('TEMP_')
  );

/** รอตรวจสอบ หรืออนุมัติสิทธิ์แล้วแต่มีสลิปที่แอดมินแนบไว้รออนุมัติการชำระเงิน */
export const canApproveSlip = (s: SlipRecord) =>
  s.status === 'pending' || (s.status === 'approved' && Boolean(s.adminAttachedSlip));

/** มีไฟล์สลิปให้ดาวน์โหลด (รวมสลิปที่แอดมินแนบไว้รออนุมัติ) */
export const isDownloadableSlipUrl = (url?: string | null) =>
  Boolean(url && (/^(https?:|\/)/.test(url) || url.startsWith('data:')) && url !== '/placeholder-slip.png');

/** ปุ่มเครื่องมือรองในแถบล่างของการ์ดสลิป */
const CARD_ACTION_BTN =
  'h-9 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 hover:border-slate-300 text-slate-700 text-xs font-bold transition cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed';

type SlipFile = { blob: Blob; fileName: string };

async function fetchSlipFile(slipId: string): Promise<SlipFile> {
  const res = await fetch(`/api/admin/slips/download?id=${encodeURIComponent(slipId)}`);
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  const encodedName = res.headers.get('X-Slip-Filename');
  return {
    blob: await res.blob(),
    fileName: encodedName ? decodeURIComponent(encodedName) : `slip_${slipId}`,
  };
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const isPdfSlipUrl = (url?: string | null) => {
  if (!url) return false;
  if (url.startsWith('data:application/pdf')) return true;
  return url.split('?')[0].toLowerCase().endsWith('.pdf');
};

export const isRegisteredAsPayLater =(s?: SlipRecord | null) =>
  !s?.isAdminLedger &&
  Boolean(
    s?.isPayLater ||
    s?.slipUrl === 'PAY_LATER' ||
    s?.slipUrl === 'pay_later_pending' ||
    s?.bank?.includes('ชำระเงินภายหลัง') ||
    s?.bank?.toLowerCase().includes('pay later') ||
    s?.slipUrl === '/placeholder-slip.png' ||
    !s?.slipUrl
  );

export type SlipLifecycleStage =
  | 'awaiting_access_approval'   // รออนุมัติสิทธิ์
  | 'approved_awaiting_payment'  // อนุมัติสิทธิ์แล้ว - รอชำระเงิน
  | 'pending_payment_review'     // แนบสลิปแล้ว - รอตรวจสอบยอดเงิน
  | 'payment_approved'           // ชำระเงินเรียบร้อยแล้ว
  | 'rejected'                   // ปฏิเสธ
  | 'standard_pending';          // รอตรวจสอบ

export function getSlipLifecycleStage(s: SlipRecord): SlipLifecycleStage {
  if (s.status === 'rejected') return 'rejected';

  const hasSlip = hasActualSlip(s);
  const isPayLater = isRegisteredAsPayLater(s);

  if (hasSlip) {
    if (s.status === 'approved') return 'payment_approved';
    return 'pending_payment_review';
  }

  // ไม่มีสลิปจริงแนบ
  if (isPayLater) {
    if (s.status === 'approved') return 'approved_awaiting_payment';
    return 'awaiting_access_approval';
  }

  if (s.status === 'approved') return 'payment_approved';
  return 'standard_pending';
}

export function renderSlipStatusBadge(s: SlipRecord, lang: 'th' | 'en' = 'th') {
  if (s.isAdminLedger && s.status !== 'rejected') {
    return (
      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-lime-100 text-lime-900 border border-lime-300 shadow-2xs">
        {lang === 'th'
          ? `บันทึกแยกสำหรับแอดมิน${s.includedInTicketCode ? ` ยอดรวมในบิล ${s.includedInTicketCode}` : ''}`
          : `Admin record${s.includedInTicketCode ? `, billed in ${s.includedInTicketCode}` : ''}`}
      </span>
    );
  }
  if (!s.adminAttachedSlip || s.status === 'rejected') return renderLifecycleBadge(s, lang);
  return (
    <>
      {renderLifecycleBadge(s, lang)}
      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs">
        {lang === 'th' ? '📎 แนบสลิปแล้ว - รออนุมัติการชำระเงิน' : '📎 Slip Attached - Awaiting Payment Approval'}
      </span>
    </>
  );
}

function renderLifecycleBadge(s: SlipRecord, lang: 'th' | 'en') {
  const stage = getSlipLifecycleStage(s);

  switch (stage) {
    case 'awaiting_access_approval':
      return (
        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
          {lang === 'th' ? '⏳ รออนุมัติสิทธิ์' : '⏳ Awaiting Approval'}
        </span>
      );
    case 'approved_awaiting_payment':
      return (
        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs">
          {lang === 'th' ? '✓ อนุมัติสิทธิ์แล้ว - รอชำระเงิน' : '✓ Access Approved - Awaiting Payment'}
        </span>
      );
    case 'pending_payment_review':
      return (
        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-2xs">
          {lang === 'th' ? '⏳ แนบสลิปแล้ว - รอตรวจสอบยอดเงิน' : '⏳ Slip Uploaded - Awaiting Payment Review'}
        </span>
      );
    case 'payment_approved':
      return (
        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
          {lang === 'th' ? '✓ ชำระเงินเรียบร้อยแล้ว' : '✓ Payment Completed'}
        </span>
      );
    case 'rejected':
      return (
        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
          {lang === 'th' ? '✕ ปฏิเสธ' : '✕ Rejected'}
        </span>
      );
    case 'standard_pending':
    default:
      return (
        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
          {lang === 'th' ? '⏳ รอตรวจสอบ' : '⏳ Pending'}
        </span>
      );
  }
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
    if (raw.activities && Array.isArray(raw.activities) && raw.activities.length > 0) {
      return parseSlipActivities(raw.activities, fallbackAmount);
    }
    if (raw.selectedActivities && Array.isArray(raw.selectedActivities) && raw.selectedActivities.length > 0) {
      return parseSlipActivities(raw.selectedActivities, fallbackAmount);
    }
    if (raw.type === 'conference_group_registration' || (raw.isGroup && raw.attendees && Array.isArray(raw.attendees) && raw.attendees.length > 1)) {
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
    if (raw.programNameTh || raw.selectedPackage) {
      return [{
        name: raw.programNameTh || raw.selectedPackage,
        price: fallbackAmount !== undefined && Number(fallbackAmount) > 0 ? Number(fallbackAmount) : (raw.amount || raw.price || 0),
      }];
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
  if (fallbackAmount !== undefined && Number(fallbackAmount) > 0) {
    return [{
      name: 'การลงทะเบียน',
      price: Number(fallbackAmount),
    }];
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
  const [meetingFilter, setMeetingFilter] = useState('all');
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

  // Admin attach slip modal state
  const [attachingSlip, setAttachingSlip] = useState<SlipRecord | null>(null);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachPreviewUrl, setAttachPreviewUrl] = useState<string | null>(null);
  const [attachTransferDate, setAttachTransferDate] = useState('');
  const [attachTransferTime, setAttachTransferTime] = useState('');
  const [attachUploading, setAttachUploading] = useState(false);
  const [attachError, setAttachError] = useState('');

  // Admin edit attendance format modal state (attendeeIndex = ผู้เข้าร่วมในสลิปกลุ่ม, null = รายบุคคล)
  const [formatEditTarget, setFormatEditTarget] = useState<{
    slip: SlipRecord;
    attendeeIndex: number | null;
    attendeeName: string;
    current: 'onsite' | 'online';
  } | null>(null);
  const [formatEditValue, setFormatEditValue] = useState<'onsite' | 'online'>('onsite');
  const [formatSaving, setFormatSaving] = useState(false);
  const [formatError, setFormatError] = useState('');

  // Admin add / edit / remove attendees of a group conference slip
  const [attendeeEditor, setAttendeeEditor] = useState<GroupAttendeeEditorTarget | null>(null);

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
      .catch(() => { });
  }, []);

  // Reset to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter, meetingFilter]);

  const fetchSlips = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/slips');
      const json = await res.json();
      if (json.success) {
        setSlips(json.data || []);
        return (json.data || []) as SlipRecord[];
      }
    } catch (err) {
      console.error('Error loading slips:', err);
    } finally {
      setLoading(false);
    }
    return null;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [downloadingSlipId, setDownloadingSlipId] = useState<string | null>(null);
  const [bulkDownload, setBulkDownload] = useState<{ done: number; total: number } | null>(null);

  const downloadSlip = async (slipId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (downloadingSlipId) return;
    setDownloadingSlipId(slipId);
    try {
      const file = await fetchSlipFile(slipId);
      saveBlob(file.blob, file.fileName);
    } catch (err: any) {
      showToast(`${lang === 'th' ? 'ดาวน์โหลดสลิปไม่สำเร็จ' : 'Slip download failed'}: ${err?.message || ''}`);
    } finally {
      setDownloadingSlipId(null);
    }
  };

  /** ดาวน์โหลดสลิปทุกรายการตามตัวกรองปัจจุบันเป็นไฟล์ ZIP (รวมสลิปของรายการเพิ่มเติมที่รวมแล้ว) */
  const downloadSlipsZip = async (records: SlipRecord[]) => {
    if (bulkDownload) return;
    const ids = Array.from(
      new Set(
        records.flatMap((s) => [
          ...(isDownloadableSlipUrl(s.slipUrl) ? [s.id] : []),
          ...(s.addOnPayments || []).filter((p) => isDownloadableSlipUrl(p.slipUrl)).map((p) => p.slipId),
        ])
      )
    );
    if (ids.length === 0) {
      showToast(lang === 'th' ? 'ไม่มีไฟล์สลิปในรายการที่เลือก' : 'No slip files in the current list');
      return;
    }

    setBulkDownload({ done: 0, total: ids.length });
    const entries: ZipEntry[] = [];
    const usedNames = new Set<string>();
    let failed = 0;
    let cursor = 0;
    const worker = async () => {
      while (cursor < ids.length) {
        const id = ids[cursor++];
        try {
          const file = await fetchSlipFile(id);
          let name = file.fileName;
          for (let n = 2; usedNames.has(name); n++) name = file.fileName.replace(/(\.[^.]+)?$/, `_${n}$1`);
          usedNames.add(name);
          entries.push({ name, data: new Uint8Array(await file.blob.arrayBuffer()) });
        } catch {
          failed++;
        }
        setBulkDownload((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
      }
    };

    try {
      await Promise.all(Array.from({ length: Math.min(4, ids.length) }, worker));
      if (entries.length === 0) {
        showToast(lang === 'th' ? 'ดาวน์โหลดสลิปไม่สำเร็จ' : 'Slip download failed');
        return;
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      const stamp = new Date().toISOString().slice(0, 10);
      saveBlob(buildZip(entries), `slips_${statusFilter}_${stamp}.zip`);
      showToast(
        failed > 0
          ? (lang === 'th'
              ? `ดาวน์โหลด ${entries.length} ไฟล์ ไม่สำเร็จ ${failed} ไฟล์`
              : `Downloaded ${entries.length} files, ${failed} failed`)
          : (lang === 'th' ? `ดาวน์โหลดสลิป ${entries.length} ไฟล์เรียบร้อย` : `Downloaded ${entries.length} slip files`)
      );
    } finally {
      setBulkDownload(null);
    }
  };

  const openAttachModal = (slip: SlipRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAttachingSlip(slip);
    setAttachFile(null);
    setAttachPreviewUrl(null);
    setAttachTransferDate('');
    setAttachTransferTime('');
    setAttachError('');
  };

  const closeAttachModal = () => {
    if (attachUploading) return;
    if (attachPreviewUrl) URL.revokeObjectURL(attachPreviewUrl);
    setAttachingSlip(null);
    setAttachFile(null);
    setAttachPreviewUrl(null);
  };

  const handleAttachFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // ล้างค่าเพื่อให้เลือกไฟล์เดิมซ้ำได้หลังเปลี่ยนใจ
    e.target.value = '';
    if (!file) return;
    if (attachPreviewUrl) URL.revokeObjectURL(attachPreviewUrl);
    setAttachFile(file);
    setAttachPreviewUrl(URL.createObjectURL(file));
    setAttachError('');
  };

  const handleConfirmAttach = async () => {
    if (!attachingSlip) return;
    if (!attachFile) {
      setAttachError('กรุณาเลือกไฟล์สลิป');
      return;
    }
    try {
      setAttachUploading(true);
      setAttachError('');
      const uploaded = await uploadImageToStorage(attachFile, 'slips');
      const res = await fetch('/api/admin/slips/attach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slipId: attachingSlip.id,
          slipUrl: uploaded.url,
          transferDate: attachTransferDate,
          transferTime: attachTransferTime,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setAttachError(json.error || 'ไม่สามารถแนบสลิปได้');
        return;
      }
      const patch = {
        slipUrl: json.data.slipUrl,
        adminAttachedSlip: Boolean(json.data.awaitingApproval),
        transferDate: json.data.transferDate,
        transferTime: json.data.transferTime,
      };
      setSlips((prev) => prev.map((s) => (s.id === attachingSlip.id ? { ...s, ...patch } : s)));
      setSelectedSlip((prev) => (prev && prev.id === attachingSlip.id ? { ...prev, ...patch } : prev));
      if (attachPreviewUrl) URL.revokeObjectURL(attachPreviewUrl);
      setAttachingSlip(null);
      setAttachFile(null);
      setAttachPreviewUrl(null);
      showToast(
        json.data.awaitingApproval
          ? '✓ แนบสลิปเรียบร้อยแล้ว สถานะจะเปลี่ยนเป็นชำระเงินเรียบร้อยเมื่อกดอนุมัติ'
          : '✓ เปลี่ยนรูปสลิปเรียบร้อยแล้ว'
      );
    } catch (err: any) {
      setAttachError(err?.message || 'เกิดข้อผิดพลาดในการอัปโหลดสลิป');
    } finally {
      setAttachUploading(false);
    }
  };

  const canEditFormat = (slip: SlipRecord) =>
    (slip.status === 'pending' || slip.status === 'approved') &&
    !slip.isGroupMembership &&
    !slip.isFormatChange &&
    !slip.isAddOn;

  const canEditGroupAttendees = (slip: SlipRecord) =>
    (slip.status === 'pending' || slip.status === 'approved') && Boolean(slip.isGroupConference) && !slip.isAddOn;

  const openAttendeeEditor = (
    slip: SlipRecord,
    mode: GroupAttendeeEditorTarget['mode'],
    attendeeIndex: number | null = null,
    attendee: any = null
  ) => {
    setAttendeeEditor({
      slipId: slip.id,
      ticketCode: slip.ticketCode,
      slipStatus: slip.status,
      slipAmount: Number(slip.amount) || 0,
      mode,
      attendeeIndex,
      attendee,
    });
  };

  const handleAttendeeSaved = async (message: string) => {
    const slipId = attendeeEditor?.slipId;
    setAttendeeEditor(null);
    showToast(message);
    const fresh = await fetchSlips();
    if (fresh && slipId) {
      setSelectedSlip((prev) => (prev && prev.id === slipId ? fresh.find((s) => s.id === slipId) || prev : prev));
    }
  };

  const openFormatEdit = (
    slip: SlipRecord,
    current: 'onsite' | 'online',
    attendeeIndex: number | null = null,
    attendeeName = ''
  ) => {
    setFormatEditTarget({ slip, attendeeIndex, attendeeName: attendeeName || slip.nameTh || '', current });
    setFormatEditValue(current === 'online' ? 'onsite' : 'online');
    setFormatError('');
  };

  const closeFormatEdit = () => {
    if (formatSaving) return;
    setFormatEditTarget(null);
  };

  const handleConfirmFormatEdit = async () => {
    if (!formatEditTarget) return;
    const { slip, attendeeIndex } = formatEditTarget;
    try {
      setFormatSaving(true);
      setFormatError('');
      const res = await fetch('/api/admin/slips/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slipId: slip.id, format: formatEditValue, attendeeIndex }),
      });
      const json = await res.json();
      if (!json.success) {
        setFormatError(json.error || 'ไม่สามารถแก้ไขรูปแบบการเข้าร่วมได้');
        return;
      }
      const format = json.data.format as 'onsite' | 'online';
      const applyPatch = (s: SlipRecord): SlipRecord => {
        if (s.id !== slip.id) return s;
        if (attendeeIndex !== null && s.groupPayload?.attendees) {
          return {
            ...s,
            groupPayload: {
              ...s.groupPayload,
              attendees: s.groupPayload.attendees.map((att: any, idx: number) =>
                idx === attendeeIndex
                  ? {
                      ...att,
                      attendanceType: format,
                      ...(att.selectedFormat !== undefined ? { selectedFormat: format } : {}),
                      ...(att.format !== undefined ? { format } : {}),
                    }
                  : att
              ),
            },
          };
        }
        return {
          ...s,
          attendanceType: format,
          guestPayload: s.guestPayload ? { ...s.guestPayload, attendanceType: format } : s.guestPayload,
        };
      };
      setSlips((prev) => prev.map(applyPatch));
      setSelectedSlip((prev) => (prev ? applyPatch(prev) : prev));
      setFormatEditTarget(null);
      showToast(
        format === 'online'
          ? '✓ เปลี่ยนเป็นเข้าร่วมแบบออนไลน์เรียบร้อยแล้ว'
          : '✓ เปลี่ยนเป็นเข้าร่วม ณ สถานที่จัดงานเรียบร้อยแล้ว'
      );
    } catch (err: any) {
      setFormatError(err?.message || 'เกิดข้อผิดพลาดในการแก้ไขรูปแบบการเข้าร่วม');
    } finally {
      setFormatSaving(false);
    }
  };

  const handleApprove = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // รายการเพิ่มเติมที่รายการเดิมยังไม่อนุมัติ: เสนอให้อนุมัติรายการเดิมพร้อมกัน (ต้องรวมเข้ารายการที่อนุมัติแล้วเท่านั้น)
    const target = slips.find((s) => s.id === id) || (selectedSlip?.id === id ? selectedSlip : null);
    if (target?.isAddOn && target.originalStatus && target.originalStatus !== 'approved') {
      const original = slips.find((s) => s.id === target.originalSlipId);
      const originalLabel = target.originalTicketCode || target.originalSlipId || '';
      if (target.originalStatus !== 'pending' || !original) {
        showToast(`✕ รายการเดิม ${originalLabel} ไม่อยู่ในสถานะรอตรวจสอบ กรุณาตรวจสอบรายการเดิมก่อน`);
        return;
      }
      const approveBoth = confirm(
        `รายการเดิม ${originalLabel} ยอด ฿${Number(original.amount || 0).toLocaleString()} ยังไม่ได้รับการอนุมัติ\n\n` +
        'ต้องการอนุมัติรายการเดิมพร้อมกับรายการเพิ่มเติมนี้หรือไม่\nกรุณาตรวจสอบสลิปของรายการเดิมให้เรียบร้อยก่อนกดยืนยัน'
      );
      if (!approveBoth) return;
      try {
        setIsProcessing(true);
        setProcessingSlipId(id);
        const origRes = await fetch('/api/admin/slips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slipId: original.id, action: 'approve' }),
        });
        const origJson = await origRes.json();
        if (!origJson.success) {
          showToast(`✕ อนุมัติรายการเดิมไม่สำเร็จ: ${origJson.error || ''}`);
          setIsProcessing(false);
          setProcessingSlipId(null);
          return;
        }
      } catch (err: any) {
        showToast(`✕ ${err.message || 'Error approving original slip'}`);
        setIsProcessing(false);
        setProcessingSlipId(null);
        return;
      }
    }
    try {
      setIsProcessing(true);
      setProcessingSlipId(id);
      const res = await fetch('/api/admin/slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slipId: id, action: 'approve' }),
      });
      const json = await res.json();
      if (json.success && json.data?.isAddOnMerged) {
        // รายการเพิ่มเติมถูกรวมเข้ารายการเดิม: โหลดรายการใหม่เพื่อแสดงยอดและกิจกรรมที่รวมแล้ว
        setSelectedSlip(null);
        await fetchSlips();
        showToast(`✓ ${json.data.message}`);
      } else if (json.success) {
        const approvedMemberNo = json.data?.memberNo;
        setSlips((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                ...s,
                status: 'approved',
                adminAttachedSlip: false,
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
                adminAttachedSlip: false,
                notes: undefined,
                memberNo: approvedMemberNo || prev.memberNo,
                isMember: Boolean(approvedMemberNo || prev.isMember),
              }
              : null
          );
        }
        const targetSlip = slips.find((s) => s.id === id) || selectedSlip;
        const hasSlip = hasActualSlip(targetSlip);
        const isPayLater = isRegisteredAsPayLater(targetSlip);
        showToast(
          approvedMemberNo
            ? (lang === 'th' ? `✓ อนุมัติสิทธิ์และสร้างบัญชีสมาชิกเรียบร้อยแล้ว (รหัสสมาชิก: ${approvedMemberNo})` : `✓ Access approved and member created (No: ${approvedMemberNo})`)
            : (!hasSlip && isPayLater)
              ? (lang === 'th' ? '✓ อนุมัติสิทธิ์เรียบร้อยแล้ว (สถานะ: รอชำระเงิน/รอสลิป)' : '✓ Access approved (Awaiting Payment)')
              : (lang === 'th' ? '✓ อนุมัติการชำระเงินเรียบร้อยแล้ว' : '✓ Payment approved successfully')
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
    const target = slips.find((s) => s.id === id) || (selectedSlip?.id === id ? selectedSlip : null);
    const isMem = target?.isMembershipRegistration || target?.ticketCode?.startsWith('MEM-');
    const isCorp = target?.isGroupMembership || target?.isGroupConference || target?.ticketCode?.startsWith('GRP-') || target?.ticketCode?.startsWith('MEMGRP');
    setRejectType('info');
    if (isMem) {
      setRejectReason('ข้อมูลหรือเอกสารการสมัครสมาชิกไม่ถูกต้อง/ไม่ครบถ้วน กรุณาตรวจสอบและแก้ไขข้อมูล หรือแนบเอกสารรับรองใหม่');
    } else if (isCorp) {
      setRejectReason('ข้อมูลบริษัทหรือรายชื่อผู้ลงทะเบียนไม่ถูกต้อง กรุณาตรวจสอบและแก้ไขข้อมูลให้ถูกต้อง');
    } else {
      setRejectReason('ข้อมูลผู้ลงทะเบียนไม่ถูกต้อง กรุณาตรวจสอบและแก้ไขข้อมูลให้ถูกต้อง');
    }
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

  const isPayLaterSlip = (s: SlipRecord) => isRegisteredAsPayLater(s);

  // รอบประชุมที่มีรายการชำระเงิน (เรียงตามรายการล่าสุด)
  const meetingOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    slips.forEach((s) => {
      if (s.meetingId && !map.has(s.meetingId)) map.set(s.meetingId, s.meetingName || s.meetingId);
    });
    return [...map].map(([value, label]) => ({ value, label }));
  }, [slips]);

  // รอบประชุมที่เลือกไม่มีรายการแล้ว (เช่น หลังรีเฟรช) ให้กลับไปแสดงทุกรอบ
  const activeMeetingFilter = meetingFilter !== 'all' && meetingOptions.some((m) => m.value === meetingFilter) ? meetingFilter : 'all';

  // Slips filtered by meeting (ตัวเลขทุกแท็บและการ์ดสรุปนับตามรอบประชุมที่เลือก)
  const meetingSlips = React.useMemo(
    () => (activeMeetingFilter === 'all' ? slips : slips.filter((s) => s.meetingId === activeMeetingFilter)),
    [slips, activeMeetingFilter]
  );

  // Slips filtered by meeting and Category (used for scoped metrics and status filter counts)
  const categorySlips = React.useMemo(() => {
    return meetingSlips.filter((s) => {
      const isCorporate = isCorporateSlip(s);
      const isPayLater = isPayLaterSlip(s);
      if (categoryFilter === 'individual' && isCorporate) return false;
      if (categoryFilter === 'corporate' && !isCorporate) return false;
      if (categoryFilter === 'corporate_pay_later' && (!isCorporate || !isPayLater)) return false;
      return true;
    });
  }, [meetingSlips, categoryFilter]);

  // Overall category counts
  const totalCount = meetingSlips.length;
  const individualSlips = React.useMemo(
    () => meetingSlips.filter((s) => !isCorporateSlip(s)),
    [meetingSlips]
  );
  const corporateSlips = React.useMemo(
    () => meetingSlips.filter((s) => isCorporateSlip(s)),
    [meetingSlips]
  );
  const corporatePayLaterSlips = React.useMemo(
    () => meetingSlips.filter((s) => isCorporateSlip(s) && isPayLaterSlip(s)),
    [meetingSlips]
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
    <div className="space-y-6 animate-fade-in pb-12">
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

      <AdminPageHeader
        tab="verify-slip"
        title={lang === 'th' ? 'ตรวจสอบการชำระเงิน' : 'Payment Verification'}
        description={
          lang === 'th'
            ? 'ตรวจสอบหลักฐานการชำระเงินค่าประชุม อนุมัติสิทธิ์เข้างาน หรือแจ้งส่งสลิปใหม่'
            : 'Review payment slips, verify bank transaction details, and approve event access.'
        }
        actions={
          <>
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-amber-950 text-xs sm:text-sm font-black shadow-sm">
              <Clock className="w-4 h-4" />
              {lang === 'th' ? 'รอตรวจ' : 'Pending'} {allPendingCount}
            </span>
            <HeaderButton icon={RotateCw} onClick={fetchSlips} disabled={loading} title="รีเฟรชข้อมูล">
              {lang === 'th' ? 'รีเฟรช' : 'Refresh'}
            </HeaderButton>
          </>
        }
      >
        <HeaderTabs
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={[
            { id: 'all', label: lang === 'th' ? 'ทุกประเภท' : 'All Types', icon: Layers, count: totalCount },
            { id: 'individual', label: lang === 'th' ? 'บุคคลทั่วไปและสมาชิก' : 'Individual & Member', icon: User, count: individualSlips.length },
            { id: 'corporate', label: lang === 'th' ? 'กลุ่มบริษัททั้งหมด' : 'Corporate Group', icon: Building2, count: corporateSlips.length },
            { id: 'corporate_pay_later', label: lang === 'th' ? 'กลุ่มรอชำระเงิน' : 'Corporate Pay Later', icon: CreditCard, count: corporatePayLaterSlips.length },
          ]}
        />
      </AdminPageHeader>

      {/* สรุปสถานะในหมวดที่เลือก กดเพื่อกรอง */}
      <StatGrid cols={5}>
        <StatCard
          label={lang === 'th' ? 'ทั้งหมดในหมวดนี้' : 'All in category'}
          value={categoryTotalCount}
          icon={Layers}
          tone="blue"
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <StatCard
          label={lang === 'th' ? 'รอตรวจสอบ' : 'Pending review'}
          value={categoryPendingCount}
          icon={Clock}
          tone="amber"
          active={statusFilter === 'pending'}
          onClick={() => setStatusFilter('pending')}
        />
        <StatCard
          label={lang === 'th' ? 'รอชำระเงิน' : 'Pay later'}
          value={categoryPayLaterCount}
          icon={CreditCard}
          tone="violet"
          active={statusFilter === 'pay_later'}
          onClick={() => setStatusFilter('pay_later')}
        />
        <StatCard
          label={lang === 'th' ? 'อนุมัติแล้ว' : 'Approved'}
          value={categoryApprovedCount}
          icon={CheckCircle2}
          tone="green"
          active={statusFilter === 'approved'}
          onClick={() => setStatusFilter('approved')}
        />
        <StatCard
          label={lang === 'th' ? 'ปฏิเสธหรือรอแก้ไข' : 'Rejected'}
          value={categoryRejectedCount}
          icon={XCircle}
          tone="rose"
          active={statusFilter === 'rejected'}
          onClick={() => setStatusFilter('rejected')}
        />
      </StatGrid>

      <Toolbar>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={
            lang === 'th'
              ? 'ค้นหาชื่อ, เลขสมาชิก, เลขอ้างอิง, รหัสบัตร, สังกัด...'
              : 'Search by name, member no, ref, ticket code, hospital...'
          }
        />
        <ToolbarGroup>
          <FilterSelect
            value={activeMeetingFilter}
            onChange={setMeetingFilter}
            icon={CalendarDays}
            label={lang === 'th' ? 'รอบประชุม' : 'Meeting'}
            className="w-full sm:w-72"
            options={[
              { value: 'all', label: lang === 'th' ? 'ทุกรอบประชุม' : 'All meetings' },
              ...meetingOptions,
            ]}
          />
          <span className="text-xs font-semibold text-slate-500">
            {lang === 'th' ? `แสดง ${filteredSlips.length} รายการ` : `${filteredSlips.length} items`}
          </span>
          <Btn
            variant="soft"
            icon={Download}
            loading={Boolean(bulkDownload)}
            onClick={() => downloadSlipsZip(filteredSlips)}
            disabled={filteredSlips.length === 0}
            title={lang === 'th' ? 'ดาวน์โหลดรูปสลิปทุกรายการตามตัวกรองเป็นไฟล์ ZIP' : 'Download all slips in this list as ZIP'}
          >
            {bulkDownload
              ? `${bulkDownload.done}/${bulkDownload.total}`
              : lang === 'th'
                ? 'ดาวน์โหลดสลิป'
                : 'Download slips'}
          </Btn>
        </ToolbarGroup>
      </Toolbar>

      {/* Slip Cards List */}
      <div className="space-y-3">
        {filteredSlips.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300">
            <EmptyState
              icon={Receipt}
              title={lang === 'th' ? 'ไม่พบข้อมูลสลิปตามเงื่อนไข' : 'No slip records found'}
              description={lang === 'th' ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ' : 'Try adjusting your search query or filter'}
            />
          </div>
        ) : (
          paginatedSlips.map((slip) => (
            <div
              key={slip.id}
              onClick={() => setSelectedSlip(slip)}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col overflow-hidden"
            >
              <div className="p-4 sm:p-5 space-y-3">
              {/* Header: รูปสลิป / ชื่อและสถานะ / ยอดเงิน */}
              <div className="flex items-start gap-3 sm:gap-3.5">
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
                    isPdfSlipUrl(slip.slipUrl) ? (
                      <div className="flex flex-col items-center justify-center w-full h-full bg-rose-50 text-rose-600">
                        <FileText className="w-5 h-5" />
                        <span className="text-[8px] font-black leading-tight mt-0.5">PDF</span>
                      </div>
                    ) : (
                      <>
                        <FileText className="w-5 h-5 text-slate-400 absolute" />
                        <img
                          src={slip.slipUrl}
                          alt="Slip Thumbnail"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200 relative bg-slate-100"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      </>
                    )
                  ) :slip.slipUrl === 'PAY_LATER' || slip.slipUrl === 'pay_later_pending' ? (
                    <div className="flex flex-col items-center justify-center p-1 text-center bg-amber-50 text-amber-700 w-full h-full">
                      <Clock className="w-4 h-4 text-amber-500 mb-0.5" />
                      <span className="text-[8px] font-bold leading-tight">ชำระภายหลัง</span>
                    </div>
                  ) : (
                    <Receipt className="w-5 h-5 text-slate-400" />
                  )}
                  {/* Small corner status badge */}
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-tl-lg flex items-center justify-center ${slip.status === 'approved'
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
                <div className="flex-1 space-y-1.5 min-w-0">
                  {/* Row 1: Name & Ticket Code */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                      {slip.isGroupMembership || slip.isGroupConference || slip.groupPayload || slip.ticketCode?.startsWith('MEMGRP') || slip.ticketCode?.startsWith('GRP-')
                        ? (slip.companyName || (lang === 'th' ? slip.nameTh : slip.nameEn || slip.nameTh))
                        : (lang === 'th' ? slip.nameTh : slip.nameEn || slip.nameTh)}
                    </h3>

                    {slip.nameEn && !slip.isGroupMembership && !slip.isGroupConference && !slip.ticketCode?.startsWith('MEMGRP') && !slip.ticketCode?.startsWith('GRP-') && (
                      <span className="text-xs text-slate-500 font-medium">
                        ({slip.nameEn})
                      </span>
                    )}

                    <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-mono tracking-wide">
                      {slip.ticketCode}
                    </span>
                  </div>

                  {/* Row 2: Status & Essential Badges directly UNDER the name */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {/* Primary Approval / Payment Status */}
                    {renderSlipStatusBadge(slip, lang)}

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
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-2xs ${isMemberGroup
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

                    {/* Attendance Format Badge — รายบุคคลเท่านั้น (กลุ่มแสดงรายคนในหน้ารายละเอียด) */}
                    {!slip.isMembershipRegistration && !slip.isGroupMembership && !slip.isGroupConference && !slip.ticketCode?.startsWith('GRP-') && !slip.ticketCode?.startsWith('MEMGRP') && (() => {
                      const isOnline = (slip.attendanceType || slip.guestPayload?.attendanceType) === 'online';
                      return (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-2xs ${isOnline
                          ? 'bg-violet-50 text-violet-800 border-violet-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                          {isOnline ? <Monitor className="w-3 h-3 text-violet-600" /> : <MapPin className="w-3 h-3 text-amber-600" />}
                          <span>{isOnline ? (lang === 'th' ? 'ออนไลน์' : 'Online') : (lang === 'th' ? 'ออนไซต์' : 'Onsite')}</span>
                        </span>
                      );
                    })()}

                    {isFellowSlip(slip) && (
                      <span className="text-[10px] font-black bg-violet-600 text-white px-2 py-0.5 rounded-md shadow-2xs">
                        Fellow
                      </span>
                    )}

                    {/* Applied Coupon Badge (ข้อ 4) */}
                    {(slip.couponCode || slip.couponInfo?.code) && (
                      <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1 shadow-2xs">
                        <span>🎟️ คูปอง: {slip.couponCode || slip.couponInfo?.code}</span>
                        {(() => {
                          const effDisc = (() => {
                            const attendees = slip.groupPayload?.attendees;
                            if (Array.isArray(attendees) && attendees.length > 0) {
                              const sumAtt = attendees.reduce((sum: number, att: any) => sum + getGroupAttendeeDiscount(att, slip), 0);
                              return Math.max(slip.discountTotal || 0, sumAtt, Number(slip.groupPayload?.discountAmount) || 0);
                            }
                            return slip.discountTotal || 0;
                          })();
                          if (effDisc > 0) {
                            return (
                              <span className="text-emerald-700 font-black font-mono">
                                (-฿{effDisc.toLocaleString()})
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </span>
                    )}
                  </div>

                </div>

                <div className="shrink-0 text-right pl-1">
                  <p className="text-[10px] text-slate-400 font-bold">
                    {lang === 'th' ? 'ยอดเงินที่ชำระ' : 'Amount'}
                  </p>
                  <p className="text-base sm:text-xl font-black text-slate-900 leading-tight whitespace-nowrap">
                    ฿{slip.amount.toLocaleString()}
                    <span className="ml-1 text-[11px] font-semibold text-slate-400">THB</span>
                  </p>
                  {(() => {
                    const groupPaid = parseSlipActivities(slip.selectedActivities)
                      .reduce((sum, a) => sum + (a.paidByGroup ? Number(a.paidByGroup.price || a.price || 0) : 0), 0);
                    if (groupPaid <= 0) return null;
                    return (
                      <p className="text-[10px] font-bold text-teal-700 whitespace-nowrap">
                        {lang === 'th' ? `+ ฿${groupPaid.toLocaleString()} ชำระโดยบริษัท` : `+ ฿${groupPaid.toLocaleString()} paid by company`}
                      </p>
                    );
                  })()}
                </div>
              </div>

              {/* Body: รายละเอียด / รายการที่ลงทะเบียน / ข้อมูลการโอน */}
              <div className="space-y-2 sm:pl-[4.375rem] min-w-0">
                  {/* Row 3: Meta Info (ธนาคาร, ชื่องานประชุม, ตำแหน่ง, หน่วยงานบุคคล) */}
                  <div className="flex items-center gap-x-3 gap-y-1 text-xs text-slate-600 flex-wrap">
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
                    {slip.position && !slip.isGroupMembership && !slip.isGroupConference && !slip.ticketCode?.startsWith('GRP-') && !slip.ticketCode?.startsWith('MEMGRP') && (
                      <>
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {slip.position}
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
                        <div className="flex flex-wrap items-center gap-1.5">
                          {acts.map((act, i) => {
                            const rawPrice = act.price !== undefined ? Number(act.price) : 0;
                            const effectivePrice = rawPrice > 0 ? rawPrice : Number(slip.amount || 0);

                            if (act.paidByGroup) {
                              const by = act.paidByGroup;
                              return (
                                <span
                                  key={act.id || i}
                                  title={lang === 'th'
                                    ? `ยอดนี้ชำระในบิลกลุ่ม ${by.ticketCode} ไม่รวมในยอดเงินของรายการนี้`
                                    : `Paid in group bill ${by.ticketCode}, not included in this slip's amount`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-teal-50 text-teal-900 border border-dashed border-teal-400"
                                >
                                  <Building2 className="w-3 h-3 shrink-0 text-teal-600" />
                                  <span>{act.name}</span>
                                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border font-mono text-teal-700 bg-white border-teal-200">
                                    ฿{(by.price || rawPrice).toLocaleString()}
                                  </span>
                                  <span className="text-[10px] font-semibold text-teal-700">
                                    {lang === 'th' ? 'ชำระโดย' : 'Paid by'} {by.companyName || (lang === 'th' ? 'บริษัท' : 'company')}
                                    {by.ticketCode && <span className="font-mono"> · {by.ticketCode}</span>}
                                  </span>
                                </span>
                              );
                            }

                            return (
                              <span
                                key={act.id || i}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-2xs ${act.type === 'format_change' || slip.isFormatChange
                                    ? 'bg-amber-50 text-amber-950 border border-amber-300 ring-1 ring-amber-400/30'
                                    : act.type === 'membership_registration' || act.type === 'membership_group_registration'
                                      ? 'bg-purple-50 text-purple-900 border border-purple-200'
                                      : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                                  }`}
                              >
                                <BookOpen className={`w-3 h-3 shrink-0 ${act.type === 'format_change' || slip.isFormatChange
                                    ? 'text-amber-600'
                                    : act.type === 'membership_registration' || act.type === 'membership_group_registration'
                                      ? 'text-purple-600'
                                      : 'text-indigo-600'
                                  }`} />
                                <span>{act.name}</span>
                                {effectivePrice > 0 ? (
                                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border font-mono ${act.type === 'format_change' || slip.isFormatChange
                                      ? 'text-amber-800 bg-white border-amber-200'
                                      : act.type === 'membership_registration' || act.type === 'membership_group_registration'
                                        ? 'text-purple-700 bg-white border-purple-100'
                                        : 'text-indigo-700 bg-white border-indigo-100'
                                    }`}>
                                    ฿{effectivePrice.toLocaleString()}
                                  </span>
                                ) : act.price !== undefined ? (
                                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border font-mono ${act.type === 'format_change' || slip.isFormatChange
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

                  <p className="flex flex-wrap gap-x-2 text-[11px] text-slate-400 font-normal">
                    <span>{lang === 'th' ? 'วันที่โอน' : 'Transfer'}: {slip.transferDate || '-'} {slip.transferTime || ''}</span>
                    <span className="text-slate-300">|</span>
                    <span className="break-all">Ref: {slip.refNo}</span>
                  </p>
                </div>
              </div>

              {/* Action Bar: เครื่องมือรอง (ซ้าย) / การตัดสินใจอนุมัติ (ขวา) */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-5 py-3 bg-slate-50/70 border-t border-slate-100 cursor-default"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  {slip.isGroupMembership || slip.isGroupConference || slip.groupPayload?.attendees || slip.groupPayload?.applicants || slip.ticketCode?.startsWith('MEMGRP') || slip.ticketCode?.startsWith('GRP-') ? (
                    <button
                      onClick={() => setSelectedSlip(slip)}
                      className={CARD_ACTION_BTN}
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
                      onClick={() => setSelectedSlip(slip)}
                      className={CARD_ACTION_BTN}
                      title={lang === 'th' ? 'ดูหลักฐานสลิป' : 'View Slip'}
                      aria-label={lang === 'th' ? 'ดูหลักฐานสลิป' : 'View Slip'}
                    >
                      <Eye className="w-4 h-4 text-[#0026b3]" />
                      <span className="hidden sm:inline">{lang === 'th' ? 'ดูสลิป' : 'View'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedSlip(slip)}
                      className={CARD_ACTION_BTN}
                      title={lang === 'th' ? 'ดูรายละเอียด' : 'View Details'}
                      aria-label={lang === 'th' ? 'ดูรายละเอียด' : 'View Details'}
                    >
                      <Eye className="w-4 h-4 text-slate-500" />
                      <span className="hidden sm:inline">{lang === 'th' ? 'ดูรายละเอียด' : 'Details'}</span>
                    </button>
                  )}

                  {isDownloadableSlipUrl(slip.slipUrl) && (
                    <button
                      onClick={(e) => downloadSlip(slip.id, e)}
                      disabled={downloadingSlipId === slip.id}
                      className={CARD_ACTION_BTN}
                      title={lang === 'th' ? 'ดาวน์โหลดรูปสลิป' : 'Download slip'}
                      aria-label={lang === 'th' ? 'ดาวน์โหลดรูปสลิป' : 'Download slip'}
                    >
                      {downloadingSlipId === slip.id
                        ? <Loader2 className="w-4 h-4 text-[#0026b3] animate-spin" />
                        : <Download className="w-4 h-4 text-[#0026b3]" />}
                      <span className="hidden sm:inline">{lang === 'th' ? 'ดาวน์โหลด' : 'Download'}</span>
                    </button>
                  )}

                  {(slip.status === 'pending' || slip.status === 'approved') && (
                    <button
                      onClick={(e) => openAttachModal(slip, e)}
                      disabled={isProcessing}
                      className={CARD_ACTION_BTN}
                      title={lang === 'th' ? 'แนบสลิปแทนผู้ลงทะเบียน' : 'Attach slip on behalf of registrant'}
                      aria-label={lang === 'th' ? 'แนบสลิปแทนผู้ลงทะเบียน' : 'Attach slip on behalf of registrant'}
                    >
                      <Upload className="w-4 h-4 text-sky-600" />
                      <span className="hidden sm:inline">{slip.adminAttachedSlip || hasActualSlip(slip) ? (lang === 'th' ? 'เปลี่ยนสลิป' : 'Replace Slip') : (lang === 'th' ? 'แนบสลิป' : 'Attach Slip')}</span>
                    </button>
                  )}

                  {canEditFormat(slip) && !slip.isGroupConference && !slip.isMembershipRegistration && (() => {
                    const cardFormat: 'onsite' | 'online' =
                      (slip.attendanceType || slip.guestPayload?.attendanceType) === 'online' ? 'online' : 'onsite';
                    return (
                      <button
                        onClick={() => openFormatEdit(slip, cardFormat)}
                        className={CARD_ACTION_BTN}
                        title={lang === 'th' ? 'แก้ไขรูปแบบการเข้าร่วม' : 'Edit attendance format'}
                        aria-label={lang === 'th' ? 'แก้ไขรูปแบบการเข้าร่วม' : 'Edit attendance format'}
                      >
                        <Pencil className={`w-4 h-4 ${cardFormat === 'online' ? 'text-violet-600' : 'text-amber-600'}`} />
                        <span className="hidden sm:inline">{lang === 'th' ? 'แก้รูปแบบ' : 'Format'}</span>
                      </button>
                    );
                  })()}
                </div>

                {canApproveSlip(slip) && (
                  <div className="flex items-center gap-1.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/70">
                    {slip.status === 'pending' && (
                      <button
                        onClick={(e) => openRejectModal(slip.id, e)}
                        disabled={isProcessing}
                        className="h-9 px-3 flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 disabled:opacity-60"
                        title={lang === 'th' ? 'ปฏิเสธ' : 'Reject'}
                      >
                        <X className="w-4 h-4" />
                        <span>{lang === 'th' ? 'ปฏิเสธ' : 'Reject'}</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => handleApprove(slip.id, e)}
                      disabled={isProcessing}
                      className={`h-9 px-4 flex-[2] sm:flex-none inline-flex items-center justify-center gap-1.5 text-[#061d08] rounded-xl text-xs font-black transition cursor-pointer shadow-xs active:scale-95 ${processingSlipId === slip.id
                          ? 'bg-emerald-300 opacity-90 cursor-wait'
                          : 'bg-[#4ade80] hover:bg-[#3ec424]'
                        }`}
                      title={
                        slip.adminAttachedSlip
                          ? (lang === 'th' ? 'อนุมัติการชำระเงิน' : 'Approve Payment')
                          : (lang === 'th' ? 'อนุมัติ' : 'Approve')
                      }
                    >
                      {processingSlipId === slip.id ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin text-[#061d08]" />
                          <span>{lang === 'th' ? 'กำลังอนุมัติ...' : 'Approving...'}</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>
                            {slip.adminAttachedSlip
                              ? (lang === 'th' ? 'อนุมัติการชำระเงิน' : 'Approve Payment')
                              : (lang === 'th' ? 'อนุมัติ' : 'Approve')}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}
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
                      {selectedSlip.isGroupMembership || (Array.isArray(selectedSlip.groupPayload?.applicants) && selectedSlip.groupPayload.applicants.length > 0) || selectedSlip.ticketCode?.startsWith('MEMGRP')
                        ? (lang === 'th' ? 'คำขอสมัครสมาชิกแบบกลุ่ม & สลิปโอนเงิน' : 'Group Membership Application & Slip')
                        : selectedSlip.isGroupConference || (Array.isArray(selectedSlip.groupPayload?.attendees) && selectedSlip.groupPayload.attendees.length > 0) || selectedSlip.ticketCode?.startsWith('GRP-')
                          ? (lang === 'th' ? 'คำขอลงทะเบียนประชุมแบบกลุ่ม & สลิปโอนเงิน' : 'Group Conference Registration & Slip')
                          : selectedSlip.isMembershipRegistration
                            ? (lang === 'th' ? 'คำขอสมัครสมาชิกสมาคม & สลิปโอนเงิน' : 'Membership Application & Slip')
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
                {selectedSlip.isAddOn && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 space-y-1.5">
                    <p className="font-black">
                      {lang === 'th'
                        ? `ลงทะเบียนเพิ่มเติมของรายการ ${selectedSlip.originalTicketCode || selectedSlip.originalSlipId || '-'}`
                        : `Add-on for registration ${selectedSlip.originalTicketCode || selectedSlip.originalSlipId || '-'}`}
                    </p>
                    <p className="font-medium text-emerald-800">
                      {lang === 'th'
                        ? 'เมื่ออนุมัติ ระบบจะรวมกิจกรรมและยอดเงินเข้ากับรายการลงทะเบียนเดิม และเพิ่มรายการในใบเสร็จเดิม'
                        : 'On approval, activities and amount are merged into the original registration and its receipt.'}
                    </p>
                    {selectedSlip.originalStatus && selectedSlip.originalStatus !== 'approved' && (
                      <p className="font-bold text-amber-700">
                        {lang === 'th'
                          ? 'รายการเดิมยังไม่ได้รับการอนุมัติ เมื่อกดอนุมัติ ระบบจะถามเพื่ออนุมัติรายการเดิมพร้อมกัน'
                          : 'The original registration is not approved yet. Approving will offer to approve both.'}
                      </p>
                    )}
                    {selectedSlip.originalSlipId && slips.some((s) => s.id === selectedSlip.originalSlipId) && (
                      <button
                        type="button"
                        onClick={() => setSelectedSlip(slips.find((s) => s.id === selectedSlip.originalSlipId) || null)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0026b3] hover:underline cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {lang === 'th' ? 'เปิดรายการเดิม' : 'Open original registration'}
                      </button>
                    )}
                    {Array.isArray(selectedSlip.originalActivities) && selectedSlip.originalActivities.length > 0 && (
                      <p className="text-emerald-700">
                        {lang === 'th' ? 'ลงทะเบียนไว้แล้ว: ' : 'Already registered: '}
                        {selectedSlip.originalActivities.map((a) => a.name).filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                )}
                {!selectedSlip.isAddOn && (selectedSlip.pendingAddOnCount || 0) > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                    {lang === 'th'
                      ? `มีรายการลงทะเบียนเพิ่มเติมของรายการนี้รอตรวจสอบ ${selectedSlip.pendingAddOnCount} รายการ หลังอนุมัติรายการนี้แล้ว กรุณาตรวจสอบรายการเพิ่มเติมต่อ`
                      : `${selectedSlip.pendingAddOnCount} add-on payment(s) for this registration are awaiting review.`}
                  </div>
                )}
                {Array.isArray(selectedSlip.addOnPayments) && selectedSlip.addOnPayments.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
                    <p className="font-black text-slate-800">
                      {lang === 'th' ? 'ประวัติการลงทะเบียนเพิ่มเติมที่รวมแล้ว' : 'Merged add-on payments'}
                    </p>
                    {selectedSlip.addOnPayments.map((p) => (
                      <div key={p.slipId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">
                            {p.activities.map((a) => a.name).filter(Boolean).join(', ') || p.ticketCode}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            ฿{Number(p.amount || 0).toLocaleString()}
                            {p.transferDate ? ` · ${p.transferDate}${p.transferTime ? ` ${p.transferTime}` : ''}` : ''}
                            {p.reviewedBy ? ` · ${lang === 'th' ? 'อนุมัติโดย' : 'by'} ${p.reviewedBy}` : ''}
                          </p>
                        </div>
                        {p.slipUrl && /^(https?:|\/)/.test(p.slipUrl) && (
                          <a
                            href={p.slipUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-[#0026b3] hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {lang === 'th' ? 'ดูสลิป' : 'View slip'}
                          </a>
                        )}
                        {isDownloadableSlipUrl(p.slipUrl) && (
                          <button
                            type="button"
                            onClick={(e) => downloadSlip(p.slipId, e)}
                            disabled={downloadingSlipId === p.slipId}
                            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-[#0026b3] hover:underline cursor-pointer disabled:opacity-60"
                          >
                            {downloadingSlipId === p.slipId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            {lang === 'th' ? 'ดาวน์โหลด' : 'Download'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Slip Viewport - Compact Display */}
                {selectedSlip.slipUrl && selectedSlip.slipUrl !== 'PAY_LATER' && selectedSlip.slipUrl !== 'pay_later_pending' && selectedSlip.slipUrl !== '/placeholder-slip.png' ? (
                  <div className="bg-slate-950 rounded-2xl p-2.5 flex flex-col items-center justify-center border border-slate-800/80">
                    {isPdfSlipUrl(selectedSlip.slipUrl) ? (
                      <iframe
                        src={selectedSlip.slipUrl}
                        title="Bank Slip PDF"
                        className="w-full h-72 sm:h-80 rounded-lg bg-white"
                      />
                    ) : (
                      <img
                        src={selectedSlip.slipUrl}
                        alt="Bank Slip"
                        className="max-h-56 sm:max-h-64 w-auto object-contain rounded-lg shadow-md"
                      />
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <a
                        href={selectedSlip.slipUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition flex items-center gap-1 backdrop-blur-md cursor-pointer border border-white/15 active:scale-95"
                      >
                        <ExternalLink className="w-3 h-3 text-[#4ade80]" />
                        <span>
                          {isPdfSlipUrl(selectedSlip.slipUrl)
                            ? (lang === 'th' ? 'เปิดไฟล์ PDF ในแท็บใหม่' : 'Open PDF in new tab')
                            : (lang === 'th' ? 'เปิดดูภาพขนาดเต็ม' : 'Open full size')}
                        </span>
                      </a>
                      {isDownloadableSlipUrl(selectedSlip.slipUrl) && (
                        <button
                          type="button"
                          onClick={(e) => downloadSlip(selectedSlip.id, e)}
                          disabled={downloadingSlipId === selectedSlip.id}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition flex items-center gap-1 backdrop-blur-md cursor-pointer border border-white/15 active:scale-95 disabled:opacity-60"
                        >
                          {downloadingSlipId === selectedSlip.id
                            ? <Loader2 className="w-3 h-3 animate-spin text-[#4ade80]" />
                            : <Download className="w-3 h-3 text-[#4ade80]" />}
                          <span>{lang === 'th' ? 'ดาวน์โหลดสลิป' : 'Download slip'}</span>
                        </button>
                      )}
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

                {/* Admin note on the slip (e.g. attendee list edited after approval) */}
                {selectedSlip.groupPayload?.adminNote && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs sm:text-sm">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>{lang === 'th' ? 'บันทึกจากผู้ดูแลระบบ' : 'Admin Note'}</span>
                    </div>
                    <p className="text-xs text-amber-950 leading-relaxed whitespace-pre-line">
                      {selectedSlip.groupPayload.adminNote}
                    </p>
                    {Array.isArray(selectedSlip.groupPayload.removedAttendees) &&
                      selectedSlip.groupPayload.removedAttendees.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <p className="text-[11px] font-bold text-amber-800">
                            {lang === 'th'
                              ? `ลบรายชื่อออก ${selectedSlip.groupPayload.removedAttendees.length} ท่าน`
                              : `Removed attendees (${selectedSlip.groupPayload.removedAttendees.length})`}
                          </p>
                          {selectedSlip.groupPayload.removedAttendees.map((att: any, idx: number) => {
                            const hasAmounts = typeof att.amountBefore === 'number' && typeof att.amountAfter === 'number';
                            return (
                              <div key={idx} className="bg-white/80 border border-amber-200 rounded-xl p-2.5 space-y-1.5">
                                <div className="text-[11px] text-amber-950">
                                  <span className="font-bold">{idx + 1}. {att.nameTh || att.nameEn || '-'}</span>
                                  {att.memberNo ? (
                                    <span className="text-amber-700"> • {lang === 'th' ? 'สมาชิก' : 'Member'} {att.memberNo}</span>
                                  ) : null}
                                  {typeof att.price === 'number' && (
                                    <span className="text-amber-700"> • ฿{att.price.toLocaleString()}</span>
                                  )}
                                  {att.removedReason && (
                                    <span className="block text-amber-700 mt-0.5">{att.removedReason}</span>
                                  )}
                                </div>
                                {(Number(att.couponRightsReturned) > 0 || (Array.isArray(att.seatsReturned) && att.seatsReturned.length > 0)) && (
                                  <div className="text-[11px] text-emerald-800 space-y-0.5">
                                    {Number(att.couponRightsReturned) > 0 && (
                                      <p>
                                        {lang === 'th'
                                          ? `• คืนสิทธิ์คูปองบริษัท ${att.couponRightsReturned} สิทธิ์${typeof att.couponRightsRemaining === 'number' ? ` คงเหลือ ${att.couponRightsRemaining} สิทธิ์` : ''}`
                                          : `• Returned ${att.couponRightsReturned} coupon right${typeof att.couponRightsRemaining === 'number' ? `, ${att.couponRightsRemaining} remaining` : ''}`}
                                      </p>
                                    )}
                                    {Array.isArray(att.seatsReturned) &&
                                      att.seatsReturned.map((seat: any, sIdx: number) => (
                                        <p key={sIdx}>
                                          {lang === 'th'
                                            ? `• คืนที่นั่ง ${seat.name} ${seat.count} ที่นั่ง`
                                            : `• Returned ${seat.count} seat of ${seat.name}`}
                                        </p>
                                      ))}
                                  </div>
                                )}
                                {hasAmounts && (
                                  <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                                    <div>
                                      <span className="block text-[10px] font-bold text-amber-700">
                                        {lang === 'th' ? 'ยอดเดิม' : 'Original total'}
                                      </span>
                                      <span className="text-lg font-black text-amber-950 font-mono leading-none">
                                        ฿{att.amountBefore.toLocaleString()}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="block text-[10px] font-bold text-slate-500">
                                        {lang === 'th' ? 'ยอดหลังลบรายชื่อ' : 'Total after removal'}
                                      </span>
                                      <span className="text-xs font-bold text-slate-600 font-mono">
                                        ฿{att.amountAfter.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
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
                {Boolean(selectedSlip.isGroupMembership || (Array.isArray(selectedSlip.groupPayload?.applicants) && selectedSlip.groupPayload.applicants.length > 0) || selectedSlip.ticketCode?.startsWith('MEMGRP')) &&
                  Array.isArray(selectedSlip.groupPayload?.applicants) &&
                  selectedSlip.groupPayload.applicants.length > 0 && (
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

                    {selectedSlip.status === 'pending' && !hasActualSlip(selectedSlip) && isRegisteredAsPayLater(selectedSlip) && (
                      <p className="text-[11px] text-indigo-900 bg-indigo-100/80 p-3 rounded-xl font-medium leading-relaxed border border-indigo-200">
                        🏢 เมื่อกด <strong>&ldquo;อนุมัติสิทธิ์&rdquo;</strong> ระบบจะทำการอนุมัติและสร้างบัญชีสมาชิกให้กับผู้สมัครทุกคนในกลุ่ม พร้อมออกเลขที่สมาชิกอัตโนมัติ โดยสถานะจะเปลี่ยนเป็น <strong>&ldquo;อนุมัติสิทธิ์แล้ว - รอชำระเงิน&rdquo;</strong> เพื่อให้บริษัทดำเนินการแนบสลิปเข้ามาในภายหลัง
                      </p>
                    )}
                    {selectedSlip.status === 'pending' && hasActualSlip(selectedSlip) && (
                      <p className="text-[11px] text-emerald-950 bg-emerald-100/80 p-3 rounded-xl font-medium leading-relaxed border border-emerald-300">
                        💳 บริษัทได้แนบหลักฐานสลิปโอนเงินเข้ามาแล้ว เมื่อกด <strong>&ldquo;อนุมัติการชำระเงิน&rdquo;</strong> ระบบจะทำการยืนยันการชำระเงินและออกใบเสร็จรับเงินสมบูรณ์
                      </p>
                    )}
                  </div>
                )}

                {/* Corporate / Group Conference Attendees Detailed List (If Corporate Group Conference Application) */}
                {Boolean(selectedSlip.isGroupConference || (Array.isArray(selectedSlip.groupPayload?.attendees) && selectedSlip.groupPayload.attendees.length > 0) || selectedSlip.ticketCode?.startsWith('GRP-')) &&
                  Array.isArray(selectedSlip.groupPayload?.attendees) &&
                  selectedSlip.groupPayload.attendees.length > 0 && (
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

                                // ส่วนลดคูปองของผู้ลงทะเบียนรายนี้ (ผู้ลงเพิ่มเติมไม่ได้ใช้สิทธิ์คูปองของบริษัท)
                                const isAddOnAttendee = Boolean(att.isAddOn);
                                const attDiscount = getGroupAttendeeDiscount(att, selectedSlip);

                                const hasDiscount = attDiscount > 0;
                                const originalPrice = Number(att.originalTotal || att.subtotal || ((Number(att.price) || 0) + attDiscount));
                                const netPrice = hasDiscount && originalPrice > 0 ? Math.max(0, originalPrice - attDiscount) : (att.price !== undefined ? Number(att.price) : (Number(att.subtotal) || 0));

                                return (
                                  <div
                                    key={idx}
                                    className={`bg-white border rounded-2xl p-3 sm:p-3.5 text-xs text-slate-800 shadow-2xs transition flex flex-col sm:flex-row items-start justify-between gap-3 ${hasDiscount ? 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/20' : 'border-sky-100 hover:border-sky-300'
                                      }`}
                                  >
                                    <div className="min-w-0 flex-1 w-full space-y-2">
                                      {/* แถว 1: ลำดับ ชื่อ และปุ่มจัดการ */}
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2 min-w-0">
                                          <span className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${hasDiscount ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-[#0026b3]'}`}>
                                            {idx + 1}
                                          </span>
                                          <div className="min-w-0">
                                            <div className="text-sm font-extrabold text-slate-900 leading-snug break-words">{attName}</div>
                                            {att.nameEn && att.nameTh && (
                                              <div className="text-[11px] text-slate-500 font-medium leading-snug break-words">{att.nameEn}</div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {canEditGroupAttendees(selectedSlip) && !isAddOnAttendee && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => openAttendeeEditor(selectedSlip, 'update', idx, att)}
                                                className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-white hover:bg-sky-50 text-slate-500 hover:text-[#0026b3] border border-slate-200 hover:border-sky-300 transition cursor-pointer"
                                                title={lang === 'th' ? 'แก้ไขข้อมูลผู้ลงทะเบียน' : 'Edit attendee'}
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                              </button>
                                              {totalAttendees.length > 1 && (
                                                <button
                                                  type="button"
                                                  onClick={() => openAttendeeEditor(selectedSlip, 'delete', idx, att)}
                                                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-300 transition cursor-pointer"
                                                  title={lang === 'th' ? 'นำออกจากรายการ' : 'Remove attendee'}
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              )}
                                            </>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setViewingAttendee({
                                                ...att,
                                                mobile: att.mobile || att.phone || att.tel || '',
                                                phone: att.phone || att.mobile || att.tel || '',
                                                meetingName: selectedSlip.meetingName,
                                                companyName: selectedSlip.companyName || selectedSlip.groupPayload.companyName,
                                                ticketCode: selectedSlip.ticketCode,
                                                submittedAt: selectedSlip.createdAt,
                                                couponCode: selectedSlip.couponCode || selectedSlip.couponInfo?.code,
                                                couponInfo: selectedSlip.couponInfo,
                                                attDiscount,
                                                hasDiscount,
                                                originalPrice,
                                                netPrice,
                                              })
                                            }
                                            className="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-[11px] transition cursor-pointer whitespace-nowrap"
                                            title="ดูรายละเอียดข้อมูลผู้ลงทะเบียน"
                                          >
                                            <Eye className="w-3.5 h-3.5 text-[#0026b3]" />
                                            <span>{lang === 'th' ? 'ดูทั้งหมด' : 'View'}</span>
                                          </button>
                                        </div>
                                      </div>

                                      {/* แถว 2: ป้ายสถานะเรียงแถวเดียว */}
                                      <div className="pl-8 flex flex-wrap items-center gap-1.5">
                                        {isAttMember ? (
                                          <span className="text-[10px] font-bold bg-blue-50 text-[#0026b3] border border-blue-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                                            {att.memberNo ? `สมาชิก #${att.memberNo}` : 'สมาชิกสมาคม'}
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                                            บุคคลทั่วไป
                                          </span>
                                        )}

                                        {isFellowSlip(selectedSlip, att) && (
                                          <span className="text-[10px] font-black bg-violet-600 text-white px-2 py-0.5 rounded-md whitespace-nowrap">
                                            Fellow
                                          </span>
                                        )}

                                        {(() => {
                                          let fmt = att.selectedFormat || att.attendanceType || att.format || att.selectedPackage;
                                          if (fmt === 'both') fmt = att.attendanceType || 'onsite';
                                          const editable = selectedSlip.isGroupConference && canEditFormat(selectedSlip);
                                          if (!fmt && !editable) return null;
                                          const attFormat: 'onsite' | 'online' = fmt === 'online' ? 'online' : 'onsite';
                                          const label = attFormat === 'online' ? (lang === 'th' ? 'ออนไลน์' : 'Online') : (lang === 'th' ? 'ออนไซต์' : 'Onsite');
                                          const cls = `inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${attFormat === 'online' ? 'bg-violet-50 text-violet-800 border-violet-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`;
                                          if (!editable) {
                                            return (
                                              <span className={cls}>
                                                {attFormat === 'online' ? <Monitor className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                                {label}
                                              </span>
                                            );
                                          }
                                          return (
                                            <button
                                              type="button"
                                              onClick={() => openFormatEdit(selectedSlip, attFormat, idx, attName)}
                                              title={lang === 'th' ? 'แก้ไขรูปแบบการเข้าร่วม' : 'Edit attendance format'}
                                              className={`${cls} cursor-pointer hover:brightness-95`}
                                            >
                                              {attFormat === 'online' ? <Monitor className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                              {label}
                                              <Pencil className="w-2.5 h-2.5 opacity-60" />
                                            </button>
                                          );
                                        })()}

                                        {isAddOnAttendee && (
                                          <span
                                            className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md whitespace-nowrap"
                                            title={Array.isArray(att.registeredActivities) ? `ลงทะเบียนไว้แล้ว: ${att.registeredActivities.map((r: any) => r.name).join(', ')}` : undefined}
                                          >
                                            {`ลงเพิ่ม${att.addOnOriginalTicketCode ? ` · รายการเดิม ${att.addOnOriginalTicketCode}` : ''}`}
                                          </span>
                                        )}
                                      </div>

                                      {/* แถว 3: ข้อมูลติดต่อ */}
                                      <div className="pl-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                                        <span className="inline-flex items-center gap-1 text-sky-700 font-mono font-medium break-all">
                                          <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                                          {att.email || att.mobile || '-'}
                                        </span>
                                        {att.workplace && att.workplace !== selectedSlip.companyName && (
                                          <span className="inline-flex items-center gap-1 min-w-0">
                                            <Building2 className="w-3 h-3 shrink-0 text-slate-400" />
                                            <span className="truncate max-w-[220px]">{att.workplace}</span>
                                          </span>
                                        )}
                                        {att.dietaryPreference && (
                                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 whitespace-nowrap">
                                            {att.dietaryPreference}
                                          </span>
                                        )}
                                      </div>

                                      {/* แถว 4: รายการที่ลงทะเบียน และยอดเงิน */}
                                      {(attActivities.length > 0 || originalPrice > 0) && (
                                        <div className="ml-8 pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                            {attActivities.map((act, actIdx) => {
                                              const isMainProgram = act.name.toLowerCase().includes('main') ||
                                                act.name.includes('การประชุมหลัก') ||
                                                act.name.includes('Main Program');
                                              const isActDiscounted = hasDiscount && isMainProgram;
                                              return (
                                                <span
                                                  key={actIdx}
                                                  className={`text-[10px] font-bold border px-2 py-1 rounded-lg inline-flex items-center gap-1.5 ${isActDiscounted
                                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                                      : 'bg-sky-50 text-[#0026b3] border-sky-200'
                                                    }`}
                                                >
                                                  <BookOpen className="w-3 h-3 shrink-0" />
                                                  <span className="truncate max-w-[220px]">{act.name}</span>
                                                </span>
                                              );
                                            })}
                                          </div>
                                          {originalPrice > 0 && (
                                            <div className="flex items-baseline gap-1.5 font-mono shrink-0 sm:ml-auto">
                                              {hasDiscount && attDiscount > 0 && (
                                                <span className="line-through text-slate-400 text-[11px]">฿{originalPrice.toLocaleString()}</span>
                                              )}
                                              <span className={`text-sm font-black ${hasDiscount ? 'text-emerald-700' : 'text-slate-900'}`}>
                                                ฿{Number(hasDiscount ? netPrice : originalPrice).toLocaleString()}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Show More / Show Less Toggle (Starts at 2) + admin add attendee */}
                            {(totalAttendees.length > 2 || canEditGroupAttendees(selectedSlip)) && (
                              <div className="pt-1.5 flex flex-wrap justify-center gap-2">
                                {canEditGroupAttendees(selectedSlip) && (
                                  <button
                                    type="button"
                                    onClick={() => openAttendeeEditor(selectedSlip, 'create')}
                                    className="px-4 py-1.5 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                                  >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>{lang === 'th' ? 'เพิ่มผู้ลงทะเบียน' : 'Add Attendee'}</span>
                                  </button>
                                )}
                                {totalAttendees.length > 2 && (
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
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {selectedSlip.status === 'pending' && !hasActualSlip(selectedSlip) && isRegisteredAsPayLater(selectedSlip) && (
                        <p className="text-[11px] text-sky-950 bg-sky-100/80 p-3 rounded-xl font-medium leading-relaxed border border-sky-200">
                          🏢 เมื่อกด <strong>&ldquo;อนุมัติสิทธิ์&rdquo;</strong> ระบบจะทำการอนุมัติสิทธิ์การเข้าร่วมประชุมให้กับผู้ลงทะเบียนทุกคนในกลุ่ม โดยสถานะจะเปลี่ยนเป็น <strong>&ldquo;อนุมัติสิทธิ์แล้ว - รอชำระเงิน&rdquo;</strong>
                        </p>
                      )}
                      {selectedSlip.status === 'pending' && hasActualSlip(selectedSlip) && (
                        <p className="text-[11px] text-emerald-950 bg-emerald-100/80 p-3 rounded-xl font-medium leading-relaxed border border-emerald-300">
                          💳 บริษัทได้แนบหลักฐานสลิปโอนเงินเข้ามาแล้ว เมื่อกด <strong>&ldquo;อนุมัติการชำระเงิน&rdquo;</strong> ระบบจะทำการยืนยันการชำระเงินและออกใบเสร็จรับเงินสมบูรณ์
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
                    <div className="text-right">
                      <span className="font-black text-sm sm:text-base text-slate-900 block">
                        {selectedSlip.companyName || selectedSlip.nameTh}
                      </span>
                      {selectedSlip.nameEn && !selectedSlip.isGroupMembership && !selectedSlip.isGroupConference && !selectedSlip.ticketCode?.startsWith('GRP-') && !selectedSlip.ticketCode?.startsWith('MEMGRP') && (
                        <span className="text-xs text-slate-500 font-medium block">
                          {selectedSlip.nameEn}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ตำแหน่ง (Position) */}
                  {selectedSlip.position && !selectedSlip.isGroupMembership && !selectedSlip.isGroupConference && !selectedSlip.ticketCode?.startsWith('GRP-') && !selectedSlip.ticketCode?.startsWith('MEMGRP') && (
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                      <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                        {lang === 'th' ? 'ตำแหน่ง' : 'Position'}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-slate-800 text-right">
                        {selectedSlip.position}
                      </span>
                    </div>
                  )}

                  {/* รูปแบบการเข้าร่วม */}
                  {(selectedSlip.attendanceType || selectedSlip.guestPayload?.attendanceType || (canEditFormat(selectedSlip) && !selectedSlip.isMembershipRegistration)) && !selectedSlip.isGroupMembership && !selectedSlip.isGroupConference && !selectedSlip.ticketCode?.startsWith('GRP-') && !selectedSlip.ticketCode?.startsWith('MEMGRP') && (() => {
                    const rawFormat = selectedSlip.attendanceType || selectedSlip.guestPayload?.attendanceType;
                    // ไม่มีข้อมูลถือว่าเป็นออนไซต์ ตามค่าเริ่มต้นของฟอร์มลงทะเบียน
                    const currentFormat: 'onsite' | 'online' = rawFormat === 'online' ? 'online' : 'onsite';
                    return (
                      <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                        <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                          {lang === 'th' ? 'รูปแบบการเข้าร่วม' : 'Attendance Type'}
                        </span>
                        <span className="flex items-center justify-end gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-slate-800 text-right">
                            {currentFormat === 'online'
                              ? (lang === 'th' ? 'เข้าร่วมแบบออนไลน์' : 'Online')
                              : (lang === 'th' ? 'เข้าร่วม ณ สถานที่จัดงาน' : 'Onsite')}
                          </span>
                          {canEditFormat(selectedSlip) && (
                            <button
                              type="button"
                              onClick={() => openFormatEdit(selectedSlip, currentFormat)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-[11px] transition cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              {lang === 'th' ? 'แก้ไข' : 'Edit'}
                            </button>
                          )}
                        </span>
                      </div>
                    );
                  })()}

                  {/* สถานะผู้สมัคร */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                    <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                      {lang === 'th' ? 'สถานะผู้สมัคร' : 'Status'}
                    </span>
                    <span
                      className={`font-black text-xs sm:text-sm text-right ${selectedSlip.isGroupConference || selectedSlip.ticketCode?.startsWith('GRP-')
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

                  {/* ข้อกำหนดอาหาร / อาหารที่แพ้ (ถ้ามี) */}
                  {selectedSlip.guestPayload?.dietaryPreference && !selectedSlip.isGroupMembership && !selectedSlip.isGroupConference && (
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                      <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                        {lang === 'th' ? 'ข้อกำหนดอาหาร' : 'Dietary Preference'}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-emerald-700 text-right">
                        🍽️ {selectedSlip.guestPayload.dietaryPreference}
                      </span>
                    </div>
                  )}

                  {selectedSlip.guestPayload?.foodAllergies && !selectedSlip.isGroupMembership && !selectedSlip.isGroupConference && (
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                      <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                        {lang === 'th' ? 'อาหารที่แพ้' : 'Food Allergies'}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-rose-600 text-right">
                        ⚠️ {selectedSlip.guestPayload.foodAllergies}
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
                            {selectedSlip.couponInfo?.discountType === 'free' || !selectedSlip.couponInfo?.discountValue
                              ? '(สิทธิ์ฟรี)'
                              : selectedSlip.couponInfo?.discountValue
                                ? `(ส่วนลด ${selectedSlip.couponInfo.discountValue})`
                                : ''}
                          </span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ส่วนลดที่ได้รับ (ข้อ 3) */}
                  {(() => {
                    const attendees = selectedSlip.groupPayload?.attendees;
                    const effDiscount = Array.isArray(attendees) && attendees.length > 0
                      ? Math.max(
                          selectedSlip.discountTotal || 0,
                          attendees.reduce((sum: number, att: any) => sum + getGroupAttendeeDiscount(att, selectedSlip), 0),
                          Number(selectedSlip.groupPayload?.discountAmount) || 0
                        )
                      : (selectedSlip.discountTotal && selectedSlip.discountTotal > 0)
                        ? selectedSlip.discountTotal
                        : (selectedSlip.couponInfo?.discountType === 'free' || selectedSlip.couponCode ? MAIN_PROGRAM_PRICE : 0);
                    if (effDiscount <= 0) return null;
                    return (
                      <div className="flex items-center justify-between py-1.5 border-b border-slate-200/80 gap-3">
                        <span className="text-slate-500 font-bold text-xs sm:text-sm shrink-0">
                          {lang === 'th' ? 'ส่วนลดที่ได้รับ' : 'Discount Applied'}
                        </span>
                        <span className="font-black font-mono text-sm sm:text-base text-emerald-700 text-right">
                          -฿{effDiscount.toLocaleString()} THB
                        </span>
                      </div>
                    );
                  })()}
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
                              {(() => {
                                const attendees = selectedSlip.groupPayload?.attendees;
                                const effGroupDiscount = (() => {
                                  if (Array.isArray(attendees) && attendees.length > 0) {
                                    const sumAttDiscount = attendees.reduce((sum: number, att: any) => sum + getGroupAttendeeDiscount(att, selectedSlip), 0);
                                    return Math.max(selectedSlip.discountTotal || 0, sumAttDiscount, Number(selectedSlip.groupPayload?.discountAmount) || 0);
                                  }
                                  return (selectedSlip.discountTotal && selectedSlip.discountTotal > 0)
                                    ? selectedSlip.discountTotal
                                    : (selectedSlip.couponInfo?.discountType === 'free' || Boolean(selectedSlip.couponCode) ? attendeesCount * 4000 : 0);
                                })();

                                if (effGroupDiscount > 0) {
                                  return (
                                    <div className="flex items-center gap-1.5 justify-end">
                                      <span className="line-through text-slate-400 font-mono text-xs">
                                        ฿{(selectedSlip.amount + effGroupDiscount).toLocaleString()}
                                      </span>
                                      <span className="font-black text-emerald-700 font-mono text-sm sm:text-base">
                                        ฿{selectedSlip.amount.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">THB</span>
                                      </span>
                                    </div>
                                  );
                                }
                                return (
                                  <span className="font-black text-indigo-700 font-mono text-sm sm:text-base">
                                    ฿{selectedSlip.amount.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">THB</span>
                                  </span>
                                );
                              })()}
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
                              className={`flex items-center justify-between p-3 rounded-xl text-xs shadow-2xs transition ${act.paidByGroup
                                  ? 'bg-teal-50/60 border border-dashed border-teal-300'
                                  : 'bg-white border border-slate-200/80 hover:border-indigo-200'
                                }`}
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
                                {act.paidByGroup && (
                                  <p className="flex flex-wrap items-center gap-1 text-[10px] font-bold text-teal-700">
                                    <Building2 className="w-3 h-3 shrink-0" />
                                    {lang === 'th' ? 'ชำระโดย' : 'Paid by'} {act.paidByGroup.companyName || (lang === 'th' ? 'บริษัท' : 'company')}
                                    {act.paidByGroup.ticketCode && <span className="font-mono">· {act.paidByGroup.ticketCode}</span>}
                                    <span className="font-medium text-teal-600/80">
                                      {lang === 'th' ? '— ไม่รวมในยอดเงินของรายการนี้' : '— not included in this slip amount'}
                                    </span>
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <span className={`font-black font-mono text-xs sm:text-base ${act.paidByGroup ? 'text-teal-700' : 'text-indigo-700'}`}>
                                  ฿{Number(act.paidByGroup?.price || ((act.price && Number(act.price) > 0) ? act.price : (acts.length === 1 ? selectedSlip.amount : (act.price || 0)))).toLocaleString()}
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

                {(selectedSlip.status === 'pending' || selectedSlip.status === 'approved') && (
                  <button
                    onClick={() => openAttachModal(selectedSlip)}
                    disabled={isProcessing}
                    className="ml-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                    title={lang === 'th' ? 'แนบสลิปแทนผู้ลงทะเบียน' : 'Attach slip on behalf of registrant'}
                  >
                    <Upload className="w-4 h-4 text-sky-600 shrink-0" />
                    <span className="hidden sm:inline">{selectedSlip.adminAttachedSlip || hasActualSlip(selectedSlip) ? (lang === 'th' ? 'เปลี่ยนสลิป' : 'Replace Slip') : (lang === 'th' ? 'แนบสลิป' : 'Attach Slip')}</span>
                  </button>
                )}

                {canApproveSlip(selectedSlip) && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {selectedSlip.status === 'pending' && (
                      <button
                        onClick={() => openRejectModal(selectedSlip.id)}
                        disabled={isProcessing}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                        title={lang === 'th' ? 'ปฏิเสธสลิป' : 'Reject Slip'}
                      >
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="hidden sm:inline">{lang === 'th' ? 'ปฏิเสธสลิป' : 'Reject'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleApprove(selectedSlip.id)}
                      disabled={isProcessing}
                      className={`px-3 sm:px-5 py-2 sm:py-2.5 text-[#061d08] text-xs font-black rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 whitespace-nowrap ${processingSlipId === selectedSlip.id
                          ? 'bg-emerald-300 opacity-90 cursor-wait'
                          : 'bg-[#4ade80] hover:bg-[#3ec424]'
                        }`}
                      title={
                        (hasActualSlip(selectedSlip) || selectedSlip.adminAttachedSlip)
                          ? (lang === 'th' ? 'อนุมัติการชำระเงิน' : 'Approve Payment')
                          : isRegisteredAsPayLater(selectedSlip)
                            ? (lang === 'th' ? 'อนุมัติสิทธิ์การเข้าร่วม' : 'Approve Access')
                            : (lang === 'th' ? 'อนุมัติรายการ' : 'Approve')
                      }
                    >
                      {processingSlipId === selectedSlip.id ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin text-[#061d08] shrink-0" />
                          <span>{lang === 'th' ? 'กำลังอนุมัติ...' : 'Approving...'}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#061d08] shrink-0" />
                          <span className="hidden sm:inline">
                            {(hasActualSlip(selectedSlip) || selectedSlip.adminAttachedSlip)
                              ? (lang === 'th' ? 'อนุมัติการชำระเงิน' : 'Approve Payment')
                              : isRegisteredAsPayLater(selectedSlip)
                                ? (lang === 'th' ? 'อนุมัติสิทธิ์การเข้าร่วม' : 'Approve Access')
                                : (lang === 'th' ? 'อนุมัติรายการ' : 'Approve')}
                          </span>
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

      {/* Admin Attach Slip Modal */}
      {mounted &&
        attachingSlip &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {attachingSlip.adminAttachedSlip || hasActualSlip(attachingSlip)
                        ? (lang === 'th' ? 'เปลี่ยนสลิปการโอนเงิน' : 'Replace Transfer Slip')
                        : (lang === 'th' ? 'แนบสลิปการโอนเงิน' : 'Attach Transfer Slip')}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {attachingSlip.companyName || attachingSlip.nameTh} · {attachingSlip.ticketCode || attachingSlip.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeAttachModal}
                  disabled={attachUploading}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>{lang === 'th' ? 'ยอดที่ต้องชำระ' : 'Amount due'}</span>
                <span className="font-black text-slate-900 text-sm">฿{Number(attachingSlip.amount || 0).toLocaleString()}</span>
              </div>

              {(attachingSlip.adminAttachedSlip || hasActualSlip(attachingSlip)) && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-3">
                  <span>{lang === 'th' ? 'สลิปปัจจุบันจะถูกแทนที่ด้วยไฟล์ใหม่' : 'The current slip will be replaced'}</span>
                  <a
                    href={attachingSlip.slipUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-amber-900 underline inline-flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {lang === 'th' ? 'ดูสลิปปัจจุบัน' : 'View current'}
                  </a>
                </div>
              )}

              <label
                htmlFor="admin-attach-slip-input"
                className="block border-2 border-dashed border-slate-300 hover:border-sky-400 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-50/50"
              >
                {attachFile && attachPreviewUrl ? (
                  attachFile.type === 'application/pdf' ? (
                    <div className="flex flex-col items-center gap-1 text-rose-600 py-4">
                      <FileText className="w-8 h-8" />
                      <span className="text-xs font-bold break-all">{attachFile.name}</span>
                    </div>
                  ) : (
                    <img src={attachPreviewUrl} alt="Slip preview" className="max-h-64 mx-auto rounded-xl object-contain" />
                  )
                ) : null}
                {attachFile && attachPreviewUrl ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-sky-700">
                    <RotateCw className="w-3.5 h-3.5" />
                    {lang === 'th' ? 'เลือกผิดรูป? คลิกเพื่อเลือกไฟล์ใหม่' : 'Wrong file? Click to choose another'}
                  </span>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-slate-500 py-6">
                    <Upload className="w-7 h-7 text-slate-400" />
                    <span className="text-xs font-bold">
                      {lang === 'th' ? 'คลิกเพื่อเลือกรูปสลิปหรือไฟล์ PDF' : 'Click to choose a slip image or PDF'}
                    </span>
                  </div>
                )}
              </label>
              <input
                id="admin-attach-slip-input"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleAttachFileChange}
                disabled={attachUploading}
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-600">{lang === 'th' ? 'วันที่โอน' : 'Transfer date'}</span>
                  <input
                    type="date"
                    value={attachTransferDate}
                    onChange={(e) => setAttachTransferDate(e.target.value)}
                    disabled={attachUploading}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-600">{lang === 'th' ? 'เวลาที่โอน' : 'Transfer time'}</span>
                  <input
                    type="time"
                    value={attachTransferTime}
                    onChange={(e) => setAttachTransferTime(e.target.value)}
                    disabled={attachUploading}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                </label>
              </div>

              <p className="text-[11px] text-slate-500">
                {lang === 'th'
                  ? 'สถานะรายการจะคงเดิม เมื่อกดอนุมัติ ระบบจะปรับเป็นชำระเงินเรียบร้อย ออกใบเสร็จ และส่งอีเมลยืนยัน'
                  : 'The status stays the same. Approving marks it as paid, issues the receipt and sends confirmation.'}
              </p>

              {attachError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{attachError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  onClick={closeAttachModal}
                  disabled={attachUploading}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  onClick={handleConfirmAttach}
                  disabled={attachUploading || !attachFile}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {attachUploading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>{lang === 'th' ? 'กำลังอัปโหลด...' : 'Uploading...'}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>{lang === 'th' ? 'ยืนยันแนบสลิป' : 'Attach Slip'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Admin Add / Edit / Remove Group Attendee Modal */}
      {attendeeEditor && (
        <GroupAttendeeEditorModal
          key={`${attendeeEditor.slipId}:${attendeeEditor.mode}:${attendeeEditor.attendeeIndex ?? 'new'}`}
          target={attendeeEditor}
          onClose={() => setAttendeeEditor(null)}
          onSaved={handleAttendeeSaved}
        />
      )}

      {/* Admin Edit Attendance Format Modal */}
      {mounted &&
        formatEditTarget &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {lang === 'th' ? 'แก้ไขรูปแบบการเข้าร่วม' : 'Edit Attendance Format'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {formatEditTarget.attendeeName} · {formatEditTarget.slip.ticketCode || formatEditTarget.slip.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeFormatEdit}
                  disabled={formatSaving}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(['onsite', 'online'] as const).map((opt) => {
                  const active = formatEditValue === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormatEditValue(opt)}
                      disabled={formatSaving}
                      className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer disabled:opacity-50 ${active
                        ? 'border-sky-500 bg-sky-50 text-sky-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                    >
                      <span className="block text-sm font-black">
                        {opt === 'online'
                          ? (lang === 'th' ? 'ออนไลน์' : 'Online')
                          : (lang === 'th' ? 'ออนไซต์' : 'Onsite')}
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        {formatEditTarget.current === opt
                          ? (lang === 'th' ? 'รูปแบบปัจจุบัน' : 'Current format')
                          : opt === 'online'
                            ? (lang === 'th' ? 'เข้าร่วมแบบออนไลน์' : 'Join online')
                            : (lang === 'th' ? 'เข้าร่วม ณ สถานที่จัดงาน' : 'Join at the venue')}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-500">
                {lang === 'th'
                  ? 'แก้ไขโดยไม่คิดค่าธรรมเนียมและไม่เปลี่ยนสถานะการชำระเงิน หากส่งบัตรเข้างานไปแล้ว กรุณาส่งบัตรเข้างานใหม่ให้ผู้เข้าร่วม'
                  : 'No fee is charged and the payment status is unchanged. If the ticket was already sent, please resend it.'}
              </p>

              {formatError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formatError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  onClick={closeFormatEdit}
                  disabled={formatSaving}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  onClick={handleConfirmFormatEdit}
                  disabled={formatSaving || formatEditValue === formatEditTarget.current}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {formatSaving ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>{lang === 'th' ? 'กำลังบันทึก...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{lang === 'th' ? 'ยืนยันการแก้ไข' : 'Save'}</span>
                    </>
                  )}
                </button>
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

              {(() => {
                const target = slips.find((s) => s.id === rejectingSlipId) || (selectedSlip?.id === rejectingSlipId ? selectedSlip : null);
                const isMem = target?.isMembershipRegistration || target?.ticketCode?.startsWith('MEM-');
                const isCorp = target?.isGroupMembership || target?.isGroupConference || target?.ticketCode?.startsWith('GRP-') || target?.ticketCode?.startsWith('MEMGRP');

                return (
                  <>
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
                            setRejectReason(
                              isMem
                                ? 'ข้อมูลหรือเอกสารการสมัครสมาชิกไม่ถูกต้อง/ไม่ครบถ้วน กรุณาตรวจสอบและแก้ไขข้อมูล หรือแนบเอกสารรับรองใหม่'
                                : isCorp
                                ? 'ข้อมูลบริษัทหรือรายชื่อผู้ลงทะเบียนไม่ถูกต้อง กรุณาตรวจสอบและแก้ไขข้อมูลให้ถูกต้อง'
                                : 'ข้อมูลผู้ลงทะเบียนไม่ถูกต้อง กรุณาตรวจสอบและแก้ไขข้อมูลให้ถูกต้อง'
                            );
                          }}
                          className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                            rejectType === 'info'
                              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300 text-rose-950 shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-extrabold text-xs">
                            <span>⚠️</span>
                            <span className="leading-snug">
                              {isMem ? 'ข้อมูล/เอกสารไม่ถูกต้อง' : 'ข้อมูลไม่ถูกต้อง'}
                            </span>
                          </div>
                          <span className="inline-block mt-1 text-[11px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md w-fit">
                            {isMem ? 'แนบฟอร์มสมัครสมาชิกกลับไป' : 'แนบการแก้ไขข้อมูลกลับไป'}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                            {isMem
                              ? 'ส่งลิงก์แบบฟอร์มสมัครสมาชิกพร้อมข้อมูลเดิมให้แก้ไข'
                              : 'ส่งลิงก์แบบฟอร์มให้ผู้ลงทะเบียนเข้ามากรอกแก้ไขข้อมูลส่วนตัว'}
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
                  </>
                );
              })()}

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
                          บุคคลทั่วไป
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
                    <span className="font-bold text-slate-800 text-right font-mono">{viewingAttendee.mobile || viewingAttendee.phone || viewingAttendee.tel || '-'}</span>
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
                  {viewingAttendee.hasDiscount && viewingAttendee.attDiscount > 0 ? (
                    <div className="py-1 gap-2 pt-1 border-t border-slate-200 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-bold shrink-0">ราคาเต็ม:</span>
                        <span className="line-through text-slate-400 font-mono text-xs">฿{Number(viewingAttendee.originalPrice || viewingAttendee.subtotal).toLocaleString()} THB</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-700 font-bold shrink-0">
                          ส่วนลดคูปอง{viewingAttendee.couponCode ? ` (🎟️ ${viewingAttendee.couponCode})` : ''}:
                        </span>
                        <span className="font-extrabold text-emerald-700 font-mono text-xs">-฿{Number(viewingAttendee.attDiscount).toLocaleString()} THB</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                        <span className="text-slate-900 font-extrabold shrink-0">ยอดสุทธิ:</span>
                        <span className="font-black text-emerald-700 font-mono text-sm">฿{Number(viewingAttendee.netPrice).toLocaleString()} THB</span>
                      </div>
                    </div>
                  ) : viewingAttendee.subtotal ? (
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
                        {attendeeActs.map((act: any, idx: number) => {
                          const isMain = act.name?.toLowerCase().includes('main') || act.name?.includes('Main Program') || act.name?.includes('การประชุมหลัก');
                          const isActDisc = viewingAttendee.hasDiscount && isMain && (viewingAttendee.attDiscount >= 4000 || viewingAttendee.couponCode);
                          const rawPrice = Number(act.price) || (isMain ? 4000 : 0);
                          const discPrice = isActDisc ? Math.max(0, rawPrice - (viewingAttendee.attDiscount > 0 ? Math.min(viewingAttendee.attDiscount, rawPrice) : 4000)) : rawPrice;

                          return (
                            <div key={idx} className={`p-2.5 rounded-xl border flex justify-between items-center gap-2 ${isActDisc ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                              <span className="font-bold text-slate-800 truncate">{act.name}</span>
                              {isActDisc ? (
                                <span className="font-mono font-black text-xs shrink-0 flex items-center gap-1.5">
                                  {rawPrice > 0 && <span className="line-through text-slate-400 font-normal">฿{rawPrice.toLocaleString()}</span>}
                                  <span className="text-emerald-700">{discPrice === 0 ? '฿0 (สิทธิ์ฟรี)' : `฿${discPrice.toLocaleString()}`}</span>
                                </span>
                              ) : rawPrice > 0 ? (
                                <span className="font-black text-indigo-700 font-mono shrink-0">฿{rawPrice.toLocaleString()}</span>
                              ) : null}
                            </div>
                          );
                        })}
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
