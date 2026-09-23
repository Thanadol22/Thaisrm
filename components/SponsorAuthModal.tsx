'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Building2,
  Mail,
  KeyRound,
  ShieldCheck,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { SmartEmailInput } from '@/components/SmartEmailInput';

export interface SponsorSessionData {
  sponsorId: string;
  sponsorName: string;
  tier: string;
  contactEmail: string;
  contactName?: string;
  verifiedAt: string;
  meetings: Array<{
    meeting_id: string;
    meeting_name: string;
    quota_seats: number;
    used_seats: number;
    remaining_seats: number;
  }>;
}

interface SponsorAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (sessionData: SponsorSessionData) => void;
}

export function SponsorAuthModal({
  isOpen,
  onClose,
  onSuccess,
}: SponsorAuthModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [devOtp, setDevOtp] = useState('');

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
      setDevOtp('');
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // ── 1. ขอรับรหัสชั่วคราว (Request OTP) ──
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('กรุณากรอกอีเมลของตัวแทนบริษัท');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setDevOtp('');

    try {
      const res = await fetch('/api/sponsors/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'ไม่พบบัญชีบริษัทหรืออีเมลนี้ในระบบสปอนเซอร์');
        return;
      }

      setSuccessMsg(data.message);
      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }
      setStep('otp');
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  // ── 2. ยืนยันรหัสชั่วคราว (Verify OTP) ──
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setErrorMsg('กรุณากรอกรหัสชั่วคราว (OTP) 6 หลัก');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/sponsors/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'รหัสชั่วคราวไม่ถูกต้องหรือหมดอายุแล้ว');
        return;
      }

      onSuccess({
        ...data.sessionData,
        meetings: data.meetings || [],
      });
      onClose();
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการตรวจสอบรหัส');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {step === 'email' ? 'ยืนยันตัวตนตัวแทนบริษัท' : 'กรอกรหัสชั่วคราว (OTP)'}
              </h3>
              <p className="text-[11px] text-blue-100">ระบบลงทะเบียนกลุ่มบริษัทสปอนเซอร์ (TSRM)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {devOtp && (
            <div className="mb-4 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-center">
              <p className="text-[11px] text-blue-700 font-semibold mb-0.5">รหัสชั่วคราวสำหรับทดสอบ (Dev):</p>
              <span className="font-mono font-black text-lg text-blue-900 tracking-widest">{devOtp}</span>
            </div>
          )}

          {/* ── STEP 1: FORM EMAIL ── */}
          {step === 'email' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  อีเมลตัวแทนผู้ประสานงานบริษัท <span className="text-red-500">*</span>
                </label>
                <SmartEmailInput
                  value={email}
                  onChange={(val: string) => setEmail(val)}
                  placeholder="เช่น natsuree@lgchem.com, pornpun.mongkonsawat@merckgroup.com"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  * ต้องเป็นอีเมลที่ลงทะเบียนไว้ในฐานข้อมูลบริษัทสปอนเซอร์ของสมาคม
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0026b3] hover:bg-[#001f8f] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-700/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
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
          ) : (
            /* ── STEP 2: FORM OTP ── */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  รหัสผ่านชั่วคราว (OTP 6 หลัก) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="XXXXXX"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-center font-mono tracking-widest text-lg font-bold text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  รหัสมีอายุ 10 นาที (เซสชันจะตัดอัตโนมัติหากไม่มีการเคลื่อนไหวเกิน 5 นาที)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    กำลังยืนยัน...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    ยืนยันและเริ่มลงทะเบียนกลุ่ม
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                    setErrorMsg('');
                  }}
                  className="text-slate-500 hover:text-slate-800"
                >
                  ← เปลี่ยนอีเมล
                </button>
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-800 font-semibold"
                >
                  ขอรหัสใหม่อีกครั้ง
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer Security Notice */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            🔒 ระบบความปลอดภัย 5 นาที: จะตัดเซสชันออกอัตโนมัติเมื่อไม่มีการเคลื่อนไหว
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
