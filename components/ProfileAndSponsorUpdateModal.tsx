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
} from 'lucide-react';
import { SmartEmailInput } from '@/components/SmartEmailInput';
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
  lineId: string;
  address: string;
  workplace: string;
  work_phone: string;
  work_start_date: string;
  position: string;
  job_category: string;
  job_category_other: string;
  scientist_license_no: string;
  membership_status: string;
  membership_type: string;
  photo_url?: string;
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
  slip_id: string;
  meeting_id: string;
  amount: number;
  bank: string | null;
  transfer_date: string | null;
  transfer_time: string | null;
  slip_url: string;
  status: string;
  rejection_reason?: string | null;
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
  totalAmount: number;
  hasOutstanding: boolean;
  paymentStatus: 'approved' | 'pending_review' | 'rejected' | 'unpaid' | 'free_quota';
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

  // Member State
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sponsor State
  const [sponsorData, setSponsorData] = useState<SponsorData | null>(null);
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
      setMemberData(null);
      setSponsorData(null);
      setSaveSuccess(false);
      setSlipSubmitSuccess(false);
      setSlipFile(null);
      setSlipPreview(null);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

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
      const res = await fetch('/api/members/profile-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'บันทึกข้อมูลไม่สำเร็จ');
        return;
      }

      setSaveSuccess(true);
      // Re-calculate missing fields
      const fieldsToCheck = [
        { key: 'fullNameEn', label: 'ชื่อ-นามสกุล (อังกฤษ)' },
        { key: 'idLast4', label: 'เลข 4 หลักท้ายบัตรประชาชน' },
        { key: 'mobile', label: 'เบอร์โทรศัพท์มือถือ' },
        { key: 'lineId', label: 'LINE ID' },
        { key: 'address', label: 'ที่อยู่ติดต่อ' },
        { key: 'workplace', label: 'สถานที่ทำงาน' },
        { key: 'work_phone', label: 'เบอร์โทรศัพท์ที่ทำงาน' },
        { key: 'position', label: 'ตำแหน่งงาน' },
        { key: 'job_category', label: 'สาขาวิชาชีพ' },
        { key: 'scientist_license_no', label: 'เลขที่ใบอนุญาตนักวิทยาศาสตร์' },
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

  // 4. อัปโหลดสลิปสำหรับสปอนเซอร์
  const handleUploadSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorData) return;
    if (!slipFile) {
      setErrorMsg('กรุณาเลือกไฟล์รูปภาพสลิปโอนเงิน');
      return;
    }

    setSubmittingSlip(true);
    setErrorMsg('');

    try {
      // 1. Upload image
      const uploadRes = await uploadImageToStorage(slipFile, 'slips');
      if (!uploadRes.url) {
        throw new Error('ไม่สามารถอัปโหลดรูปภาพสลิปได้');
      }

      // 2. Submit slip metadata
      const activeMeetingId = sponsorData.quotas[0]?.meeting_id || 'TSRM34';
      const res = await fetch('/api/sponsors/portal/upload-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'ส่งสลิปไม่สำเร็จ');
        return;
      }

      setSlipSubmitSuccess(true);
      setSponsorData({
        ...sponsorData,
        paymentStatus: 'pending_review',
        hasOutstanding: false,
        slips: [data.slip, ...sponsorData.slips],
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการแนบสลิป');
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
                      <span>{lang === 'th' ? 'ขอรับรหัสชั่วคราว (Request OTP)' : 'Send OTP Code'}</span>
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
                    {memberData.fullNameTh}
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

              {/* 1. ข้อมูลส่วนตัว (Personal Details) */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>1. ข้อมูลส่วนบุคคล (Personal Information)</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* ชื่อ-นามสกุล ไทย (Locked) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                      <span>ชื่อ-นามสกุล (ภาษาไทย)</span>
                      <span className="text-[10px] text-slate-400 font-normal flex items-center gap-0.5">
                        <Lock className="w-3 h-3" /> ทะเบียนสมาคมฯ
                      </span>
                    </label>
                    <input
                      type="text"
                      value={memberData.fullNameTh}
                      disabled
                      className="w-full text-xs sm:text-sm py-2 px-3 bg-slate-100 text-slate-700 rounded-xl border border-slate-200 cursor-not-allowed font-medium"
                    />
                  </div>

                  {/* ชื่อ-นามสกุล อังกฤษ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                      <span>Full Name (English)</span>
                      {isFieldEmpty(memberData.fullNameEn) && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          ⚠️ โปรดใส่ข้อมูล
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={memberData.fullNameEn}
                      onChange={(e) => setMemberData({ ...memberData, fullNameEn: e.target.value })}
                      placeholder="e.g. Somchai Jaidee"
                      className={`w-full text-xs sm:text-sm py-2 px-3 rounded-xl border transition outline-none ${
                        isFieldEmpty(memberData.fullNameEn)
                          ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                          : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                  </div>

                  {/* เลข 4 หลักท้ายบัตร ปชช */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                      <span>เลข 4 หลักท้ายบัตรประชาชน</span>
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
                      onChange={(e) => setMemberData({ ...memberData, idLast4: e.target.value.replace(/\D/g, '') })}
                      placeholder="เช่น 1234"
                      className={`w-full text-xs sm:text-sm py-2 px-3 rounded-xl border transition outline-none ${
                        isFieldEmpty(memberData.idLast4)
                          ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                          : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* 2. ข้อมูลการติดต่อ (Contact Info) */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <span>2. ข้อมูลการติดต่อ (Contact Information)</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* เบอร์โทรศัพท์มือถือ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                      <span>เบอร์โทรศัพท์มือถือ</span>
                      {isFieldEmpty(memberData.mobile) && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          ⚠️ โปรดใส่ข้อมูล
                        </span>
                      )}
                    </label>
                    <input
                      type="tel"
                      value={memberData.mobile}
                      onChange={(e) => setMemberData({ ...memberData, mobile: e.target.value })}
                      placeholder="เช่น 0812345678"
                      className={`w-full text-xs sm:text-sm py-2 px-3 rounded-xl border transition outline-none ${
                        isFieldEmpty(memberData.mobile)
                          ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                          : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                  </div>

                  {/* LINE ID */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                      <span>LINE ID</span>
                      {isFieldEmpty(memberData.lineId) && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          ⚠️ โปรดใส่ข้อมูล
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={memberData.lineId}
                      onChange={(e) => setMemberData({ ...memberData, lineId: e.target.value })}
                      placeholder="เช่น line_user"
                      className={`w-full text-xs sm:text-sm py-2 px-3 rounded-xl border transition outline-none ${
                        isFieldEmpty(memberData.lineId)
                          ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                          : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                  </div>

                  {/* ที่อยู่ติดต่อ */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                      <span>ที่อยู่ติดต่อ / จัดส่งเอกสาร</span>
                      {isFieldEmpty(memberData.address) && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          ⚠️ โปรดใส่ข้อมูล
                        </span>
                      )}
                    </label>
                    <textarea
                      rows={2}
                      value={memberData.address}
                      onChange={(e) => setMemberData({ ...memberData, address: e.target.value })}
                      placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                      className={`w-full text-xs sm:text-sm py-2 px-3 rounded-xl border transition outline-none resize-none ${
                        isFieldEmpty(memberData.address)
                          ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                          : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* 3. สถานที่ทำงานและวิชาชีพ (Work & Profession) */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span>3. ข้อมูลสถานที่ทำงานและวิชาชีพ (Workplace & Profession)</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* สถานที่ทำงาน */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                      <span>สถานที่ทำงาน / โรงพยาบาล / สถาบัน</span>
                      {isFieldEmpty(memberData.workplace) && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          ⚠️ โปรดใส่ข้อมูล
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={memberData.workplace}
                      onChange={(e) => setMemberData({ ...memberData, workplace: e.target.value })}
                      placeholder="เช่น โรงพยาบาลศิริราช หรือ คลินิก..."
                      className={`w-full text-xs sm:text-sm py-2 px-3 rounded-xl border transition outline-none ${
                        isFieldEmpty(memberData.workplace)
                          ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                          : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                  </div>

                  {/* เบอร์โทรศัพท์ที่ทำงาน */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                      <span>เบอร์โทรศัพท์ที่ทำงาน</span>
                      {isFieldEmpty(memberData.work_phone) && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          ⚠️ โปรดใส่ข้อมูล
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={memberData.work_phone}
                      onChange={(e) => setMemberData({ ...memberData, work_phone: e.target.value })}
                      placeholder="เช่น 02-123-4567 ต่อ 123"
                      className={`w-full text-xs sm:text-sm py-2 px-3 rounded-xl border transition outline-none ${
                        isFieldEmpty(memberData.work_phone)
                          ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                          : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                  </div>

                  {/* ตำแหน่งงาน */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                      <span>ตำแหน่งงาน</span>
                      {isFieldEmpty(memberData.position) && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          ⚠️ โปรดใส่ข้อมูล
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={memberData.position}
                      onChange={(e) => setMemberData({ ...memberData, position: e.target.value })}
                      placeholder="เช่น สูตินรีแพทย์, นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อน"
                      className={`w-full text-xs sm:text-sm py-2 px-3 rounded-xl border transition outline-none ${
                        isFieldEmpty(memberData.position)
                          ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                          : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                  </div>

                  {/* สาขาวิชาชีพ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                      <span>สาขาวิชาชีพ (Job Category)</span>
                      {isFieldEmpty(memberData.job_category) && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          ⚠️ โปรดใส่ข้อมูล
                        </span>
                      )}
                    </label>
                    <select
                      value={memberData.job_category}
                      onChange={(e) => setMemberData({ ...memberData, job_category: e.target.value })}
                      className={`w-full text-xs sm:text-sm py-2 px-3 rounded-xl border transition outline-none bg-white ${
                        isFieldEmpty(memberData.job_category)
                          ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                          : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      }`}
                    >
                      <option value="">-- กรุณาเลือก --</option>
                      <option value="RM">แพทย์เวชศาสตร์การเจริญพันธุ์ (RM)</option>
                      <option value="Embryologist">นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อน (Embryologist)</option>
                      <option value="Nurse">พยาบาลผู้เชี่ยวชาญ (Nurse)</option>
                      <option value="Scientist">นักวิทยาศาสตร์การแพทย์ (Scientist)</option>
                      <option value="Other">อื่นๆ (ระบุ)</option>
                    </select>
                  </div>

                  {/* เลขที่ใบอนุญาตนักวิทยาศาสตร์ */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                      <span>เลขที่ใบประกอบวิชาชีพวิทยาศาสตร์ / เลขที่ใบอนุญาต (ถ้ามี)</span>
                      {isFieldEmpty(memberData.scientist_license_no) && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          (ไม่บังคับหากไม่มี)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={memberData.scientist_license_no}
                      onChange={(e) => setMemberData({ ...memberData, scientist_license_no: e.target.value })}
                      placeholder="เช่น วท.1234/2565"
                      className="w-full text-xs sm:text-sm py-2 px-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. ประวัติการศึกษา (Educations) */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                    <span>4. ประวัติการศึกษา (Educations)</span>
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
                            className="w-full text-xs py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            placeholder="สถาบัน / มหาวิทยาลัย"
                            value={edu.institution}
                            onChange={(e) => {
                              const newEdus = [...memberData.educations];
                              newEdus[idx].institution = e.target.value;
                              setMemberData({ ...memberData, educations: newEdus });
                            }}
                            className="w-full text-xs py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            placeholder="ปีที่จบ (พ.ศ.)"
                            value={edu.graduation_year || ''}
                            onChange={(e) => {
                              const newEdus = [...memberData.educations];
                              newEdus[idx].graduation_year = e.target.value;
                              setMemberData({ ...memberData, educations: newEdus });
                            }}
                            className="w-full text-xs py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500"
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
                  {sponsorData.paymentStatus === 'approved' ? (
                    <div className="bg-emerald-500/10 border border-emerald-300 px-3 py-2 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold block">ชำระเงินเรียบร้อยแล้ว</span>
                        <span className="text-[11px] text-emerald-700">ไม่มียอดรอชำระ</span>
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
                    <div className="bg-orange-500/10 border border-orange-300 px-3 py-2 rounded-xl text-orange-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                      <div>
                        <span className="font-bold block">สถานะ: รอชำระเงิน (แนบสลิป)</span>
                        <span className="text-[11px] text-orange-700">
                          {sponsorData.totalAmount > 0 ? `ยอดรอชำระ ฿${sponsorData.totalAmount.toLocaleString()}` : 'กรุณาแนบสลิปยืนยัน'}
                        </span>
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
                  FORM แนบสลิป (แสดงเมื่อมีการค้างชำระ หรือต้องการส่งสลิป)
                 ═══════════════════════════════════════════════════════════ */}
              {(sponsorData.hasOutstanding || sponsorData.paymentStatus === 'rejected' || sponsorData.paymentStatus === 'unpaid') && (
                <form onSubmit={handleUploadSlip} className="p-4 sm:p-5 bg-orange-50/50 border-2 border-orange-200 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 font-bold text-orange-900 text-sm">
                    <Upload className="w-4 h-4 text-orange-600" />
                    <span>แบบฟอร์มแนบสลิปการโอนเงิน (Payment Slip Submission)</span>
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
                      <input
                        type="date"
                        value={slipDate}
                        onChange={(e) => setSlipDate(e.target.value)}
                        className="w-full text-xs sm:text-sm py-2 px-3 rounded-xl border border-slate-300 focus:border-blue-500 bg-white"
                        required
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
                        เลขอ้างอิง / หมายเหตุ (ถ้ามี)
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
                        แนบรูปภาพสลิปโอนเงิน (JPG, PNG) <span className="text-red-500">*</span>
                      </label>
                      <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 text-center bg-white cursor-pointer transition relative">
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
                            <span className="text-xs text-blue-600 font-bold">คลิกเพื่อเปลี่ยนรูปภาพ</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-slate-500">
                            <Upload className="w-6 h-6 text-slate-400" />
                            <span className="text-xs font-bold text-slate-700">คลิกหรือลากไฟล์ภาพสลิปมาวางที่นี่</span>
                            <span className="text-[11px] text-slate-400">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 10MB</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingSlip || !slipFile}
                      className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {submittingSlip ? (
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
                </form>
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
                    <span>ประวัติการแนบสลิป ({sponsorData.slips.length} รายการ)</span>
                  </h5>

                  <div className="space-y-2">
                    {sponsorData.slips.map((s, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-700">{s.slip_id}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : s.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {s.status === 'approved' ? 'อนุมัติแล้ว' : s.status === 'rejected' ? 'ไม่อนุมัติ' : 'รอตรวจสอบ'}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            {s.bank} • ฿{s.amount.toLocaleString()} • {s.transfer_date} {s.transfer_time}
                          </p>
                          {s.rejection_reason && (
                            <p className="text-red-600 text-[11px] mt-0.5">เหตุผล: {s.rejection_reason}</p>
                          )}
                        </div>

                        <a
                          href={s.slip_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:border-blue-500 text-blue-600 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
                        >
                          <span>ดูสลิป</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
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
