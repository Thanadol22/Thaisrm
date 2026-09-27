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
} from 'lucide-react';
import { PositionSelect } from '@/components/PositionSelect';
import { SmartEmailInput } from '@/components/SmartEmailInput';
import { ThaiDatePicker } from '@/components/ThaiDatePicker';
import { uploadImageToStorage } from '@/lib/blobUpload';

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
  itemStatus?: 'approved' | 'approved_awaiting_payment' | 'pending_review' | 'rejected' | 'awaiting_payment';
  isPayLater?: boolean;
  hasActualSlip?: boolean;
  requiresSlipUpload?: boolean;
  rejection_reason?: string | null;
  attendeesCount?: number;
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
  paymentStatus: 'approved' | 'approved_awaiting_payment' | 'pending_review' | 'rejected' | 'unpaid' | 'free_quota';
}

interface ProfileAndSponsorUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'th' | 'en';
}

export function ProfileAndSponsorUpdateModal({
  isOpen,
  onClose,
  lang = 'th',
}: ProfileAndSponsorUpdateModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'email' | 'otp' | 'member_view' | 'sponsor_view'>('email');
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
  const [selectedSlipToUpload, setSelectedSlipToUpload] = useState<SponsorSlip | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipBank, setSlipBank] = useState('Kasikorn (KBANK)');
  const [slipDate, setSlipDate] = useState(new Date().toISOString().split('T')[0]);
  const [slipTime, setSlipTime] = useState(
    new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [slipAmount, setSlipAmount] = useState<number>(0);
  const [slipRef, setSlipRef] = useState('');
  const [submittingSlip, setSubmittingSlip] = useState(false);
  const [slipSubmitSuccess, setSlipSubmitSuccess] = useState(false);

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
      setSelectedSlipToUpload(null);
      setSaveSuccess(false);
      setSlipSubmitSuccess(false);
      setSlipFile(null);
    }
  }, [isOpen]);

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
        setSlipAmount(data.data.totalAmount || 0);
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

  // เมื่อเลือกรายการที่จะแนบสลิป
  const handleSelectSlipToUpload = (slip: SponsorSlip) => {
    setSelectedSlipToUpload(slip);
    setSlipAmount(slip.amount || 0);
    setSlipBank('Kasikorn (KBANK)');
    setSlipDate(new Date().toISOString().split('T')[0]);
    setSlipTime(
      new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
    );
    setSlipRef(slip.ticket_code || slip.slip_id || '');
    setSlipFile(null);
    setSlipPreview(null);
    setErrorMsg('');
    setSlipSubmitSuccess(false);
  };

  // 4. อัปโหลดสลิปสำหรับสปอนเซอร์ (รองรับทั้งแยกรายรายการและทั่วไป)
  const handleUploadSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorData) return;
    if (!slipFile) {
      setErrorMsg(lang === 'th' ? 'กรุณาเลือกไฟล์รูปภาพสลิปโอนเงิน' : 'Please select a slip image');
      return;
    }

    setSubmittingSlip(true);
    setErrorMsg('');

    try {
      // 1. Upload image
      const uploadRes = await uploadImageToStorage(slipFile, 'slips');
      if (!uploadRes?.url) {
        throw new Error(lang === 'th' ? 'ไม่สามารถอัปโหลดรูปภาพสลิปได้' : 'Failed to upload slip image');
      }

      // 2. Submit slip metadata
      const activeMeetingId = selectedSlipToUpload?.meeting_id || sponsorData.quotas[0]?.meeting_id || 'TSRM34';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      const res = await fetch('/api/sponsors/portal/upload-slip', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sponsorId: sponsorData.sponsorId,
          sponsorName: sponsorData.sponsorName,
          contactEmail: sponsorData.contactEmail,
          meetingId: activeMeetingId,
          amount: slipAmount,
          bank: slipBank,
          transfer_date: slipDate,
          transfer_time: slipTime,
          slip_url: uploadRes.url,
          ref_no: slipRef,
          targetSlipId: selectedSlipToUpload?.slip_id,
          targetTicketCode: selectedSlipToUpload?.ticket_code,
          sessionToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || (lang === 'th' ? 'ส่งสลิปไม่สำเร็จ' : 'Failed to submit slip'));
        return;
      }

      setSlipSubmitSuccess(true);

      // อัปเดตสถานะของ Slip ใน state ทันที
      const updatedSlips = sponsorData.slips.map((s) => {
        if (
          (selectedSlipToUpload?.slip_id && s.slip_id === selectedSlipToUpload.slip_id) ||
          (selectedSlipToUpload?.ticket_code && s.ticket_code === selectedSlipToUpload.ticket_code)
        ) {
          return {
            ...s,
            slip_url: uploadRes.url,
            bank: slipBank,
            amount: slipAmount,
            transfer_date: slipDate,
            transfer_time: slipTime,
            status: 'pending',
            itemStatus: 'pending_review' as const,
            hasActualSlip: true,
            requiresSlipUpload: false,
          };
        }
        return s;
      });

      const existsInList = updatedSlips.some(
        (s) => s.slip_id === (data.slip?.slip_id || selectedSlipToUpload?.slip_id)
      );
      const finalSlips = existsInList ? updatedSlips : [data.slip, ...updatedSlips];
      const remainingAwaiting = finalSlips.filter((s) => s.requiresSlipUpload);

      setSponsorData({
        ...sponsorData,
        slips: finalSlips,
        awaitingPaymentSlips: remainingAwaiting,
        hasOutstanding: remainingAwaiting.length > 0,
        paymentStatus: remainingAwaiting.length > 0 ? 'approved_awaiting_payment' : 'pending_review',
      });

      setTimeout(() => {
        setSelectedSlipToUpload(null);
        setSlipFile(null);
        setSlipPreview(null);
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || (lang === 'th' ? 'เกิดข้อผิดพลาดในการแนบสลิป' : 'Error submitting slip'));
    } finally {
      setSubmittingSlip(false);
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
                  ? `บริษัท: ${sponsorData?.sponsorName} (${sponsorData?.tier})`
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
                      <span>{lang === 'th' ? 'กำลังตรวจสอบ...' : 'Verifying...'}</span>
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
                      {memberData.membership_type} • {memberData.membership_status}
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
          {step === 'sponsor_view' && sponsorData && (
            <div className="space-y-6">
              {/* Sponsor Profile Overview */}
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50/50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-2xs">
                      Tier: {sponsorData.tier}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-lg">
                      ตัวแทน: {sponsorData.contactEmail}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-base sm:text-lg mt-1.5">
                    {sponsorData.sponsorName}
                  </h4>
                </div>

                {/* Overall Financial Status Badge */}
                <div className="shrink-0">
                  {sponsorData.paymentStatus === 'approved_awaiting_payment' || sponsorData.paymentStatus === 'unpaid' ? (
                    <div className="bg-sky-50 border-2 border-sky-300 px-3.5 py-2.5 rounded-2xl text-sky-900 text-xs flex items-center gap-2.5 shadow-xs">
                      <CreditCard className="w-5 h-5 text-sky-700 shrink-0" />
                      <div>
                        <span className="font-black text-sky-900 block text-xs sm:text-sm">
                          {lang === 'th' ? '✓ อนุมัติสิทธิ์แล้ว (รอชำระเงิน)' : '✓ Access Approved (Awaiting Payment)'}
                        </span>
                        <span className="text-[11px] text-sky-700 font-bold">
                          {lang === 'th'
                            ? `มียอดรอชำระเงิน รวม ฿${(sponsorData.outstandingAmount || sponsorData.totalAmount).toLocaleString()} บาท`
                            : `Total Awaiting Payment: ฿${(sponsorData.outstandingAmount || sponsorData.totalAmount).toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  ) : sponsorData.paymentStatus === 'pending_review' ? (
                    <div className="bg-amber-500/10 border border-amber-300 px-3 py-2 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold block">อยู่ระหว่างตรวจสอบสลิป</span>
                        <span className="text-[11px] text-amber-700">เจ้าหน้าที่กำลังตรวจสอบรายการ</span>
                      </div>
                    </div>
                  ) : sponsorData.paymentStatus === 'rejected' ? (
                    <div className="bg-red-500/10 border border-red-300 px-3 py-2 rounded-xl text-red-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <div>
                        <span className="font-bold block">สลิปไม่ผ่านการอนุมัติ</span>
                        <span className="text-[11px] text-red-700">โปรดแนบหลักฐานสลิปใหม่</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/10 border border-emerald-300 px-3 py-2 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold block">ชำระเงินเรียบร้อยแล้ว</span>
                        <span className="text-[11px] text-emerald-700">ไม่มียอดรอชำระ</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quota Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                {sponsorData.quotas.map((q, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <span className="text-slate-500 font-medium truncate block">{q.meeting_name}</span>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-bold">โควต้าสิทธิ์:</span>
                      <span className="font-extrabold text-blue-700">{q.quota_seats} ที่นั่ง</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">ใช้ไปแล้ว: {q.used_seats}</span>
                      <span className="font-bold text-emerald-600">คงเหลือ: {q.remaining_seats}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ═══════════════════════════════════════════════════════════
                  SECTION: รายการที่เป็นสถานะ "อนุมัติสิทธิ์รอชำระ" พร้อมบังคับแนบสลิปในแต่ละรายการ
                 ═══════════════════════════════════════════════════════════ */}
              {sponsorData.slips.some((s) => s.requiresSlipUpload || s.itemStatus === 'approved_awaiting_payment' || s.itemStatus === 'awaiting_payment' || s.itemStatus === 'rejected') && (
                <div className="space-y-4 border-2 border-sky-300 bg-gradient-to-br from-sky-50/70 via-blue-50/40 to-white rounded-3xl p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                          {lang === 'th' ? 'รายการอนุมัติสิทธิ์รอชำระเงิน' : 'Items Approved & Awaiting Payment'}
                        </h4>
                        <p className="text-xs text-sky-800 font-semibold">
                          {lang === 'th'
                            ? 'กรุณาแนบสลิปการโอนเงินแยกสำหรับแต่ละรายการด้านล่างนี้'
                            : 'Please upload the payment slip for each item below.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cards for each awaiting item */}
                  <div className="space-y-3">
                    {sponsorData.slips
                      .filter((s) => s.requiresSlipUpload || s.itemStatus === 'approved_awaiting_payment' || s.itemStatus === 'awaiting_payment' || s.itemStatus === 'rejected')
                      .map((slip, idx) => {
                        const isSelected = selectedSlipToUpload?.slip_id === slip.slip_id || selectedSlipToUpload?.ticket_code === slip.ticket_code;
                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-2xl border transition-all ${
                              isSelected
                                ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-200'
                                : 'bg-white/90 border-slate-200 hover:border-blue-300 shadow-2xs'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-extrabold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200">
                                    {slip.ticket_code || slip.slip_id}
                                  </span>

                                  {/* Status Badge */}
                                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300 inline-flex items-center gap-1 shadow-2xs">
                                    ✓ {lang === 'th' ? 'อนุมัติสิทธิ์แล้ว (รอชำระเงิน)' : 'Access Approved (Awaiting Payment)'}
                                  </span>

                                  {slip.ticket_code?.startsWith('MEMGRP') ? (
                                    <span className="text-[10px] font-bold bg-purple-50 text-purple-800 px-2 py-0.5 rounded-md border border-purple-200 flex items-center gap-1">
                                      <Sparkles className="w-3 h-3 text-purple-600" />
                                      <span>คำขอสมัครสมาชิกใหม่</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                                      <Building2 className="w-3 h-3 text-blue-600" />
                                      <span>กลุ่มสมาชิก ({slip.attendeesCount || 2} ท่าน)</span>
                                    </span>
                                  )}
                                </div>

                                <h5 className="font-bold text-xs sm:text-sm text-slate-800 leading-snug">
                                  {slip.title || slip.meeting_name}
                                </h5>

                                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                  <span>{slip.meeting_name}</span>
                                  <span>•</span>
                                  <span>Ref: {slip.slip_id}</span>
                                </div>
                              </div>

                              {/* Amount & Action Button */}
                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                <div className="text-left sm:text-right">
                                  <span className="text-[10px] text-slate-500 block font-medium">ยอดเงินที่ต้องชำระ</span>
                                  <span className="text-base sm:text-lg font-black text-slate-900">
                                    ฿{slip.amount.toLocaleString()} <span className="text-xs font-bold text-slate-500">THB</span>
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleSelectSlipToUpload(slip)}
                                  className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-600 text-white shadow-blue-200'
                                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                                  }`}
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>{isSelected ? 'กำลังแนบสลิปรายการนี้' : 'แนบสลิปชำระเงิน'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Expandable Upload Form directly for this selected item */}
                            {isSelected && (
                              <form onSubmit={handleUploadSlip} className="mt-4 pt-4 border-t border-blue-100 space-y-4 bg-blue-50/50 -mx-4 -mb-4 p-4 rounded-b-2xl animate-fade-in">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 font-bold text-blue-900 text-xs sm:text-sm">
                                    <Upload className="w-4 h-4 text-blue-600" />
                                    <span>แนบสลิปโอนเงินสำหรับ: {slip.ticket_code || slip.slip_id} (฿{slip.amount.toLocaleString()} บาท)</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSlipToUpload(null)}
                                    className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
                                  >
                                    ปิดฟอร์ม
                                  </button>
                                </div>

                                {errorMsg && (
                                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <span>{errorMsg}</span>
                                  </div>
                                )}

                                {slipSubmitSuccess && (
                                  <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="font-bold">แนบสลิปเรียบร้อยแล้ว อยู่ระหว่างเจ้าหน้าที่ตรวจสอบ</span>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {/* ยอดเงิน */}
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                      ยอดเงินที่โอน (บาท) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={slipAmount}
                                      onChange={(e) => setSlipAmount(Number(e.target.value))}
                                      className="w-full text-xs sm:text-sm py-2 px-3 rounded-xl border border-slate-300 focus:border-blue-500 bg-white font-bold text-slate-800"
                                      required
                                    />
                                  </div>

                                  {/* ธนาคารที่โอน */}
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                      ธนาคารที่โอน <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                      value={slipBank}
                                      onChange={(e) => setSlipBank(e.target.value)}
                                      className="w-full text-xs sm:text-sm py-2 px-3 rounded-xl border border-slate-300 focus:border-blue-500 bg-white font-medium"
                                    >
                                      <option value="Kasikorn (KBANK)">ธนาคารกสิกรไทย (KBANK)</option>
                                      <option value="Siam Commercial (SCB)">ธนาคารไทยพาณิชย์ (SCB)</option>
                                      <option value="Bangkok Bank (BBL)">ธนาคารกรุงเทพ (BBL)</option>
                                      <option value="Krungthai (KTB)">ธนาคารกรุงไทย (KTB)</option>
                                      <option value="TTB">ธนาคารทหารไทยธนชาต (TTB)</option>
                                      <option value="PromptPay">พร้อมเพย์ (PromptPay)</option>
                                      <option value="Other">อื่นๆ</option>
                                    </select>
                                  </div>

                                  {/* วันที่โอน */}
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                      วันที่โอนเงิน <span className="text-red-500">*</span>
                                    </label>
                                    <ThaiDatePicker
                                      value={slipDate}
                                      onChange={setSlipDate}
                                      outputFormat="iso"
                                      placeholder="เลือกวันที่โอนเงิน"
                                      required
                                      className="w-full"
                                    />
                                  </div>

                                  {/* เวลาที่โอน */}
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                      เวลาที่โอน (เช่น 14:30) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={slipTime}
                                      onChange={(e) => setSlipTime(e.target.value)}
                                      placeholder="14:30"
                                      className="w-full text-xs sm:text-sm py-2 px-3 rounded-xl border border-slate-300 focus:border-blue-500 bg-white"
                                      required
                                    />
                                  </div>

                                  {/* เลขที่อ้างอิง */}
                                  <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                      เลขอ้างอิง / หมายเหตุ
                                    </label>
                                    <input
                                      type="text"
                                      value={slipRef}
                                      onChange={(e) => setSlipRef(e.target.value)}
                                      placeholder="เช่น รหัสธุรกรรม หรือ เลขที่ใบเสนอราคา"
                                      className="w-full text-xs sm:text-sm py-2 px-3 rounded-xl border border-slate-300 focus:border-blue-500 bg-white"
                                    />
                                  </div>

                                  {/* แนบไฟล์รูปภาพสลิป */}
                                  <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                      แนบรูปภาพสลิปโอนเงิน (JPG, PNG) <span className="text-red-500">* (บังคับแนบสลิป)</span>
                                    </label>
                                    <div className="border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-xl p-4 text-center bg-white cursor-pointer transition relative">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            setSlipFile(file);
                                            setSlipPreview(URL.createObjectURL(file));
                                          }
                                        }}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        required
                                      />
                                      {slipPreview ? (
                                        <div className="flex flex-col items-center gap-2">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={slipPreview} alt="Slip preview" className="max-h-36 rounded-lg object-contain border" />
                                          <span className="text-xs text-blue-600 font-bold">คลิกเพื่อเปลี่ยนรูปภาพสลิป</span>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col items-center gap-1.5 text-slate-500">
                                          <Upload className="w-6 h-6 text-blue-500" />
                                          <span className="text-xs font-bold text-slate-700">คลิกหรือลากไฟล์ภาพสลิปโอนเงินมาวางที่นี่</span>
                                          <span className="text-[11px] text-slate-400">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 10MB</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-2 flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSlipToUpload(null)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer"
                                  >
                                    ยกเลิก
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={submittingSlip || !slipFile}
                                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                                  >
                                    {submittingSlip ? (
                                      <>
                                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>กำลังอัปโหลดสลิป...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>ยืนยันการแนบสลิปชำระเงิน</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* รายชื่อสมาชิกที่บริษัทส่งเข้าร่วม (Group Members List) */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>รายชื่อสมาชิกที่บริษัทลงทะเบียน ({sponsorData.groupMembers.length} ท่าน)</span>
                </h5>

                {sponsorData.groupMembers.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    ยังไม่มีรายชื่อสมาชิกที่ลงทะเบียนในนามบริษัทนี้
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">เลขสมาชิก</th>
                          <th className="p-2.5">ชื่อ-นามสกุล</th>
                          <th className="p-2.5">อีเมล</th>
                          <th className="p-2.5">Ticket Code</th>
                          <th className="p-2.5 text-right">ยอดสุทธิ</th>
                          <th className="p-2.5 text-center">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sponsorData.groupMembers.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="p-2.5 font-bold text-blue-700">#{m.member_no}</td>
                            <td className="p-2.5 font-medium text-slate-800">{m.attendee_name}</td>
                            <td className="p-2.5 text-slate-500">{m.attendee_email}</td>
                            <td className="p-2.5 font-mono text-slate-600">{m.ticket_code || '-'}</td>
                            <td className="p-2.5 text-right font-bold text-slate-700">
                              {m.net_price > 0 ? `฿${m.net_price.toLocaleString()}` : 'ฟรี (โควต้า)'}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[11px] font-semibold">
                                {m.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ประวัติสลิปที่เคยส่ง (Slip History) */}
              {sponsorData.slips.length > 0 && (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>ประวัติรายการสลิปและการชำระเงิน ({sponsorData.slips.length} รายการ)</span>
                  </h5>

                  <div className="space-y-2">
                    {sponsorData.slips.map((s, idx) => {
                      const isPayLaterAwaiting = s.itemStatus === 'approved_awaiting_payment' || (s.isPayLater && s.amount > 0 && !s.hasActualSlip);
                      return (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-slate-700">{s.ticket_code || s.slip_id}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isPayLaterAwaiting
                                  ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                  : s.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {isPayLaterAwaiting
                                  ? 'อนุมัติสิทธิ์แล้ว (รอชำระเงิน)'
                                  : s.status === 'approved'
                                  ? 'อนุมัติแล้ว'
                                  : s.status === 'rejected'
                                  ? 'ไม่อนุมัติ'
                                  : 'รอตรวจสอบสลิป'}
                              </span>
                            </div>
                            <p className="text-slate-500 text-[11px] mt-0.5 truncate">
                              {s.bank || 'ชำระเงินภายหลัง'} • ฿{s.amount.toLocaleString()} {s.transfer_date ? `• ${s.transfer_date} ${s.transfer_time || ''}` : ''}
                            </p>
                            {s.rejection_reason && (
                              <p className="text-red-600 text-[11px] mt-0.5">เหตุผล: {s.rejection_reason}</p>
                            )}
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {isPayLaterAwaiting && (
                              <button
                                type="button"
                                onClick={() => handleSelectSlipToUpload(s)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <Upload className="w-3 h-3" />
                                <span>แนบสลิป</span>
                              </button>
                            )}

                            {s.slip_url && s.slip_url !== 'PAY_LATER' && s.slip_url !== 'pay_later_pending' && s.slip_url !== '/placeholder-slip.png' && s.slip_url !== 'GROUP_REGISTRATION' && s.slip_url !== 'GROUP_MEMBERSHIP' && (
                              <a
                                href={s.slip_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-white border border-slate-300 hover:border-blue-500 text-blue-600 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
                              >
                                <span>ดูสลิป</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
