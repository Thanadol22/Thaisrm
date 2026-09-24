'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  Mail, 
  KeyRound, 
  ShieldCheck, 
  Ticket, 
  Clock, 
  Users, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Tag, 
  ArrowRight, 
  LogOut, 
  Search, 
  RotateCw, 
  Check, 
  AlertTriangle,
  History,
  Download,
  Calendar,
  MapPin,
  HelpCircle
} from 'lucide-react';
import { SmartEmailInput } from '@/components/SmartEmailInput';

interface SponsorSession {
  sponsorId: string;
  sponsorName: string;
  tier: string;
  contactEmail: string;
  contactName?: string;
  verifiedAt: string;
}

interface MeetingQuotaInfo {
  meeting_id: string;
  meeting_name: string;
  meeting_date: string;
  location?: string;
  base_price?: number;
  quota_seats: number;
  used_seats: number;
  remaining_seats: number;
  members_only: boolean;
}

interface MemberRow {
  id: string;
  memberNo: string;
  fullName: string;
  email: string;
  phone: string;
  workplace: string;
  isValidated: boolean;
  isValidating: boolean;
  statusMessage: string;
  isError: boolean;
}

interface CouponState {
  code: string;
  isValid: boolean;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  netPrice: number;
  description: string;
}

const INACTIVITY_TIMEOUT_SECONDS = 300; // 5 นาที (300 วินาที)

export default function SponsorGroupRegisterPage() {
  const router = useRouter();

  // Step 1: 'email', Step 2: 'otp', Step 3: 'portal'
  const [currentStep, setCurrentStep] = useState<'email' | 'otp' | 'portal'>('email');
  
  // Auth state
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [devOtpCode, setDevOtpCode] = useState('');

  // Portal session & data
  const [session, setSession] = useState<SponsorSession | null>(null);
  const [meetings, setMeetings] = useState<MeetingQuotaInfo[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  
  // Active sub-tab in portal: 'register' | 'history'
  const [activePortalTab, setActivePortalTab] = useState<'register' | 'history'>('register');
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Inactivity timeout tracking (5 minutes)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(INACTIVITY_TIMEOUT_SECONDS);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Top Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponState, setCouponState] = useState<CouponState | null>(null);
  const [couponError, setCouponError] = useState('');

  // Member rows state
  const [memberRows, setMemberRows] = useState<MemberRow[]>([
    {
      id: 'row-1',
      memberNo: '',
      fullName: '',
      email: '',
      phone: '',
      workplace: '',
      isValidated: false,
      isValidating: false,
      statusMessage: '',
      isError: false,
    },
  ]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    results?: any[];
    errors?: string[];
  } | null>(null);

  // ----------------------------------------------------
  // Inactivity Tracker (5 Minutes Timeout)
  // ----------------------------------------------------
  const handleUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSecondsRemaining(INACTIVITY_TIMEOUT_SECONDS);
    if (showInactivityWarning) {
      setShowInactivityWarning(false);
    }
  }, [showInactivityWarning]);

  const handleLogout = useCallback((reason = 'คุณได้ออกจากระบบแล้ว') => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setSession(null);
    setCurrentStep('email');
    setEmailInput('');
    setOtpInput('');
    setCouponState(null);
    setMemberRows([
      {
        id: 'row-1',
        memberNo: '',
        fullName: '',
        email: '',
        phone: '',
        workplace: '',
        isValidated: false,
        isValidating: false,
        statusMessage: '',
        isError: false,
      },
    ]);
    setAuthError(reason);
  }, []);

  useEffect(() => {
    if (currentStep !== 'portal') return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, handleUserActivity));

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, INACTIVITY_TIMEOUT_SECONDS - elapsed);
      setSecondsRemaining(remaining);

      if (remaining <= 60 && remaining > 0) {
        setShowInactivityWarning(true);
      }

      if (remaining <= 0) {
        handleLogout('เซสชันหมดอายุเนื่องจากไม่มีการเคลื่อนไหวนานเกิน 5 นาที กรุณาขอรหัสชั่วคราวใหม่อีกครั้ง');
      }
    }, 1000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleUserActivity));
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [currentStep, handleUserActivity, handleLogout]);

  // ----------------------------------------------------
  // Authentication Handlers (Request OTP & Verify OTP)
  // ----------------------------------------------------
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setAuthError('กรุณากรอกอีเมลของตัวแทนบริษัท');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthSuccessMsg('');
    setDevOtpCode('');

    try {
      const res = await fetch('/api/sponsors/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.message || 'ไม่พบบัญชีบริษัทหรืออีเมลนี้ในระบบ');
        return;
      }

      setAuthSuccessMsg(data.message);
      if (data.devOtp) {
        setDevOtpCode(data.devOtp);
      }
      setCurrentStep('otp');
    } catch (err: any) {
      setAuthError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) {
      setAuthError('กรุณากรอกรหัสชั่วคราว (OTP) 6 หลัก');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/sponsors/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, otp: otpInput }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.message || 'รหัสชั่วคราวไม่ถูกต้องหรือหมดอายุแล้ว');
        return;
      }

      setSession(data.sessionData);
      setMeetings(data.meetings || []);
      if (data.meetings && data.meetings.length > 0) {
        setSelectedMeetingId(data.meetings[0].meeting_id);
      }
      lastActivityRef.current = Date.now();
      setSecondsRemaining(INACTIVITY_TIMEOUT_SECONDS);
      setCurrentStep('portal');
    } catch (err: any) {
      setAuthError('เกิดข้อผิดพลาดในการตรวจสอบรหัส');
    } finally {
      setAuthLoading(false);
    }
  };

  // ----------------------------------------------------
  // Load History of Registered Members
  // ----------------------------------------------------
  const fetchSponsorHistory = useCallback(async (sponsorId: string) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/sponsors/${sponsorId}/history`);
      const data = await res.json();
      if (res.ok && data.success) {
        setHistoryList(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load sponsor history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentStep === 'portal' && session?.sponsorId) {
      fetchSponsorHistory(session.sponsorId);
    }
  }, [currentStep, session, fetchSponsorHistory]);

  // Selected Meeting Object
  const selectedMeeting = meetings.find((m) => m.meeting_id === selectedMeetingId) || meetings[0];

  // ----------------------------------------------------
  // Top Coupon Validation Handler
  // ----------------------------------------------------
  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) {
      setCouponError('กรุณาระบุรหัสคูปอง');
      return;
    }

    setCouponLoading(true);
    setCouponError('');

    try {
      const res = await fetch('/api/sponsors/portal/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCodeInput,
          meetingId: selectedMeetingId,
          basePrice: selectedMeeting?.base_price || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.message || 'รหัสคูปองไม่ถูกต้องหรือหมดอายุแล้ว');
        setCouponState(null);
        return;
      }

      setCouponState({
        code: data.coupon.code,
        isValid: true,
        discountType: data.coupon.discount_type,
        discountValue: data.coupon.discount_value,
        discountAmount: data.coupon.discount_amount,
        netPrice: data.coupon.net_price,
        description: data.coupon.discount_description,
      });
    } catch (err) {
      setCouponError('เกิดข้อผิดพลาดในการตรวจสอบคูปอง');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleClearCoupon = () => {
    setCouponCodeInput('');
    setCouponState(null);
    setCouponError('');
  };

  // ----------------------------------------------------
  // Member Verification Handler (Strict check: member_no + name)
  // ----------------------------------------------------
  const handleVerifyMemberRow = async (rowId: string) => {
    const row = memberRows.find((r) => r.id === rowId);
    if (!row || !row.memberNo.trim()) return;

    setMemberRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, isValidating: true, statusMessage: 'กำลังตรวจสอบ...', isError: false } : r
      )
    );

    try {
      const res = await fetch('/api/sponsors/portal/verify-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberNo: row.memberNo,
          name: row.fullName,
          meetingId: selectedMeetingId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        setMemberRows((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? {
                  ...r,
                  isValidating: false,
                  isValidated: false,
                  isError: true,
                  statusMessage: data.message || 'ไม่พบสมาชิก หรือชื่อไม่ตรงกับในระบบ',
                }
              : r
          )
        );
        return;
      }

      // ตรวจสอบผ่าน
      setMemberRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                isValidating: false,
                isValidated: true,
                isError: false,
                memberNo: data.member.member_no,
                fullName: data.member.fullNameTh,
                email: data.member.email || r.email,
                phone: data.member.mobile || r.phone,
                workplace: data.member.workplace || r.workplace,
                statusMessage: '✅ ตรวจสอบผ่าน (สมาชิกสถานะ Active)',
              }
            : r
        )
      );
    } catch (err) {
      setMemberRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? { ...r, isValidating: false, isValidated: false, isError: true, statusMessage: 'เกิดข้อผิดพลาดในการตรวจสอบ' }
            : r
        )
      );
    }
  };

  // ----------------------------------------------------
  // Member Rows Management
  // ----------------------------------------------------
  const handleAddMemberRow = () => {
    const newId = `row-${Date.now()}`;
    setMemberRows((prev) => [
      ...prev,
      {
        id: newId,
        memberNo: '',
        fullName: '',
        email: '',
        phone: '',
        workplace: '',
        isValidated: false,
        isValidating: false,
        statusMessage: '',
        isError: false,
      },
    ]);
  };

  const handleRemoveMemberRow = (rowId: string) => {
    if (memberRows.length <= 1) {
      setMemberRows([
        {
          id: `row-${Date.now()}`,
          memberNo: '',
          fullName: '',
          email: '',
          phone: '',
          workplace: '',
          isValidated: false,
          isValidating: false,
          statusMessage: '',
          isError: false,
        },
      ]);
      return;
    }
    setMemberRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleRowChange = (rowId: string, field: keyof MemberRow, value: string) => {
    setMemberRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          // หากแก้ memberNo หรือ fullName ให้ reset สถานะการตรวจสอบ
          if (field === 'memberNo' || field === 'fullName') {
            return {
              ...r,
              [field]: value,
              isValidated: false,
              statusMessage: '',
              isError: false,
            };
          }
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  // ----------------------------------------------------
  // Group Submission Handler
  // ----------------------------------------------------
  const handleSubmitGroup = async () => {
    // 1. ตรวจสอบว่ามีรายชื่อและผ่านการตรวจสอบครบทุกแถวหรือไม่
    const unvalidated = memberRows.filter((r) => !r.isValidated || r.isError);
    if (unvalidated.length > 0) {
      alert('กรุณาตรวจสอบความถูกต้องของเลขสมาชิกและชื่อให้ผ่านครบทุกรายการก่อนส่ง');
      return;
    }

    if (!session || !selectedMeetingId) {
      alert('ข้อมูลเซสชันไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const payload = {
        sponsorId: session.sponsorId,
        meetingId: selectedMeetingId,
        submittedByEmail: session.contactEmail,
        couponCode: couponState?.code || undefined,
        members: memberRows.map((r) => ({
          memberNo: r.memberNo,
          fullName: r.fullName,
          email: r.email,
          phone: r.phone,
          workplace: r.workplace,
        })),
      };

      const res = await fetch('/api/sponsors/portal/submit-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setSubmitResult({
          success: false,
          message: data.message || 'เกิดข้อผิดพลาดในการลงทะเบียนกลุ่ม',
          errors: data.errors,
        });
        return;
      }

      setSubmitResult({
        success: true,
        message: data.message,
        results: data.results,
        errors: data.errors,
      });

      // รีเฟรชประวัติและโควต้า
      fetchSponsorHistory(session.sponsorId);

      // อัปเดตโควต้าใน State
      setMeetings((prev) =>
        prev.map((m) =>
          m.meeting_id === selectedMeetingId
            ? {
                ...m,
                used_seats: m.used_seats + (data.results?.length || 0),
                remaining_seats: Math.max(0, m.remaining_seats - (data.results?.length || 0)),
              }
            : m
        )
      );

      // Reset แถวกรอกข้อมูล
      setMemberRows([
        {
          id: `row-${Date.now()}`,
          memberNo: '',
          fullName: '',
          email: '',
          phone: '',
          workplace: '',
          isValidated: false,
          isValidating: false,
          statusMessage: '',
          isError: false,
        },
      ]);
    } catch (err) {
      setSubmitResult({
        success: false,
        message: 'เกิดข้อผิดพลาดในการส่งข้อมูลไปยังเซิร์ฟเวอร์',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatMinutesSeconds = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ----------------------------------------------------
  // RENDER STEP 1 & 2: Email & OTP Verification Screen
  // ----------------------------------------------------
  if (currentStep === 'email' || currentStep === 'otp') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
        {/* Background Gradients */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Navigation */}
        <header className="border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-30 bg-slate-950/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl">
              T
            </div>
            <div>
              <h1 className="font-bold text-lg text-white leading-none">TSRM Corporate Portal</h1>
              <p className="text-xs text-slate-400 mt-0.5">ระบบลงทะเบียนกลุ่มสำหรับบริษัทสปอนเซอร์</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            ← กลับหน้าหลัก
          </Link>
        </header>

        {/* Main Card Container */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative">
            {/* Header Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-600/30 text-white">
                <Building2 className="w-8 h-8" />
              </div>
            </div>

            <div className="text-center mb-6">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
                Corporate Group Registration
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {currentStep === 'email' ? 'เข้าสู่ระบบตัวแทนบริษัท' : 'กรอกรหัสชั่วคราว (OTP)'}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                {currentStep === 'email'
                  ? 'ระบุอีเมลผู้ประสานงานบริษัทที่ได้รับสิทธิ์ เพื่อรับรหัสยืนยันเข้าใช้งาน'
                  : `ระบบส่งรหัส 6 หลักไปยัง ${emailInput} แล้ว (หมดอายุใน 10 นาที)`}
              </p>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Success Message */}
            {authSuccessMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>{authSuccessMsg}</span>
              </div>
            )}

            {/* Dev OTP Helper */}
            {devOtpCode && (
              <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center">
                <p className="text-xs text-blue-300 font-semibold mb-1">รหัสชั่วคราวสำหรับทดสอบ (Dev Mode):</p>
                <div className="text-2xl font-mono font-black text-blue-400 tracking-widest">{devOtpCode}</div>
              </div>
            )}

            {/* Step 1: Request OTP Form */}
            {currentStep === 'email' && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    อีเมลตัวแทนผู้ประสานงานบริษัท <span className="text-red-400">*</span>
                  </label>
                  <SmartEmailInput
                    value={emailInput}
                    onChange={(val: string) => setEmailInput(val)}
                    placeholder="youremail@example.com"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    * ต้องเป็นอีเมลที่ลงทะเบียนไว้ในฐานข้อมูลบริษัทสปอนเซอร์ของสมาคม
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={authLoading || !emailInput.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {authLoading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      กำลังตรวจสอบ...
                    </>
                  ) : (
                    <>
                      ขอรับรหัสชั่วคราว (Request OTP)
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Step 2: Verify OTP Form */}
            {currentStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    รหัสผ่านชั่วคราว (OTP 6 หลัก) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="XXXXXX"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-center font-mono tracking-widest text-lg font-bold focus:outline-none focus:border-blue-500"
                      required
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    รหัสมีอายุ 10 นาที และจะถูกรีเซ็ตหากไม่มีการเคลื่อนไหวเกิน 5 นาที
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={authLoading || otpInput.length < 6}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {authLoading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      กำลังยืนยัน...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      ยืนยันและเข้าสู่ระบบลงทะเบียน
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep('email');
                      setOtpInput('');
                      setAuthError('');
                    }}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    ← เปลี่ยนอีเมล
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={authLoading}
                    className="text-blue-400 hover:text-blue-300 font-semibold transition-colors cursor-pointer"
                  >
                    ขอรหัสใหม่อีกครั้ง
                  </button>
                </div>
              </form>
            )}

            {/* Security Notice */}
            <div className="mt-6 pt-5 border-t border-slate-800 text-center">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                🔒 ปลอดภัยสูงสุด: ระบบจะตัด Session อัตโนมัติเมื่อไม่มีการเคลื่อนไหวเกิน 5 นาที
              </p>
            </div>
          </div>
        </main>

        <footer className="text-center py-4 text-xs text-slate-500 border-t border-slate-900">
          © {new Date().getFullYear()} Thai Society for Reproductive Medicine (TSRM). All rights reserved.
        </footer>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER STEP 3: Corporate Portal (Group Registration)
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* 5-Min Inactivity Warning Toast/Banner */}
      {showInactivityWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] bg-amber-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 border border-amber-400 animate-bounce">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-xs sm:text-sm">
            ไม่มีการเคลื่อนไหว! ระบบจะตัดออกจากระบบภายใน <strong>{secondsRemaining} วินาที</strong>
          </span>
          <button
            onClick={handleUserActivity}
            className="px-3 py-1 bg-slate-950 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 cursor-pointer"
          >
            ฉันยังใช้งานอยู่
          </button>
        </div>
      )}

      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-md shadow-blue-500/20">
            {session?.tier === 'Platinum' ? '💎' : session?.tier === 'Gold' ? '🥇' : '🥈'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight">
                {session?.sponsorName}
              </h1>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  session?.tier === 'Platinum'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : session?.tier === 'Gold'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                }`}
              >
                {session?.tier} Sponsor
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{session?.contactEmail}</span>
              <span>•</span>
              <span className="text-emerald-400 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                เหลือเวลาเซสชัน: {formatMinutesSeconds(secondsRemaining)}
              </span>
            </p>
          </div>
        </div>

        {/* Right Navigation & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActivePortalTab('register')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activePortalTab === 'register'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              ลงทะเบียนกลุ่ม
            </button>
            <button
              onClick={() => setActivePortalTab('history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activePortalTab === 'history'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              ประวัติที่เคยลง ({historyList.length})
            </button>
          </div>

          <button
            onClick={() => handleLogout()}
            className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ==================================================== */}
        {/* TAB 1: GROUP REGISTRATION VIEW */}
        {/* ==================================================== */}
        {activePortalTab === 'register' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Meeting Selection & Quota Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Meeting Selector Card */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  เลือกงานประชุมที่ต้องการลงทะเบียน:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {meetings.map((m) => {
                    const isSelected = m.meeting_id === selectedMeetingId;
                    return (
                      <div
                        key={m.meeting_id}
                        onClick={() => setSelectedMeetingId(m.meeting_id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-white line-clamp-1">{m.meeting_name}</h4>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-2 space-y-1">
                          <p className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {new Date(m.meeting_date).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                          {m.location && (
                            <p className="flex items-center gap-1.5 line-clamp-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {m.location}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quota Summary Badge */}
              <div className="bg-gradient-to-br from-slate-900 to-blue-950/50 border border-blue-500/20 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                      สิทธิ์โควต้าคูปองฟรี
                    </span>
                    <Ticket className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">
                      {selectedMeeting ? selectedMeeting.remaining_seats : 0}
                    </span>
                    <span className="text-sm text-slate-400 font-semibold">
                      / {selectedMeeting ? selectedMeeting.quota_seats : 0} ที่นั่งคงเหลือ
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          selectedMeeting && selectedMeeting.quota_seats > 0
                            ? Math.min(
                                100,
                                Math.round((selectedMeeting.used_seats / selectedMeeting.quota_seats) * 100)
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    ใช้ไปแล้ว {selectedMeeting ? selectedMeeting.used_seats : 0} ที่นั่ง (สิทธิ์เฉพาะสมาชิกสถานะ Active เท่านั้น)
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  ระบบตรวจสอบเลขสมาชิกและชื่อจริงแบบ Real-time
                </div>
              </div>
            </div>

            {/* ==================================================== */}
            {/* 1. TOP COUPON INPUT SECTION (ช่องใส่รหัสคูปองด้านบนสุด) */}
            {/* ==================================================== */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      ช่องใส่รหัสคูปองส่วนลด / คูปองพิเศษ
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Top Coupon System
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      หากมีรหัสคูปองพิเศษของบริษัท กรอกเพื่อคำนวณส่วนลดตามเงื่อนไขของคูปองอัตโนมัติ
                    </p>
                  </div>
                </div>

                {/* Coupon Input Form */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {couponState ? (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="text-xs">
                        <span className="font-mono font-bold text-emerald-300">{couponState.code}</span>
                        <span className="text-slate-400 ml-1.5">({couponState.description})</span>
                      </div>
                      <button
                        onClick={handleClearCoupon}
                        className="ml-2 text-slate-400 hover:text-red-400 transition-colors p-1"
                        title="ยกเลิกคูปอง"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full sm:w-80">
                      <input
                        type="text"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        placeholder="กรอกรหัสคูปอง (Coupon Code)"
                        className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono uppercase text-xs focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCodeInput.trim()}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                      >
                        {couponLoading ? 'ตรวจสอบ...' : 'ใช้คูปอง'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {couponError && (
                <div className="mt-3 text-xs text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {couponError}
                </div>
              )}
            </div>

            {/* ==================================================== */}
            {/* 2. MEMBER REGISTRATION TABLE (บังคับเลขสมาชิก & เช็คชื่อ) */}
            {/* ==================================================== */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    ตารางกรอกรายชื่อผู้เข้าร่วมประชุม (เฉพาะสมาชิก)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    * บังคับกรอกเลขสมาชิก และระบบจะตรวจสอบว่าเลขสมาชิกตรงกับชื่อ-นามสกุลในระบบจริง
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddMemberRow}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer w-fit"
                >
                  <Plus className="w-4 h-4 text-blue-400" />
                  เพิ่มรายชื่อสมาชิก (+1)
                </button>
              </div>

              {/* Rows List */}
              <div className="space-y-3.5">
                {memberRows.map((row, index) => (
                  <div
                    key={row.id}
                    className={`p-4 rounded-xl border transition-all ${
                      row.isValidated
                        ? 'bg-emerald-950/10 border-emerald-500/30'
                        : row.isError
                        ? 'bg-red-950/10 border-red-500/30'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold text-slate-400">
                        ลำดับที่ #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMemberRow(row.id)}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                        title="ลบแถวนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      {/* Member No Input (บังคับใส่เลขสมาชิก) */}
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          เลขสมาชิก (Member No.) <span className="text-red-400">*</span>
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={row.memberNo}
                            onChange={(e) => handleRowChange(row.id, 'memberNo', e.target.value)}
                            placeholder="0001"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => handleVerifyMemberRow(row.id)}
                            disabled={row.isValidating || !row.memberNo.trim()}
                            className="px-2.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
                            title="ตรวจสอบสมาชิก"
                          >
                            {row.isValidating ? (
                              <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Search className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Full Name Input (ตรวจสอบว่าตรงกับในระบบจริง) */}
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          ชื่อ-นามสกุลสมาชิก <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={row.fullName}
                          onChange={(e) => handleRowChange(row.id, 'fullName', e.target.value)}
                          onBlur={() => {
                            if (row.memberNo.trim() && !row.isValidated) {
                              handleVerifyMemberRow(row.id);
                            }
                          }}
                          placeholder="ชื่อ-นามสกุลภาษาไทย"
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                          required
                        />
                      </div>

                      {/* Email Input */}
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          อีเมลสำหรับรับตั๋ว <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="email"
                          value={row.email}
                          onChange={(e) => handleRowChange(row.id, 'email', e.target.value)}
                          placeholder="youremail@example.com"
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                          required
                        />
                      </div>

                      {/* Workplace Input */}
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          หน่วยงาน / โรงพยาบาล
                        </label>
                        <input
                          type="text"
                          value={row.workplace}
                          onChange={(e) => handleRowChange(row.id, 'workplace', e.target.value)}
                          placeholder="ระบุชื่อหน่วยงาน / โรงพยาบาล"
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Status Message Footer */}
                    {row.statusMessage && (
                      <div
                        className={`mt-2.5 text-xs flex items-center gap-1.5 ${
                          row.isValidated
                            ? 'text-emerald-400 font-semibold'
                            : row.isError
                            ? 'text-red-400 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        {row.isValidated ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : row.isError ? (
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        ) : null}
                        <span>{row.statusMessage}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Submission Result Notification */}
              {submitResult && (
                <div
                  className={`p-4 rounded-xl border text-xs ${
                    submitResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : 'bg-red-500/10 border-red-500/30 text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm mb-1">
                    {submitResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    {submitResult.message}
                  </div>
                  {submitResult.results && submitResult.results.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="font-semibold text-emerald-300">รายชื่อที่ออกตั๋วสำเร็จ:</p>
                      {submitResult.results.map((res: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-950/60 p-2 rounded-lg">
                          <span>
                            {res.memberNo} - {res.fullName}
                          </span>
                          <span className="font-mono font-bold text-blue-400">{res.ticketCode}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button Section */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400">
                  จำนวนผู้เข้าร่วมในรายการนี้:{' '}
                  <strong className="text-white text-sm">{memberRows.length}</strong> ท่าน
                </div>

                <button
                  type="button"
                  onClick={handleSubmitGroup}
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      กำลังบันทึกและออกตั๋ว...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      ยืนยันการลงทะเบียนกลุ่ม ({memberRows.length} ท่าน)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: REGISTRATION HISTORY VIEW */}
        {/* ==================================================== */}
        {activePortalTab === 'history' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-400" />
                  ประวัติสมาชิกทั้งหมดที่ {session?.sponsorName} เคยลงทะเบียน
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  แสดงรายการสมาชิกที่ได้รับการสนับสนุนและลงทะเบียนผ่านบริษัทนี้ทั้งหมด
                </p>
              </div>

              <button
                onClick={() => session?.sponsorId && fetchSponsorHistory(session.sponsorId)}
                disabled={historyLoading}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer w-fit"
              >
                <RotateCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                รีเฟรชข้อมูล
              </button>
            </div>

            {/* History Table */}
            {historyLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RotateCw className="w-4 h-4 animate-spin" />
                กำลังโหลดประวัติการลงทะเบียน...
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                ยังไม่พบประวัติการลงทะเบียนสมาชิกของบริษัทนี้
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">เลขสมาชิก</th>
                      <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                      <th className="py-3 px-4">งานประชุม</th>
                      <th className="py-3 px-4">รหัสบัตร (Ticket)</th>
                      <th className="py-3 px-4">วันที่ลงทะเบียน</th>
                      <th className="py-3 px-4">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {historyList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">
                          {item.memberNo}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{item.attendeeName}</div>
                          <div className="text-[11px] text-slate-400">{item.attendeeEmail}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{item.meetingName || item.meetingId}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] font-bold text-amber-300">
                          {item.ticketCode || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(item.registeredAt).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {item.attendanceStatus || 'Registered'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
