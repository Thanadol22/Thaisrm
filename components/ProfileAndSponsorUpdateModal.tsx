'use client';

import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Mail,
  KeyRound,
  ShieldCheck,
  RotateCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  Building2,
  Phone,
  Briefcase,
  GraduationCap,
  MapPin,
  FileText,
  CreditCard,
  Upload,
  ExternalLink,
  Plus,
  Trash2,
  Check,
  Sparkles,
  Info,
  Calendar,
  Lock,
  Camera,
  FileCheck,
  Eye,
  Users,
  UserCheck,
} from 'lucide-react';
import { PositionSelect } from '@/components/PositionSelect';
import { SmartEmailInput } from '@/components/SmartEmailInput';
import { ThaiDatePicker } from '@/components/ThaiDatePicker';
import { uploadImageToStorage } from '@/lib/blobUpload';

import { statusLabelTh } from '@/lib/statusLabels';
import { registrationStatusBadge, registrationStatusLabel, type RegistrationStatusKey } from '@/lib/registrationStatus';
import { PaginationControls } from '@/components/PaginationControls';
interface EducationItem {
  edu_id?: string;
  degree: string;
  institution: string;
  graduation_year?: string;
}

interface MemberData {
  member_no: string;
  fullNameTh: string;
  fullNameEn: string;
  idLast4: string;
  mobile: string;
  email: string;
  lineId?: string;
  address?: string;
  workplace: string;
  work_phone?: string;
  work_start_date: string;
  position: string;
  job_category?: string;
  job_category_other: string;
  scientist_license_no: string;
  referees?: string;
  photo_url?: string;
  degree_cert_doc?: string;
  work_cert_doc?: string;
  membership_status: string;
  membership_type: string;
  educations: EducationItem[];
  missingFields: string[];
  isProfileComplete: boolean;
}

interface SponsorQuota {
  meeting_id: string;
  meeting_name: string;
  quota_seats: number;
  used_seats: number;
  remaining_seats: number;
}

interface SponsorGroupMember {
  id: string;
  member_no: string;
  attendee_name: string;
  attendee_email: string;
  ticket_code: string;
  discount_amount: number;
  net_price: number;
  status: string;
  meeting_id: string;
  meeting_name: string;
  created_at: string;
  programs?: { name: string; type: string; format: 'onsite' | 'online'; price?: number; isFellow?: boolean }[];
  isMembershipOnly?: boolean;
  statusKey?: PortalStatusKey;
  registrations?: {
    ticketCode: string;
    slipId: string | null;
    source: 'slip' | 'quota' | 'staff';
    statusKey: PortalStatusKey;
    price: number | null;
    isAddOn: boolean;
    rejectionReason: string | null;
  }[];
  notes?: string[];
  checkedIn?: boolean;
  checkinTime?: string | null;
  hasPrice?: boolean;
}

interface SponsorSlip {
  id?: string;
  slip_id: string;
  ticket_code?: string;
  meeting_id: string;
  meeting_name?: string;
  title?: string;
  amount: number;
  bank: string | null;
  transfer_date: string | null;
  transfer_time: string | null;
  slip_url: string;
  raw_slip_url?: string;
  status: string;
  itemStatus?: 'approved' | 'approved_awaiting_payment' | 'pending_review' | 'pending_payment_review' | 'rejected' | 'awaiting_payment';
  isPayLater?: boolean;
  hasActualSlip?: boolean;
  requiresSlipUpload?: boolean;
  rejection_reason?: string | null;
  attendeesCount?: number;
  statusKey?: PortalStatusKey;
  isMembership?: boolean;
  attendeeNames?: string[];
  receipt_no?: string | null;
  created_at: string;
}

interface SponsorData {
  sponsorId: string;
  sponsorName: string;
  tier: string;
  contactName: string;
  contactEmail: string;
  quotas: SponsorQuota[];
  groupMembers: SponsorGroupMember[];
  slips: SponsorSlip[];
  awaitingPaymentSlips?: SponsorSlip[];
  totalAmount: number;
  outstandingAmount?: number;
  hasOutstanding: boolean;
  paymentStatus: 'approved' | 'approved_awaiting_payment' | 'pending_review' | 'pending_payment_review' | 'rejected' | 'unpaid' | 'free_quota';
  peopleCounts?: Partial<Record<PortalStatusKey, number>>;
  checkedInCount?: number;
  generatedAt?: string;
}

interface ProfileAndSponsorUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'th' | 'en';
}

// จำนวนรายชื่อสมาชิกของบริษัทต่อหน้า
const GROUP_MEMBERS_PAGE_SIZE = 5;

/** สถานะที่แสดงให้บริษัท (ตรงกับ lib/services/sponsorPortalService) */
type PortalStatusKey =
  | 'confirmed'
  | 'approved_awaiting_payment'
  | 'pending_payment_review'
  | 'awaiting_payment'
  | 'pending_review'
  | 'rejected';

const PORTAL_STATUS_ORDER: PortalStatusKey[] = [
  'confirmed',
  'approved_awaiting_payment',
  'pending_payment_review',
  'awaiting_payment',
  'pending_review',
  'rejected',
];

const PORTAL_TO_REGISTRATION_STATUS: Record<PortalStatusKey, RegistrationStatusKey> = {
  confirmed: 'registered',
  approved_awaiting_payment: 'registered_awaiting_payment',
  pending_payment_review: 'pending_payment_review',
  awaiting_payment: 'pending_pay_later',
  pending_review: 'pending',
  rejected: 'rejected',
};

/** ชื่อและสีของสถานะดึงจากสถานะกลาง (lib/registrationStatus.ts) */
const portalStatusLabel = (key: RegistrationStatusKey) => ({
  th: registrationStatusLabel(key, 'th'),
  en: registrationStatusLabel(key, 'en'),
  badge: registrationStatusBadge(key),
});

const PORTAL_STATUS_INFO: Record<PortalStatusKey, { th: string; en: string; descTh: string; descEn: string; badge: string; dot: string }> = {
  confirmed: {
    ...portalStatusLabel('registered'),
    descTh: 'เจ้าหน้าที่อนุมัติแล้ว ชำระเงินหรือได้รับสิทธิ์เรียบร้อย เข้าร่วมงานได้ตามรูปแบบที่ระบุ',
    descEn: 'Approved. Payment or entitlement confirmed. Ready to attend in the stated format.',
    dot: 'bg-emerald-500',
  },
  approved_awaiting_payment: {
    ...portalStatusLabel('registered_awaiting_payment'),
    descTh: 'เจ้าหน้าที่อนุมัติและออกใบเสร็จให้แล้ว กรุณาชำระเงินและแนบสลิปตามยอดของรายการ',
    descEn: 'Approved and receipt issued. Please pay and attach the slip for this item.',
    dot: 'bg-orange-500',
  },
  pending_payment_review: {
    ...portalStatusLabel('pending_payment_review'),
    descTh: 'ได้รับสลิปแล้ว เจ้าหน้าที่กำลังตรวจสอบยอดเงิน บริษัทไม่ต้องดำเนินการเพิ่ม',
    descEn: 'Slip received. Staff are verifying the payment. No action needed.',
    dot: 'bg-sky-500',
  },
  awaiting_payment: {
    ...portalStatusLabel('pending_pay_later'),
    descTh: 'ลงทะเบียนแบบชำระเงินภายหลัง รอเจ้าหน้าที่ตรวจสอบ บริษัทแนบสลิปล่วงหน้าได้',
    descEn: 'Pay-later registration pending review. You may attach the slip in advance.',
    dot: 'bg-amber-500',
  },
  pending_review: {
    ...portalStatusLabel('pending'),
    descTh: 'เจ้าหน้าที่กำลังตรวจสอบรายการลงทะเบียน',
    descEn: 'Staff are reviewing the registration.',
    dot: 'bg-amber-500',
  },
  rejected: {
    ...portalStatusLabel('rejected'),
    descTh: 'เจ้าหน้าที่ส่งรายการกลับให้แก้ไข ดูเหตุผลแล้วแนบสลิปใหม่หรือแจ้งแก้ไขข้อมูล ระบบยังถือสิทธิ์ไว้ให้ระหว่างรอแก้ไข หากไม่มีการแก้ไข เจ้าหน้าที่อาจยกเลิกรายการและคืนสิทธิ์',
    descEn: 'Returned for correction. Rights are held meanwhile; without a fix, staff may cancel the item.',
    dot: 'bg-rose-500',
  },
};

const OVERALL_STATUS_INFO: Record<
  SponsorData['paymentStatus'],
  { th: string; en: string; descTh: string; descEn: string; box: string; icon: string; Icon: React.ElementType }
> = {
  approved: {
    th: registrationStatusLabel('registered', 'th'),
    en: registrationStatusLabel('registered', 'en'),
    descTh: 'ทุกรายการได้รับการยืนยันแล้ว ไม่มีรายการที่บริษัทต้องดำเนินการเพิ่ม',
    descEn: 'All registrations are confirmed. Nothing else is needed.',
    box: 'bg-emerald-50/70 border-emerald-200 text-emerald-900',
    icon: 'text-emerald-600',
    Icon: CheckCircle2,
  },
  approved_awaiting_payment: {
    th: registrationStatusLabel('registered_awaiting_payment', 'th'),
    en: registrationStatusLabel('registered_awaiting_payment', 'en'),
    descTh: 'มีรายการที่อนุมัติแล้ว กรุณาชำระเงินและแนบสลิปในส่วนรายการที่ต้องแนบสลิปด้านล่าง',
    descEn: 'Some items are approved. Please pay and attach slips below.',
    box: 'bg-sky-50/70 border-sky-200 text-sky-900',
    icon: 'text-sky-600',
    Icon: CreditCard,
  },
  unpaid: {
    th: 'รอแนบสลิปการชำระเงิน',
    en: 'Awaiting payment slip',
    descTh: 'มีรายการชำระเงินภายหลังที่ยังไม่ได้แนบสลิป',
    descEn: 'Some pay-later items have no slip yet.',
    box: 'bg-sky-50/70 border-sky-200 text-sky-900',
    icon: 'text-sky-600',
    Icon: CreditCard,
  },
  pending_payment_review: {
    th: registrationStatusLabel('pending_payment_review', 'th'),
    en: registrationStatusLabel('pending_payment_review', 'en'),
    descTh: 'เจ้าหน้าที่กำลังตรวจสอบยอดเงิน บริษัทไม่ต้องดำเนินการเพิ่ม',
    descEn: 'Staff are verifying the payments. No action needed.',
    box: 'bg-indigo-50/70 border-indigo-200 text-indigo-900',
    icon: 'text-indigo-600',
    Icon: Clock,
  },
  pending_review: {
    th: registrationStatusLabel('pending', 'th'),
    en: registrationStatusLabel('pending', 'en'),
    descTh: 'เจ้าหน้าที่กำลังตรวจสอบรายการลงทะเบียนของบริษัท',
    descEn: 'Staff are reviewing your registrations.',
    box: 'bg-amber-50/70 border-amber-200 text-amber-900',
    icon: 'text-amber-600',
    Icon: Clock,
  },
  rejected: {
    th: 'มีรายการที่ต้องแก้ไข',
    en: 'Action required',
    descTh: 'เจ้าหน้าที่ส่งรายการกลับให้แก้ไข ดูเหตุผลและแนบสลิปใหม่ในส่วนด้านล่าง',
    descEn: 'Some items were returned for correction. See the reasons below.',
    box: 'bg-rose-50/70 border-rose-200 text-rose-900',
    icon: 'text-rose-600',
    Icon: AlertTriangle,
  },
  free_quota: {
    th: 'ยังไม่มีรายการลงทะเบียน',
    en: 'No registrations yet',
    descTh: 'บริษัทยังไม่มีรายการลงทะเบียนหรือการชำระเงิน',
    descEn: 'There are no registrations or payments yet.',
    box: 'bg-slate-50 border-slate-200 text-slate-800',
    icon: 'text-slate-500',
    Icon: Info,
  },
};

/** รายการที่บริษัทต้องแนบสลิป (ยังไม่ได้ส่งสลิป หรือถูกส่งกลับให้แก้ไข) */
const needsSlipUpload = (s: SponsorSlip) => Boolean(s.requiresSlipUpload);

function formatThaiDateTime(value?: string | null): string {
  const d = value ? new Date(value) : new Date();
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PortalStatusBadge({ statusKey, lang, membership = false }: { statusKey: PortalStatusKey; lang: 'th' | 'en'; membership?: boolean }) {
  const info = PORTAL_STATUS_INFO[statusKey] || PORTAL_STATUS_INFO.pending_review;
  const label = registrationStatusLabel(PORTAL_TO_REGISTRATION_STATUS[statusKey] || 'pending', lang, membership ? 'membership' : 'registration');
  return (
    <span className={`inline-flex items-center gap-1.5 max-w-full px-2 py-0.5 rounded-full border text-[11px] font-bold leading-tight ${info.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${info.dot}`} />
      <span className="min-w-0">{label}</span>
    </span>
  );
}

function CheckedInBadge({ lang, time }: { lang: 'th' | 'en'; time?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-full border bg-teal-50 text-teal-800 border-teal-200 text-[11px] font-bold leading-tight">
      <UserCheck className="w-3 h-3 shrink-0" />
      <span className="min-w-0">
        {lang === 'th' ? 'เช็กอินแล้ว' : 'Checked in'}
        {time ? ` ${time}` : ''}
      </span>
    </span>
  );
}

export function ProfileAndSponsorUpdateModal({
  isOpen,
  onClose,
  lang = 'th',
}: ProfileAndSponsorUpdateModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'email' | 'otp' | 'member_view' | 'sponsor_view'>('email');
  const [groupMembersPage, setGroupMembersPage] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [userType, setUserType] = useState<'member' | 'sponsor' | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Member State
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingWorkCert, setUploadingWorkCert] = useState(false);
  const [uploadingDegreeCert, setUploadingDegreeCert] = useState(false);

  // Sponsor State
  const [sponsorData, setSponsorData] = useState<SponsorData | null>(null);

  // Per-slip form state map — key = slip_id or ticket_code
  interface SlipFormState {
    file: File | null;
    preview: string | null;
    bank: string;
    date: string;
    time: string;
    amount: number;
    ref: string;
    submitting: boolean;
    success: boolean;
    errorMsg: string;
  }
  const initSlipForm = (amount: number, refCode: string): SlipFormState => ({
    file: null,
    preview: null,
    bank: 'Kasikorn (KBANK)',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }),
    amount,
    ref: refCode,
    submitting: false,
    success: false,
    errorMsg: '',
  });
  const [slipForms, setSlipForms] = useState<Record<string, SlipFormState>>({});
  const updateSlipForm = (key: string, patch: Partial<SlipFormState>) =>
    setSlipForms((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  const [submittingAll, setSubmittingAll] = useState(false);
  const [allSlipsSuccess, setAllSlipsSuccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'confirmed' | 'in_progress' | 'rejected'>('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep('email');
      setEmail('');
      setOtp('');
      setErrorMsg('');
      setSuccessMsg('');
      setUserType(null);
      setSessionToken(null);
      setMemberData(null);
      setSponsorData(null);
      setSlipForms({});
      setSaveSuccess(false);
      setAllSlipsSuccess(false);
      setPortalError('');
      setMemberSearch('');
      setMemberFilter('all');
    }
  }, [isOpen]);

  // Initialize slip forms when sponsor data loads
  useEffect(() => {
    if (sponsorData) {
      const awaitingSlips = sponsorData.slips.filter(needsSlipUpload);
      setSlipForms((prev) => {
        const next = { ...prev };
        awaitingSlips.forEach((s) => {
          const key = s.slip_id || s.ticket_code || String(Math.random());
          if (!next[key]) {
            next[key] = initSlipForm(s.amount || 0, s.ticket_code || s.slip_id || '');
          }
        });
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sponsorData?.slips?.length]);

  if (!isOpen || !mounted) return null;

  // Helper check PDF
  const isPdf = (url: string | null | undefined): boolean => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.pdf') || cleanUrl.includes('.pdf');
  };

  // Upload handlers for member documents
  const handleMemberPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !memberData) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(lang === 'th' ? 'ขนาดรูปถ่ายเกิน 5MB' : 'Photo size exceeds 5MB');
      return;
    }
    try {
      setUploadingPhoto(true);
      const res = await uploadImageToStorage(file, 'avatars');
      if (res?.url) {
        setMemberData({ ...memberData, photo_url: res.url });
      }
    } catch (err) {
      alert(lang === 'th' ? 'อัปโหลดรูปภาพไม่สำเร็จ' : 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleMemberWorkCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !memberData) return;
    if (file.size > 10 * 1024 * 1024) {
      alert(lang === 'th' ? 'ขนาดไฟล์เกิน 10MB' : 'File size exceeds 10MB');
      return;
    }
    try {
      setUploadingWorkCert(true);
      const res = await uploadImageToStorage(file, 'documents');
      if (res?.url) {
        setMemberData({ ...memberData, work_cert_doc: res.url });
      }
    } catch (err) {
      alert(lang === 'th' ? 'อัปโหลดเอกสารไม่สำเร็จ' : 'Document upload failed');
    } finally {
      setUploadingWorkCert(false);
      e.target.value = '';
    }
  };

  const handleMemberDegreeCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !memberData) return;
    if (file.size > 10 * 1024 * 1024) {
      alert(lang === 'th' ? 'ขนาดไฟล์เกิน 10MB' : 'File size exceeds 10MB');
      return;
    }
    try {
      setUploadingDegreeCert(true);
      const res = await uploadImageToStorage(file, 'documents');
      if (res?.url) {
        setMemberData({ ...memberData, degree_cert_doc: res.url });
      }
    } catch (err) {
      alert(lang === 'th' ? 'อัปโหลดเอกสารไม่สำเร็จ' : 'Document upload failed');
    } finally {
      setUploadingDegreeCert(false);
      e.target.value = '';
    }
  };

  // 1. ขอรับรหัสชั่วคราว (Request OTP)
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg(lang === 'th' ? 'กรุณาระบุอีเมล' : 'Please enter your email');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/unified-request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || (lang === 'th' ? 'ไม่พบบัญชีนี้ในระบบ กรุณาตรวจสอบอีเมล' : 'Account not found'));
        return;
      }

      setUserType(data.userType);
      setSuccessMsg(data.message);
      setStep('otp');
    } catch (err) {
      setErrorMsg(lang === 'th' ? 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' : 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  // 2. ยืนยันรหัส OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setErrorMsg(lang === 'th' ? 'กรุณากรอกรหัส OTP 6 หลัก' : 'Please enter 6-digit OTP');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/unified-verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || (lang === 'th' ? 'รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว' : 'Invalid OTP'));
        return;
      }

      if (data.sessionToken) {
        setSessionToken(data.sessionToken);
      }

      if (data.userType === 'member') {
        setMemberData(data.data);
        setStep('member_view');
      } else if (data.userType === 'sponsor') {
        setSponsorData(data.data);
        setGroupMembersPage(1);
        setStep('sponsor_view');
      }
    } catch (err) {
      setErrorMsg(lang === 'th' ? 'เกิดข้อผิดพลาดในการตรวจสอบรหัส' : 'Verification error');
    } finally {
      setLoading(false);
    }
  };

  // 3. บันทึกข้อมูลสมาชิก
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberData) return;

    setSavingMember(true);
    setErrorMsg('');
    setSaveSuccess(false);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      const res = await fetch('/api/members/profile-update', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...memberData,
          sessionToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'บันทึกข้อมูลไม่สำเร็จ');
        return;
      }

      if (data.sessionToken) {
        setSessionToken(data.sessionToken);
      }
      if (data.email) {
        setEmail(data.email);
      }

      setSaveSuccess(true);
      // Re-calculate missing fields matching signup inputs
      const fieldsToCheck = [
        { key: 'fullNameTh', label: 'ชื่อ-นามสกุล (ภาษาไทย)' },
        { key: 'fullNameEn', label: 'ชื่อ-นามสกุล (ภาษาอังกฤษ)' },
        { key: 'idLast4', label: 'เลข 4 หลักท้ายบัตรประชาชน' },
        { key: 'mobile', label: 'เบอร์โทรศัพท์มือถือ' },
        { key: 'email', label: 'อีเมล' },
        { key: 'workplace', label: 'สถานที่ทำงาน' },
        { key: 'position', label: 'ตำแหน่งงาน' },
      ];
      const newMissing: string[] = [];
      fieldsToCheck.forEach((f) => {
        const val = (memberData as any)[f.key];
        if (!val || String(val).trim() === '' || String(val).trim() === '-') {
          newMissing.push(f.label);
        }
      });
      setMemberData({
        ...memberData,
        missingFields: newMissing,
        isProfileComplete: newMissing.length === 0,
      });

      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSavingMember(false);
    }
  };

  // 4. อัปโหลดสลิปสำหรับ slip item เดียว (internal helper)
  const uploadSlipItem = async (slip: SponsorSlip, currentSponsorData: SponsorData): Promise<{ success: boolean; slipUrl?: string; errorMsg?: string }> => {
    const key = slip.slip_id || slip.ticket_code || '';
    const form = slipForms[key];
    if (!form?.file) {
      updateSlipForm(key, { errorMsg: 'กรุณาเลือกไฟล์รูปภาพสลิปโอนเงิน' });
      return { success: false, errorMsg: 'กรุณาเลือกไฟล์รูปภาพสลิปโอนเงิน' };
    }
    updateSlipForm(key, { submitting: true, errorMsg: '' });
    try {
      const uploadRes = await uploadImageToStorage(form.file, 'slips');
      if (!uploadRes?.url) throw new Error('อัปโหลดรูปสลิปไม่สำเร็จ');

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

      const res = await fetch('/api/sponsors/portal/upload-slip', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sponsorId: currentSponsorData.sponsorId,
          sponsorName: currentSponsorData.sponsorName,
          contactEmail: currentSponsorData.contactEmail,
          meetingId: slip.meeting_id || currentSponsorData.quotas[0]?.meeting_id || 'TSRM34',
          slip_url: uploadRes.url,
          targetSlipId: slip.slip_id,
          targetTicketCode: slip.ticket_code,
          sessionToken,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = data.message || 'ส่งสลิปไม่สำเร็จ';
        updateSlipForm(key, { submitting: false, errorMsg: msg });
        return { success: false, errorMsg: msg };
      }
      updateSlipForm(key, { submitting: false, success: true });
      return { success: true, slipUrl: uploadRes.url };
    } catch (err: any) {
      const msg = err?.message || 'เกิดข้อผิดพลาดในการแนบสลิป';
      updateSlipForm(key, { submitting: false, errorMsg: msg });
      return { success: false, errorMsg: msg };
    }
  };

  // 5. ส่งสลิปทุกรายการพร้อมกัน (ปุ่มเดียว)
  const handleSubmitAllSlips = async () => {
    if (!sponsorData) return;
    const awaitingSlips = sponsorData.slips.filter(needsSlipUpload);

    // ตรวจสอบว่าทุกรายการมีไฟล์แนบ
    let hasError = false;
    for (const slip of awaitingSlips) {
      const key = slip.slip_id || slip.ticket_code || '';
      const form = slipForms[key];
      if (!form?.success && !form?.file) {
        updateSlipForm(key, { errorMsg: 'กรุณาเลือกไฟล์รูปภาพสลิปโอนเงิน' });
        hasError = true;
      }
    }
    if (hasError) return;

    setSubmittingAll(true);
    setAllSlipsSuccess(false);

    // Upload ทุกรายการที่ยังไม่ success
    const pendingSlips = awaitingSlips.filter((s) => {
      const key = s.slip_id || s.ticket_code || '';
      return !slipForms[key]?.success;
    });

    let currentSponsorData = sponsorData;
    const results = await Promise.allSettled(
      pendingSlips.map((slip) => uploadSlipItem(slip, currentSponsorData))
    );

    const allOk = results.every((r) => r.status === 'fulfilled' && r.value.success);

    // อัปเดต sponsorData หลัง upload ทั้งหมด
    const updatedSlips = sponsorData.slips.map((s) => {
      const key = s.slip_id || s.ticket_code || '';
      const form = slipForms[key];
      if (form?.success) {
        // อัปเดต state: หลังอัพสลิป สถานะคือ pending_payment_review (ส่งสลิปแล้ว รอตรวจสอบการชำระ)
        return { ...s, status: 'pending', itemStatus: 'pending_payment_review' as const, hasActualSlip: true, requiresSlipUpload: false };
      }
      return s;
    });
    const remainingAwaiting = updatedSlips.filter(
      (s) => s.requiresSlipUpload || s.itemStatus === 'approved_awaiting_payment' || s.itemStatus === 'awaiting_payment'
    );
    setSponsorData({
      ...sponsorData,
      slips: updatedSlips,
      awaitingPaymentSlips: remainingAwaiting,
      hasOutstanding: remainingAwaiting.length > 0,
      paymentStatus: remainingAwaiting.length > 0 ? 'approved_awaiting_payment' : 'pending_payment_review',
    });

    setSubmittingAll(false);
    if (allOk) setAllSlipsSuccess(true);
    // โหลดสถานะล่าสุดจากระบบหลังส่งสลิป
    await refreshSponsorData(true);
  };

  // 6. โหลดข้อมูลหน้าบริษัทล่าสุดด้วยสิทธิ์เข้าใช้งานเดิม
  const refreshSponsorData = async (silent = false) => {
    if (!sessionToken) return;
    setRefreshing(true);
    if (!silent) setPortalError('');
    try {
      const res = await fetch('/api/sponsors/portal/overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ sessionToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (!silent) setPortalError(data.message || 'โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        return;
      }
      setSponsorData(data.data);
    } catch {
      if (!silent) setPortalError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setRefreshing(false);
    }
  };

  // Helper สำหรับเช็คฟิลด์ว่าง
  const isFieldEmpty = (val: string | null | undefined) => {
    return !val || String(val).trim() === '' || String(val).trim() === '-' || String(val).trim().toLowerCase() === 'null';
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shrink-0 border border-white/20 shadow-inner">
              {step === 'member_view' ? (
                <User className="w-5 h-5 text-blue-100" />
              ) : step === 'sponsor_view' ? (
                <Building2 className="w-5 h-5 text-blue-100" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-blue-100" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight text-white">
                {step === 'member_view'
                  ? (lang === 'th' ? 'อัปเดตข้อมูลสมาชิก TSRM' : 'TSRM Member Profile Update')
                  : step === 'sponsor_view'
                  ? (lang === 'th' ? 'ตรวจสอบสถานะและสลิปการชำระเงินบริษัท' : 'Corporate Payment & Slip Verification')
                  : (lang === 'th' ? 'เข้าสู่ระบบอัปเดตข้อมูล' : 'Profile & Account Update')}
              </h3>
              <p className="text-xs text-blue-200 font-medium">
                {step === 'member_view'
                  ? `เลขที่สมาชิก: ${memberData?.member_no} • ${memberData?.fullNameTh}`
                  : step === 'sponsor_view'
                  ? `${lang === 'th' ? 'บริษัท' : 'Company'} ${sponsorData?.sponsorName || ''}${sponsorData?.tier ? ` · ${lang === 'th' ? 'ระดับ' : 'Tier'} ${sponsorData.tier}` : ''}`
                  : (lang === 'th' ? 'ยืนยันตัวตนด้วยรหัสชั่วคราว (OTP) ผ่านอีเมล' : 'Verify identity with OTP via email')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-blue-100 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* ═══════════════════════════════════════════════════════════
              STEP 1: EMAIL INPUT
             ═══════════════════════════════════════════════════════════ */}
          {step === 'email' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-blue-900 text-xs sm:text-sm leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-blue-800">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  {lang === 'th' ? 'ระบบเข้าใช้งานด้วยอีเมลสำหรับสมาชิกและบริษัท' : 'Email-Only OTP Portal'}
                </p>
                <p className="text-blue-700/90 text-xs">
                  {lang === 'th'
                    ? 'กรุณากรอกอีเมลส่วนตัวของสมาชิก หรืออีเมลติดต่อของบริษัทสปอนเซอร์ ระบบจะส่งรหัส OTP 6 หลักเพื่อเข้าใช้งาน'
                    : 'Enter your member email or sponsor representative email to receive a 6-digit OTP.'}
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <SmartEmailInput
                  value={email}
                  onChange={setEmail}
                  label={
                    <span className="font-bold text-slate-700 text-xs sm:text-sm">
                      {lang === 'th' ? 'อีเมลที่ลงทะเบียนไว้' : 'Registered Email Address'}{' '}
                      <span className="text-red-500">*</span>
                    </span>
                  }
                  placeholder="เช่น doctor@hospital.com หรือ sponsor@company.com"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm sm:text-base"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>{lang === 'th' ? 'กำลังส่งรหัส OTP...' : 'Sending OTP...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{lang === 'th' ? 'ขอรับรหัสผ่านชั่วคราว' : 'Send OTP Code'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-1">
                <span className="text-[11px] text-slate-400">
                  🔒 {lang === 'th' ? 'ระบบความปลอดภัยมาตรฐาน TSRM สมาคมเวชศาสตร์การเจริญพันธุ์ไทย' : 'Protected by TSRM Security System'}
                </span>
              </div>
            </form>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STEP 2: OTP VERIFICATION
             ═══════════════════════════════════════════════════════════ */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs sm:text-sm">
                <div className="flex items-center gap-2 font-bold text-amber-800 mb-1">
                  <KeyRound className="w-4 h-4" />
                  <span>{lang === 'th' ? 'กรอกรหัส OTP 6 หลัก' : 'Enter 6-digit OTP'}</span>
                </div>
                <p className="text-amber-700 text-xs">
                  {lang === 'th'
                    ? `รหัส OTP ถูกส่งไปยัง ${email} แล้ว (มีอายุ 10 นาที)`
                    : `OTP code has been sent to ${email} (valid for 10 minutes)`}
                </p>
                <div className="mt-2 pt-2 border-t border-amber-200/70 text-[11px] text-amber-800 leading-relaxed">
                  💡 {lang === 'th'
                    ? 'หากไม่พบอีเมลในกล่องจดหมายหลัก กรุณาตรวจสอบในโฟลเดอร์ "จดหมายขยะ" และกด "ไม่ใช่จดหมายขยะ"'
                    : 'If not found in your inbox, please check your Junk/Spam folder and mark as "Not Spam"'}
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'th' ? 'รหัส OTP 6 หลัก' : '6-Digit OTP Code'}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  className="w-full text-center tracking-[0.5em] font-mono text-2xl sm:text-3xl font-extrabold py-3 border-2 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl transition outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setErrorMsg('');
                  }}
                  className="text-slate-500 hover:text-slate-700 underline cursor-pointer"
                >
                  ← {lang === 'th' ? 'เปลี่ยนอีเมล' : 'Change Email'}
                </button>

                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{lang === 'th' ? 'ขอรหัสใหม่อีกครั้ง' : 'Resend Code'}</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm sm:text-base"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>{lang === 'th' ? 'กำลังยืนยัน...' : 'Verifying...'}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>{lang === 'th' ? 'ยืนยันรหัส OTP' : 'Verify & Enter'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STEP 3A: MEMBER PROFILE UPDATE VIEW
             ═══════════════════════════════════════════════════════════ */}
          {step === 'member_view' && memberData && (
            <form onSubmit={handleSaveMember} className="space-y-6">
              {/* Profile Summary & Incomplete Indicator */}
              <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/50 border border-blue-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-2xs">
                      #{memberData.member_no}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg">
                      {statusLabelTh(memberData.membership_type)} • {statusLabelTh(memberData.membership_status)}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-base mt-1.5">
                    {memberData.fullNameTh || 'ยังไม่ได้ระบุชื่อ-นามสกุล'}
                  </h4>
                  <p className="text-xs text-slate-500">{memberData.email}</p>
                </div>

                {/* Completeness Badge */}
                <div className="shrink-0">
                  {memberData.missingFields.length > 0 ? (
                    <div className="bg-amber-500/10 border border-amber-300 px-3 py-2 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold block">มีช่องที่ยังไม่มีข้อมูล ({memberData.missingFields.length} ช่อง)</span>
                        <span className="text-[11px] text-amber-700">โปรดกรอกข้อมูลในช่องที่มีแถบสีส้ม</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/10 border border-emerald-300 px-3 py-2 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold">ข้อมูลครบถ้วนสมบูรณ์แล้ว</span>
                    </div>
                  )}
                </div>
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs sm:text-sm flex items-center gap-2 animate-fade-in shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. ข้อมูลส่วนบุคคลและรูปถ่ายสมาชิก */}
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>1. ข้อมูลส่วนบุคคลและรูปถ่ายสมาชิก</span>
                </h5>

                {/* Profile Photo Upload Row */}
                <div className="bg-gradient-to-r from-blue-50/70 via-slate-50 to-white rounded-2xl p-3.5 sm:p-4 border border-blue-100 flex flex-col sm:flex-row items-center gap-3.5 sm:gap-5">
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-dashed border-blue-300 bg-white flex flex-col items-center justify-center overflow-hidden shadow-2xs group-hover:border-blue-600 transition-all relative">
                      {memberData.photo_url ? (
                        <img
                          src={memberData.photo_url}
                          alt="Profile Preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400 group-hover:text-blue-600 transition-colors">
                          <User className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.5] mb-0.5" />
                          <span className="text-[9px] font-bold text-slate-500">รูปถ่าย</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMemberPhotoUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        title="เลือกรูปโปรไฟล์"
                      />
                    </div>

                    <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white pointer-events-none group-hover:scale-110 transition-transform">
                      {uploadingPhoto ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                      <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">
                        รูปถ่ายหน้าตรงติดบัตรสมาชิก
                      </h4>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                        รูปหน้าตรงสุภาพ
                      </span>
                    </div>
                    <p className="text-[10.5px] sm:text-xs text-slate-500 leading-tight">
                      อัปโหลดรูปถ่ายหน้าตรงสุภาพ (ไฟล์ JPG หรือ PNG ขนาดไม่เกิน 5MB)
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <label className="relative cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 shadow-2xs hover:border-blue-600 transition active:scale-95">
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                        <span>{uploadingPhoto ? 'กำลังอัปโหลด...' : memberData.photo_url ? 'เปลี่ยนรูปถ่าย' : 'เลือกรูปถ่าย'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMemberPhotoUpload}
                          disabled={uploadingPhoto}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </label>

                      {memberData.photo_url && (
                        <button
                          type="button"
                          onClick={() => setMemberData({ ...memberData, photo_url: '' })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>ลบรูป</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* ชื่อ-นามสกุล ไทย (Editable) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>ชื่อ-นามสกุล (ภาษาไทย) <span className="text-red-500">*</span></span>
                      {isFieldEmpty(memberData.fullNameTh) && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          ⚠️ โปรดใส่ข้อมูล
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={memberData.fullNameTh}
                      onChange={(e) =>
                        setMemberData({
                          ...memberData,
                          fullNameTh: e.target.value.replace(/[^\u0E00-\u0E7F\s\.\-]/g, ''),
                        })
                      }
                      placeholder="เช่น นายสมชาย ใจดี"
                      className={`w-full text-xs sm:text-sm py-2 px-3 rounded-xl border transition outline-none font-medium ${
                        isFieldEmpty(memberData.fullNameTh)
                          ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                          : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                  </div>

                  {/* ชื่อ-นามสกุล อังกฤษ (Editable) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>ชื่อ-นามสกุล (ภาษาอังกฤษ) <span className="text-red-500">*</span></span>
                      {isFieldEmpty(memberData.fullNameEn) && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          ⚠️ โปรดใส่ข้อมูล
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={memberData.fullNameEn}
                      onChange={(e) =>
                        setMemberData({
                          ...memberData,
                          fullNameEn: e.target.value.replace(/[^a-zA-Z\s\.\-']/g, ''),
                        })
                      }
                      placeholder="e.g. Mr. Somchai Jaidee"
                      className={`w-full text-xs sm:text-sm py-2 px-3 rounded-xl border transition outline-none font-medium ${
                        isFieldEmpty(memberData.fullNameEn)
                          ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                          : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                  </div>

                  {/* เลข 4 หลักท้ายบัตร ปชช */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>เลข 4 หลักท้ายบัตรประชาชน <span className="text-red-500">*</span></span>
                      {isFieldEmpty(memberData.idLast4) && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          ⚠️ โปรดใส่ข้อมูล
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={memberData.idLast4}
                      onChange={(e) =>
                        setMemberData({
                          ...memberData,
                          idLast4: e.target.value.replace(/\D/g, '').slice(0, 4),
                        })
                      }
                      placeholder="เช่น 1234"
                      className={`w-full text-xs sm:text-sm py-2 px-3 rounded-xl border transition outline-none font-mono ${
                        isFieldEmpty(memberData.idLast4)
                          ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                          : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* 2. ข้อมูลการติดต่อ */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <span>2. ข้อมูลการติดต่อ</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* เบอร์โทรศัพท์มือถือ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>เบอร์โทรศัพท์มือถือ <span className="text-red-500">*</span></span>
                      {isFieldEmpty(memberData.mobile) && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          ⚠️ โปรดใส่ข้อมูล
                        </span>
                      )}
                    </label>
                    <div className="relative flex items-center">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none shrink-0" />
                      <input
                        type="tel"
                        value={memberData.mobile}
                        onChange={(e) =>
                          setMemberData({
                            ...memberData,
                            mobile: e.target.value.replace(/\D/g, '').slice(0, 10),
                          })
                        }
                        placeholder="เช่น 0812345678"
                        className={`w-full text-xs sm:text-sm py-2 pl-9 pr-3 rounded-xl border transition outline-none font-medium ${
                          isFieldEmpty(memberData.mobile)
                            ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                            : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        }`}
                      />
                    </div>
                  </div>

                  {/* อีเมลสำหรับเข้าใช้งาน */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>อีเมล <span className="text-red-500">*</span></span>
                      {isFieldEmpty(memberData.email) ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          ⚠️ โปรดใส่ข้อมูล
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal">
                          (สามารถแก้ไขได้หากเปลี่ยนอีเมลใหม่)
                        </span>
                      )}
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none shrink-0" />
                      <input
                        type="email"
                        value={memberData.email}
                        onChange={(e) => setMemberData({ ...memberData, email: e.target.value.trim() })}
                        placeholder="เช่น doctor@hospital.com"
                        className={`w-full text-xs sm:text-sm py-2 pl-9 pr-3 rounded-xl border transition outline-none font-medium ${
                          isFieldEmpty(memberData.email)
                            ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                            : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. ข้อมูลสถานที่ทำงาน ตำแหน่ง และหลักฐานการทำงาน */}
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span>3. ข้อมูลสถานที่ทำงาน ตำแหน่ง และหลักฐานการทำงาน</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* สถานที่ทำงาน */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>สถานที่ทำงาน หรือ สถาบัน <span className="text-red-500">*</span></span>
                      {isFieldEmpty(memberData.workplace) && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          ⚠️ โปรดใส่ข้อมูล
                        </span>
                      )}
                    </label>
                    <div className="relative flex items-center">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none shrink-0" />
                      <input
                        type="text"
                        value={memberData.workplace}
                        onChange={(e) => setMemberData({ ...memberData, workplace: e.target.value })}
                        placeholder="เช่น โรงพยาบาลศิริราช หรือ คลินิก..."
                        className={`w-full text-xs sm:text-sm py-2 pl-9 pr-3 rounded-xl border transition outline-none font-medium ${
                          isFieldEmpty(memberData.workplace)
                            ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                            : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        }`}
                      />
                    </div>
                  </div>

                  {/* วันที่เริ่มปฏิบัติงาน */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      วันที่เริ่มปฏิบัติงาน
                    </label>
                    <ThaiDatePicker
                      value={memberData.work_start_date}
                      onChange={(val) => setMemberData({ ...memberData, work_start_date: val })}
                      outputFormat="iso"
                      placeholder="เลือกวันที่เริ่มปฏิบัติงาน"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* ตำแหน่งงาน */}
                <PositionSelect
                  value={memberData.position}
                  onChange={(val) => setMemberData({ ...memberData, position: val })}
                  otherValue={memberData.job_category_other}
                  onOtherChange={(val) => setMemberData({ ...memberData, job_category_other: val })}
                  showIcon={false}
                  showLabel={true}
                  label="ตำแหน่งงาน"
                  otherLabel="ระบุตำแหน่งงานเพิ่มเติม"
                  otherPlaceholder="ระบุตำแหน่งงานของคุณ..."
                  selectClassName="px-3.5 py-2 text-xs sm:text-sm font-semibold"
                />

                {/* เลขทะเบียนนักวิทย์ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>เลขทะเบียนนักวิทยาศาสตร์ (นว) หรือ เลขที่ใบประกอบวิชาชีพ</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      (จำเป็นสำหรับตำแหน่งแพทย์ RM และ Fellow RM หรือระบุถ้ามี)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={memberData.scientist_license_no}
                    onChange={(e) => setMemberData({ ...memberData, scientist_license_no: e.target.value })}
                    placeholder="เช่น วท.1234/2565"
                    className="w-full text-xs sm:text-sm py-2 px-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none font-medium"
                  />
                </div>

                {/* หลักฐานใบรับรองการทำงาน */}
                <div className="p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/50 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        หลักฐานใบรับรองการทำงาน
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                      ใบรับรองการทำงาน
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
                    {memberData.work_cert_doc ? (
                      isPdf(memberData.work_cert_doc) ? (
                        <div className="relative w-14 h-14 rounded-xl border border-rose-200 bg-rose-50 flex flex-col items-center justify-center text-rose-600 shrink-0 shadow-2xs">
                          <FileText className="w-6 h-6 text-rose-500" />
                          <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 mt-0.5">PDF</span>
                        </div>
                      ) : (
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 bg-slate-50 shrink-0 shadow-2xs">
                          <img
                            src={memberData.work_cert_doc}
                            alt="Work Cert"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 flex items-center justify-center text-indigo-500 shrink-0">
                        <FileCheck className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1 space-y-1 min-w-0">
                      {memberData.work_cert_doc ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>
                              {isPdf(memberData.work_cert_doc)
                                ? 'แนบเอกสาร PDF ใบรับรองการทำงานแล้ว'
                                : 'แนบรูปหลักฐานใบรับรองการทำงานเรียบร้อยแล้ว'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                          อัปโหลดใบรับรองการทำงาน (JPG, PNG หรือ PDF ขนาดไม่เกิน 10MB)
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {memberData.work_cert_doc && (
                          <a
                            href={memberData.work_cert_doc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 shadow-2xs transition active:scale-95"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>{isPdf(memberData.work_cert_doc) ? 'เปิดดู PDF' : 'ดูรูปภาพ'}</span>
                          </a>
                        )}

                        <label className="relative cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold border border-indigo-200 shadow-2xs transition active:scale-95">
                          <Upload className="w-3.5 h-3.5 text-blue-600" />
                          <span>
                            {uploadingWorkCert
                              ? 'กำลังอัปโหลด...'
                              : memberData.work_cert_doc
                              ? 'เปลี่ยนไฟล์'
                              : 'อัปโหลดใบรับรองการทำงาน'}
                          </span>
                          <input
                            type="file"
                            accept="image/*,application/pdf,.pdf"
                            onChange={handleMemberWorkCertUpload}
                            disabled={uploadingWorkCert}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </label>

                        {memberData.work_cert_doc && (
                          <button
                            type="button"
                            onClick={() => setMemberData({ ...memberData, work_cert_doc: '' })}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-200 transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>ลบเอกสาร</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. ประวัติการศึกษาและหลักฐานปริญญาบัตร */}
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                    <span>4. ประวัติการศึกษาและหลักฐานปริญญาบัตร</span>
                  </h5>
                  <button
                    type="button"
                    onClick={() => {
                      setMemberData({
                        ...memberData,
                        educations: [...memberData.educations, { degree: '', institution: '', graduation_year: '' }],
                      });
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มวุฒิการศึกษา</span>
                  </button>
                </div>

                {memberData.educations.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    ยังไม่มีข้อมูลประวัติการศึกษา สามารถกดปุ่ม &quot;เพิ่มวุฒิการศึกษา&quot; เพื่อระบุข้อมูลได้
                  </div>
                ) : (
                  <div className="space-y-2">
                    {memberData.educations.map((edu, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            placeholder="วุฒิการศึกษา (เช่น วท.บ., พ.บ.)"
                            value={edu.degree}
                            onChange={(e) => {
                              const newEdus = [...memberData.educations];
                              newEdus[idx].degree = e.target.value;
                              setMemberData({ ...memberData, educations: newEdus });
                            }}
                            className="w-full text-xs py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-medium"
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            placeholder="สถาบัน หรือ มหาวิทยาลัย"
                            value={edu.institution}
                            onChange={(e) => {
                              const newEdus = [...memberData.educations];
                              newEdus[idx].institution = e.target.value;
                              setMemberData({ ...memberData, educations: newEdus });
                            }}
                            className="w-full text-xs py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-medium"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="ปีที่จบ (พ.ศ.)"
                            value={edu.graduation_year || ''}
                            onChange={(e) => {
                              const newEdus = [...memberData.educations];
                              newEdus[idx].graduation_year = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setMemberData({ ...memberData, educations: newEdus });
                            }}
                            className="w-full text-xs py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <div className="sm:col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const newEdus = memberData.educations.filter((_, i) => i !== idx);
                              setMemberData({ ...memberData, educations: newEdus });
                            }}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* หลักฐานปริญญาบัตร */}
                <div className="p-3.5 rounded-2xl border border-blue-100 bg-blue-50/40 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        หลักฐานปริญญาบัตร
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                      ปริญญาบัตร
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
                    {memberData.degree_cert_doc ? (
                      isPdf(memberData.degree_cert_doc) ? (
                        <div className="relative w-14 h-14 rounded-xl border border-rose-200 bg-rose-50 flex flex-col items-center justify-center text-rose-600 shrink-0 shadow-2xs">
                          <FileText className="w-6 h-6 text-rose-500" />
                          <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 mt-0.5">PDF</span>
                        </div>
                      ) : (
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 bg-slate-50 shrink-0 shadow-2xs">
                          <img
                            src={memberData.degree_cert_doc}
                            alt="Degree Cert"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 flex items-center justify-center text-blue-500 shrink-0">
                        <FileCheck className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1 space-y-1 min-w-0">
                      {memberData.degree_cert_doc ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>
                              {isPdf(memberData.degree_cert_doc)
                                ? 'แนบเอกสาร PDF ปริญญาบัตรแล้ว'
                                : 'แนบรูปหลักฐานปริญญาบัตรแล้ว'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                          อัปโหลดรูปหลักฐานปริญญาบัตร (JPG, PNG หรือ PDF ขนาดไม่เกิน 10MB)
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {memberData.degree_cert_doc && (
                          <a
                            href={memberData.degree_cert_doc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 shadow-2xs transition active:scale-95"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>{isPdf(memberData.degree_cert_doc) ? 'เปิดดู PDF' : 'ดูรูปภาพ'}</span>
                          </a>
                        )}

                        <label className="relative cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold border border-blue-200 shadow-2xs transition active:scale-95">
                          <Upload className="w-3.5 h-3.5 text-blue-600" />
                          <span>
                            {uploadingDegreeCert
                              ? 'กำลังอัปโหลด...'
                              : memberData.degree_cert_doc
                              ? 'เปลี่ยนไฟล์'
                              : 'อัปโหลดปริญญาบัตร'}
                          </span>
                          <input
                            type="file"
                            accept="image/*,application/pdf,.pdf"
                            onChange={handleMemberDegreeCertUpload}
                            disabled={uploadingDegreeCert}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </label>

                        {memberData.degree_cert_doc && (
                          <button
                            type="button"
                            onClick={() => setMemberData({ ...memberData, degree_cert_doc: '' })}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-200 transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>ลบเอกสาร</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>



              {/* Save Button */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  type="submit"
                  disabled={savingMember}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {savingMember ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึกข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>บันทึกการเปลี่ยนแปลง</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STEP 3B: SPONSOR PAYMENT & SLIP VERIFICATION VIEW
             ═══════════════════════════════════════════════════════════ */}
          {step === 'sponsor_view' && sponsorData && (() => {
            const counts = sponsorData.peopleCounts || ({} as Partial<Record<PortalStatusKey, number>>);
            const totalPeople = sponsorData.groupMembers.length;
            // ลงทะเบียนสำเร็จ = อนุมัติแล้ว (รวมที่รอชำระเงิน) · รอตรวจสอบ = ยังไม่อนุมัติ
            const confirmedCount = (counts.confirmed || 0) + (counts.approved_awaiting_payment || 0);
            const inProgressCount =
              (counts.pending_payment_review || 0) +
              (counts.awaiting_payment || 0) +
              (counts.pending_review || 0);
            const rejectedCount = counts.rejected || 0;
            const awaitingItems = sponsorData.slips.filter(needsSlipUpload);
            const historySlips = sponsorData.slips.filter((s) => !needsSlipUpload(s));
            const overall = OVERALL_STATUS_INFO[sponsorData.paymentStatus] || OVERALL_STATUS_INFO.approved;

            const q = memberSearch.trim().toLowerCase();
            const filteredMembers = sponsorData.groupMembers.filter((m) => {
              const key = (m.statusKey || 'pending_review') as PortalStatusKey;
              const isRegistered = key === 'confirmed' || key === 'approved_awaiting_payment';
              if (memberFilter === 'confirmed' && !isRegistered) return false;
              if (memberFilter === 'rejected' && key !== 'rejected') return false;
              if (memberFilter === 'in_progress' && (isRegistered || key === 'rejected')) return false;
              if (!q) return true;
              return (
                m.attendee_name?.toLowerCase().includes(q) ||
                m.attendee_email?.toLowerCase().includes(q) ||
                String(m.member_no || '').toLowerCase().includes(q) ||
                String(m.ticket_code || '').toLowerCase().includes(q)
              );
            });
            const pageCount = Math.max(1, Math.ceil(filteredMembers.length / GROUP_MEMBERS_PAGE_SIZE));
            const currentPage = Math.min(groupMembersPage, pageCount);
            const pagedMembers = filteredMembers.slice(
              (currentPage - 1) * GROUP_MEMBERS_PAGE_SIZE,
              currentPage * GROUP_MEMBERS_PAGE_SIZE
            );
            const filterOptions: { id: typeof memberFilter; label: string; count: number }[] = [
              { id: 'all', label: lang === 'th' ? 'ทั้งหมด' : 'All', count: totalPeople },
              { id: 'confirmed', label: registrationStatusLabel('registered', lang), count: confirmedCount },
              { id: 'in_progress', label: registrationStatusLabel('pending', lang), count: inProgressCount },
              { id: 'rejected', label: registrationStatusLabel('rejected', lang), count: rejectedCount },
            ];

            return (
            <div className="space-y-5 sm:space-y-6">
              {/* ── ข้อมูลบริษัท และเวลาที่อัปเดตข้อมูล ── */}
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50/50 border border-indigo-100 rounded-2xl space-y-3">
                <div className="flex flex-col min-[480px]:flex-row min-[480px]:items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {sponsorData.tier && (
                        <span className="px-2.5 py-0.5 bg-indigo-600 text-white text-[11px] font-bold rounded-lg shadow-2xs">
                          {lang === 'th' ? `ระดับ ${sponsorData.tier}` : `Tier ${sponsorData.tier}`}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-lg break-all">
                        {lang === 'th' ? 'ผู้ประสานงาน' : 'Coordinator'} {sponsorData.contactEmail}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-base sm:text-lg break-words">{sponsorData.sponsorName}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => refreshSponsorData()}
                    disabled={refreshing}
                    className="shrink-0 self-start inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-700 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-60 w-full min-[480px]:w-auto"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing
                      ? (lang === 'th' ? 'กำลังโหลดข้อมูลล่าสุด...' : 'Refreshing...')
                      : (lang === 'th' ? 'โหลดข้อมูลล่าสุด' : 'Refresh')}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>
                    {lang === 'th' ? 'ข้อมูล ณ ' : 'As of '}
                    {formatThaiDateTime(sponsorData.generatedAt)}
                    {lang === 'th'
                      ? ' สถานะทั้งหมดดึงจากรายการลงทะเบียนล่าสุดที่เจ้าหน้าที่ตรวจสอบ หากเจ้าหน้าที่แก้ไขข้อมูล กดโหลดข้อมูลล่าสุดเพื่อดูการเปลี่ยนแปลง'
                      : ''}
                  </span>
                </p>
              </div>

              {portalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{portalError}</span>
                </div>
              )}

              {allSlipsSuccess && awaitingItems.length === 0 && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    <p className="font-extrabold text-emerald-800">ส่งสลิปทุกรายการเรียบร้อยแล้ว</p>
                    <p className="text-emerald-700 mt-0.5">เจ้าหน้าที่จะตรวจสอบยอดเงินและยืนยันภายใน 1-2 วันทำการ</p>
                  </div>
                </div>
              )}

              {/* ── สถานะภาพรวมและสรุปจำนวนผู้ลงทะเบียน ── */}
              <div className={`p-3.5 sm:p-4 rounded-2xl border-2 ${overall.box} space-y-3`}>
                <div className="flex items-start gap-2.5">
                  <overall.Icon className={`w-5 h-5 shrink-0 mt-0.5 ${overall.icon}`} />
                  <div className="min-w-0 text-xs">
                    <p className="font-black text-sm">{lang === 'th' ? overall.th : overall.en}</p>
                    <p className="mt-0.5 leading-relaxed opacity-90">
                      {lang === 'th' ? overall.descTh : overall.descEn}
                      {sponsorData.hasOutstanding && (sponsorData.outstandingAmount || 0) > 0 && (
                        <span className="font-bold">
                          {lang === 'th'
                            ? ` ยอดที่ต้องแนบสลิป ฿${(sponsorData.outstandingAmount || 0).toLocaleString()}`
                            : ` Amount due ฿${(sponsorData.outstandingAmount || 0).toLocaleString()}`}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: lang === 'th' ? 'ผู้ลงทะเบียน' : 'Registrants', value: totalPeople, tone: 'text-slate-900' },
                    { label: registrationStatusLabel('registered', lang), value: confirmedCount, tone: 'text-emerald-700' },
                    { label: registrationStatusLabel('pending', lang), value: inProgressCount, tone: 'text-amber-700' },
                    { label: registrationStatusLabel('rejected', lang), value: rejectedCount, tone: 'text-rose-700' },
                  ].map((c) => (
                    <div key={c.label} className="bg-white/80 border border-white rounded-xl px-3 py-2 min-w-0">
                      <span className="block text-[11px] text-slate-500 font-semibold truncate">{c.label}</span>
                      <span className={`block text-lg font-black tabular-nums ${c.tone}`}>
                        {c.value}
                        <span className="text-[11px] font-bold text-slate-400 ml-1">{lang === 'th' ? 'ท่าน' : ''}</span>
                      </span>
                    </div>
                  ))}
                </div>
                {(sponsorData.checkedInCount || 0) > 0 && (
                  <p className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    {lang === 'th'
                      ? `เช็กอินเข้างานแล้ว ${sponsorData.checkedInCount} ท่าน`
                      : `${sponsorData.checkedInCount} checked in`}
                  </p>
                )}
              </div>

              {/* ── โควต้าสิทธิ์ของบริษัท ── */}
              {sponsorData.quotas.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {sponsorData.quotas.map((q, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 min-w-0">
                      <span className="text-slate-500 font-medium block break-words">{q.meeting_name}</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-700 font-bold">{lang === 'th' ? 'โควต้าสิทธิ์คูปองบริษัท' : 'Coupon quota'}</span>
                        <span className="font-extrabold text-blue-700 whitespace-nowrap">{q.quota_seats} {lang === 'th' ? 'สิทธิ์' : 'seats'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-500">{lang === 'th' ? 'ใช้ไปแล้ว' : 'Used'} {q.used_seats}</span>
                        <span className="font-bold text-emerald-600">{lang === 'th' ? 'คงเหลือ' : 'Remaining'} {q.remaining_seats}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── ความหมายของสถานะ ── */}
              <details className="group rounded-2xl border border-slate-200 bg-white open:shadow-2xs">
                <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    {lang === 'th' ? 'ความหมายของสถานะและขั้นตอนการดำเนินการ' : 'What each status means'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <ul className="px-4 pb-4 space-y-2.5">
                  {PORTAL_STATUS_ORDER.map((k) => (
                    <li key={k} className="flex flex-col min-[480px]:flex-row min-[480px]:items-start gap-1.5 min-[480px]:gap-3 text-xs">
                      <span className="min-[480px]:w-56 shrink-0">
                        <PortalStatusBadge statusKey={k} lang={lang} />
                      </span>
                      <span className="text-slate-600 leading-relaxed">
                        {lang === 'th' ? PORTAL_STATUS_INFO[k].descTh : PORTAL_STATUS_INFO[k].descEn}
                      </span>
                    </li>
                  ))}
                  <li className="flex flex-col min-[480px]:flex-row min-[480px]:items-start gap-1.5 min-[480px]:gap-3 text-xs">
                    <span className="min-[480px]:w-56 shrink-0">
                      <CheckedInBadge lang={lang} />
                    </span>
                    <span className="text-slate-600 leading-relaxed">
                      {lang === 'th' ? 'ผู้ลงทะเบียนสแกนเข้างานเรียบร้อยแล้ว' : 'The attendee has checked in at the event.'}
                    </span>
                  </li>
                  <li className="text-[11px] text-slate-500 leading-relaxed pt-1 border-t border-slate-100">
                    {lang === 'th'
                      ? 'ใบเสร็จออกให้เมื่อเจ้าหน้าที่อนุมัติสิทธิ์ของรายการ หากต้องการเอกสารใบเสร็จ หรือพบข้อมูลไม่ตรงกับที่บริษัทแจ้งไว้ กรุณาติดต่อเจ้าหน้าที่สมาคมฯ พร้อมแจ้งรหัสรายการ'
                      : 'Receipts are issued when a registration is approved. Contact the association with the reference code for receipt documents or corrections.'}
                  </li>
                </ul>
              </details>

              {/* ── รายการที่ต้องแนบสลิป หรือถูกส่งกลับให้แก้ไข ── */}
              {awaitingItems.length > 0 && (
                <div className="space-y-4 border-2 border-sky-300 bg-gradient-to-br from-sky-50/70 via-blue-50/40 to-white rounded-3xl p-3.5 sm:p-5 shadow-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                        {lang === 'th' ? 'รายการที่ต้องแนบสลิปการชำระเงิน' : 'Items awaiting payment slip'}
                      </h4>
                      <p className="text-xs text-sky-800 font-semibold">
                        {lang === 'th'
                          ? `แนบสลิปให้ครบทุกรายการ ${awaitingItems.length} รายการ แล้วกดยืนยันด้านล่าง`
                          : `Attach a slip for each of the ${awaitingItems.length} items, then confirm below`}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {awaitingItems.map((slip, idx) => {
                      const key = slip.slip_id || slip.ticket_code || String(idx);
                      const form = slipForms[key] ?? initSlipForm(slip.amount || 0, slip.ticket_code || slip.slip_id || '');
                      const statusKey = (slip.statusKey || 'pending_review') as PortalStatusKey;
                      const names = slip.attendeeNames || [];
                      return (
                        <div key={key} className={`bg-white border-2 rounded-2xl shadow-xs overflow-hidden ${statusKey === 'rejected' ? 'border-rose-200' : 'border-sky-200'}`}>
                          <div className={`p-3.5 sm:p-4 flex flex-col min-[480px]:flex-row min-[480px]:items-start justify-between gap-3 border-b ${statusKey === 'rejected' ? 'border-rose-100 bg-rose-50/40' : 'border-sky-100 bg-sky-50/50'}`}>
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-xs font-extrabold bg-white text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                                  {slip.ticket_code || slip.slip_id}
                                </span>
                                <PortalStatusBadge statusKey={statusKey} lang={lang} membership={Boolean(slip.isMembership)} />
                              </div>
                              <h5 className="font-bold text-xs sm:text-sm text-slate-800 leading-snug break-words">
                                {slip.title || slip.meeting_name}
                              </h5>
                              <p className="text-[11px] text-slate-500 break-words">
                                {slip.meeting_name}
                                {slip.receipt_no ? ` • ${lang === 'th' ? 'ใบเสร็จเลขที่' : 'Receipt'} ${slip.receipt_no}` : ''}
                              </p>
                              {names.length > 0 && (
                                <p className="text-[11px] text-slate-600 break-words">
                                  <span className="font-semibold">{lang === 'th' ? 'ผู้ลงทะเบียน: ' : 'Attendees: '}</span>
                                  {names.slice(0, 3).join(', ')}
                                  {names.length > 3 && (lang === 'th' ? ` และอีก ${names.length - 3} ท่าน` : ` and ${names.length - 3} more`)}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 min-[480px]:text-right">
                              <span className="text-[10px] text-slate-500 block font-medium">{lang === 'th' ? 'ยอดเงินที่ต้องชำระ' : 'Amount due'}</span>
                              <span className="text-xl font-black text-sky-700">฿{slip.amount.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="p-3.5 sm:p-4 bg-white space-y-3">
                            {statusKey === 'rejected' && (
                              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                                <p className="font-bold flex items-center gap-1.5">
                                  <AlertTriangle className="w-4 h-4 shrink-0" />
                                  {lang === 'th' ? 'เจ้าหน้าที่ส่งรายการนี้กลับให้แก้ไข' : 'Returned for correction'}
                                </p>
                                {slip.rejection_reason && (
                                  <p className="break-words">
                                    <span className="font-semibold">{lang === 'th' ? 'เหตุผล: ' : 'Reason: '}</span>
                                    {slip.rejection_reason}
                                  </p>
                                )}
                                <p className="text-rose-700/90">
                                  {lang === 'th'
                                    ? 'ระบบยังถือสิทธิ์และที่นั่งไว้ให้ระหว่างรอแก้ไข กรุณาแนบสลิปใหม่ หรือติดต่อเจ้าหน้าที่หากต้องแก้ไขรายชื่อ'
                                    : 'Seats and rights are held while you fix this. Attach a new slip or contact staff to change attendees.'}
                                </p>
                              </div>
                            )}
                            {statusKey === 'awaiting_payment' && (
                              <p className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                                {lang === 'th'
                                  ? 'รายการนี้ยังรอเจ้าหน้าที่อนุมัติสิทธิ์ บริษัทแนบสลิปล่วงหน้าได้ เจ้าหน้าที่จะตรวจสอบพร้อมกัน'
                                  : 'Awaiting approval. You may attach the slip in advance.'}
                              </p>
                            )}
                            {form.errorMsg && (
                              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <span>{form.errorMsg}</span>
                              </div>
                            )}
                            {form.success ? (
                              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="font-bold">แนบสลิปเรียบร้อยแล้ว รอเจ้าหน้าที่ตรวจสอบ</span>
                              </div>
                            ) : (
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  แนบรูปภาพสลิปโอนเงิน
                                  <span className="ml-1 text-red-500 font-extrabold">* บังคับแนบ</span>
                                </label>
                                <div
                                  className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition relative ${
                                    form.file ? 'border-emerald-400 bg-emerald-50/30' : 'border-blue-300 hover:border-blue-500 bg-white'
                                  }`}
                                >
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) {
                                        updateSlipForm(key, { file: f, preview: URL.createObjectURL(f), errorMsg: '' });
                                      }
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  />
                                  {form.preview ? (
                                    <div className="flex flex-col items-center gap-2">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={form.preview} alt="Slip preview" className="max-h-48 max-w-full rounded-lg object-contain border shadow-sm" />
                                      <span className="text-xs text-blue-600 font-bold flex items-center gap-1">
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        ไฟล์สลิปพร้อมส่ง แตะเพื่อเปลี่ยนรูปภาพ
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-1.5 text-slate-500">
                                      <Upload className="w-7 h-7 text-blue-500" />
                                      <span className="text-xs font-bold text-slate-700">แตะหรือลากไฟล์ภาพสลิปมาวางที่นี่</span>
                                      <span className="text-[11px] text-slate-400">รองรับไฟล์ JPG และ PNG ขนาดไม่เกิน 10MB</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSubmitAllSlips}
                      disabled={submittingAll}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-sm font-extrabold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {submittingAll ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>กำลังอัปโหลดสลิป...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>ยืนยันการแนบสลิปการชำระเงิน</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── รายชื่อผู้ลงทะเบียนของบริษัท ── */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>
                    {lang === 'th' ? `รายชื่อผู้ลงทะเบียนในนามบริษัท ${totalPeople} ท่าน` : `Registrants ${totalPeople}`}
                  </span>
                </h5>

                {totalPeople > 0 && (
                  <div className="space-y-2">
                    <input
                      type="search"
                      value={memberSearch}
                      onChange={(e) => {
                        setMemberSearch(e.target.value);
                        setGroupMembersPage(1);
                      }}
                      placeholder={lang === 'th' ? 'ค้นหาชื่อ เลขสมาชิก อีเมล หรือรหัสรายการ' : 'Search name, member no, email or code'}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                      {filterOptions.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setMemberFilter(f.id);
                            setGroupMembersPage(1);
                          }}
                          className={`shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                            memberFilter === f.id
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                          }`}
                        >
                          {f.label} {f.count}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {totalPeople === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    {lang === 'th' ? 'ยังไม่มีผู้ลงทะเบียนในนามบริษัทนี้' : 'No registrants yet'}
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    {lang === 'th' ? 'ไม่พบรายชื่อตามเงื่อนไขที่เลือก' : 'No matching registrants'}
                  </div>
                ) : (
                  <>
                    <ul className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                      {pagedMembers.map((m, idx) => {
                        const hasMemberNo = Boolean(m.member_no && m.member_no !== '-');
                        const hasEmail = Boolean(m.attendee_email && m.attendee_email !== '-');
                        const statusKey = (m.statusKey || 'pending_review') as PortalStatusKey;
                        const regs = m.registrations || [];
                        const rejectedRegs = regs.filter((r) => r.statusKey === 'rejected' && r.rejectionReason);
                        return (
                          <li key={`${m.id}-${idx}`} className="p-3 sm:p-3.5 space-y-2.5 text-xs">
                            <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-start justify-between gap-2">
                              <div className="min-w-0 space-y-0.5">
                                <p className="font-bold text-slate-800 text-[13px] leading-snug break-words">{m.attendee_name}</p>
                                <p className="text-slate-500 break-all leading-snug">
                                  {hasMemberNo ? (
                                    <span className="font-bold text-blue-700">{lang === 'th' ? 'สมาชิก' : 'Member'} #{m.member_no}</span>
                                  ) : (
                                    <span className="font-semibold text-slate-600">{lang === 'th' ? 'บุคคลทั่วไป' : 'Non-member'}</span>
                                  )}
                                  {hasEmail && <span className="mx-1.5 text-slate-300">•</span>}
                                  {hasEmail && m.attendee_email}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 min-[420px]:justify-end min-[420px]:max-w-[55%]">
                                <PortalStatusBadge statusKey={statusKey} lang={lang} membership={Boolean(m.isMembershipOnly)} />
                                {m.checkedIn && <CheckedInBadge lang={lang} time={m.checkinTime} />}
                              </div>
                            </div>

                            <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2 space-y-1.5">
                              {m.programs && m.programs.length > 0 ? (
                                <ul className="space-y-1.5">
                                  {m.programs.map((p, pIdx) => (
                                    <li key={pIdx} className="flex items-start gap-2 text-slate-700">
                                      <span
                                        className={`shrink-0 w-[52px] text-center py-0.5 rounded text-[10px] font-bold border ${
                                          p.format === 'online'
                                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                                            : 'bg-amber-50 text-amber-800 border-amber-200'
                                        }`}
                                      >
                                        {p.format === 'online' ? (lang === 'th' ? 'ออนไลน์' : 'Online') : (lang === 'th' ? 'ออนไซต์' : 'Onsite')}
                                      </span>
                                      <span className="leading-snug pt-px break-words min-w-0 flex-1">
                                        {p.name}
                                        {p.isFellow && (
                                          <span className="ml-1.5 inline-block px-1.5 py-px rounded bg-lime-50 text-lime-800 border border-lime-200 text-[10px] font-bold align-middle">
                                            {lang === 'th' ? 'ราคา fellow' : 'Fellow rate'}
                                          </span>
                                        )}
                                      </span>
                                      {typeof p.price === 'number' && (
                                        <span className="shrink-0 pt-px font-semibold text-slate-600 whitespace-nowrap">
                                          {p.price > 0 ? `฿${p.price.toLocaleString()}` : (lang === 'th' ? 'ฟรี' : 'Free')}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : m.isMembershipOnly ? (
                                <span className="inline-flex items-center gap-1.5 text-purple-700 font-semibold">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  {lang === 'th' ? 'สมัครสมาชิกใหม่' : 'New membership'}
                                </span>
                              ) : (
                                <span className="text-slate-400">{lang === 'th' ? 'ไม่พบรายการที่ลงทะเบียน' : 'No registered programs found'}</span>
                              )}
                              {(m.hasPrice || regs.length > 0) && (
                                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1.5 border-t border-slate-200/70 text-[11px]">
                                  <span className="text-slate-500 break-all">
                                    {lang === 'th' ? 'รายการ ' : 'Ref '}
                                    {regs.map((r) => r.ticketCode).filter((c) => c && c !== '-').join(', ') || (lang === 'th' ? 'บันทึกโดยเจ้าหน้าที่' : 'Recorded by staff')}
                                  </span>
                                  {m.hasPrice && (
                                    <span className="font-bold text-slate-700 whitespace-nowrap">
                                      {lang === 'th' ? 'ยอดสุทธิ ' : 'Net '}
                                      {m.net_price > 0 ? `฿${m.net_price.toLocaleString()}` : (lang === 'th' ? 'ฟรี' : 'Free')}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {rejectedRegs.map((r) => (
                              <p key={r.ticketCode} className="px-2.5 py-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-800 break-words">
                                <span className="font-bold">{lang === 'th' ? `เหตุผลที่ต้องแก้ไข ${r.ticketCode}: ` : `Reason ${r.ticketCode}: `}</span>
                                {r.rejectionReason}
                              </p>
                            ))}

                            {m.notes && m.notes.length > 0 && (
                              <ul className="space-y-1">
                                {m.notes.map((note, nIdx) => (
                                  <li key={nIdx} className="flex items-start gap-1.5 text-[11px] text-slate-600 leading-snug">
                                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-px" />
                                    <span className="break-words min-w-0">{note}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {filteredMembers.length > GROUP_MEMBERS_PAGE_SIZE && (
                      <PaginationControls
                        currentPage={currentPage}
                        totalItems={filteredMembers.length}
                        pageSize={GROUP_MEMBERS_PAGE_SIZE}
                        onPageChange={setGroupMembersPage}
                        itemLabel="ท่าน"
                      />
                    )}
                  </>
                )}
              </div>

              {/* ── ประวัติรายการชำระเงิน (ไม่รวมรายการที่ต้องแนบสลิป ซึ่งแสดงด้านบนแล้ว) ── */}
              {historySlips.length > 0 && (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>{lang === 'th' ? `รายการชำระเงินของบริษัท ${historySlips.length} รายการ` : `Payment records ${historySlips.length}`}</span>
                  </h5>
                  <div className="space-y-2">
                    {historySlips.map((s, idx) => {
                      const statusKey = (s.statusKey || 'pending_review') as PortalStatusKey;
                      return (
                        <div key={s.slip_id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col min-[480px]:flex-row min-[480px]:items-start justify-between text-xs gap-2.5">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-slate-700">{s.ticket_code || s.slip_id}</span>
                              <PortalStatusBadge statusKey={statusKey} lang={lang} membership={Boolean(s.isMembership)} />
                            </div>
                            <p className="text-slate-600 break-words">{s.title || s.meeting_name}</p>
                            <p className="text-slate-500 text-[11px] break-words">
                              {s.isPayLater && !s.hasActualSlip ? 'ชำระเงินภายหลัง' : s.bank || '-'} • ฿{s.amount.toLocaleString()}
                              {s.transfer_date ? ` • ${s.transfer_date} ${s.transfer_time || ''}` : ''}
                              {s.receipt_no ? ` • ${lang === 'th' ? 'ใบเสร็จเลขที่' : 'Receipt'} ${s.receipt_no}` : ''}
                            </p>
                            <p className="text-slate-500 text-[11px] leading-relaxed">
                              {lang === 'th' ? PORTAL_STATUS_INFO[statusKey].descTh : PORTAL_STATUS_INFO[statusKey].descEn}
                            </p>
                          </div>
                          {s.slip_url && (
                            <a
                              href={s.slip_url}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 self-start px-2.5 py-1.5 bg-white border border-slate-300 hover:border-blue-500 text-blue-600 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
                            >
                              <span>{lang === 'th' ? 'ดูสลิป' : 'View slip'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-200 flex flex-col-reverse min-[480px]:flex-row min-[480px]:items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500">
                  {lang === 'th'
                    ? 'หากข้อมูลไม่ตรงกับที่บริษัทแจ้งไว้ กรุณาติดต่อเจ้าหน้าที่สมาคมฯ พร้อมรหัสรายการ'
                    : 'If anything looks wrong, contact the association with the reference code.'}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 px-5 py-2 text-xs sm:text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
            );
          })()}
        </div>
      </div>
    </div>,
    document.body
  );
}
