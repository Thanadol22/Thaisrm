'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Building2, History, KeyRound, Loader2, LogOut, Mail, ShieldCheck, Ticket } from 'lucide-react';
import { LoginView, SpecialFormContext } from '@/components/views/LoginView';
import { TsrmLogo } from '@/components/TsrmLogo';
import type { SponsorSessionData } from '@/components/SponsorAuthModal';
import { statusLabelTh } from '@/lib/statusLabels';

interface FormInfo {
  title: string;
  description?: string | null;
  formType: string;
  isOpen: boolean;
  meeting?: { meeting_name: string; location?: string | null } | null;
}

interface StoredSession {
  token: string;
  sponsorSession: SponsorSessionData;
  form: { id: string; slug: string; title: string; formType: string; allowCoupon: boolean };
  meeting: any;
  savedAt: number;
}

interface RegistrationRow {
  slipId: string;
  ticketCode: string | null;
  status: string;
  amount: number;
  isPayLater: boolean;
  createdAt: string;
  attendees: { name: string; memberNo: string; email: string; attendanceType: string; programs: string[]; price: number }[];
}

// token ของฟอร์มมีอายุ 20 นาที เก็บไว้ในแท็บนี้เพื่อกลับมาจากหน้าชำระเงินได้โดยไม่ต้องขอรหัสใหม่
const SESSION_TTL_MS = 19 * 60 * 1000;
const storageKey = (slug: string) => `special_form_session:${slug}`;

function readSession(slug: string): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.token || Date.now() - parsed.savedAt > SESSION_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function SpecialFormPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug || '');

  const [info, setInfo] = useState<FormInfo | null>(null);
  const [infoError, setInfoError] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'portal'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [session, setSession] = useState<StoredSession | null>(null);
  const [tab, setTab] = useState<'register' | 'history'>('register');
  const [history, setHistory] = useState<RegistrationRow[] | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/forms/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => (d.success ? setInfo(d.data) : setInfoError(d.message || 'ไม่พบฟอร์มนี้')))
      .catch(() => setInfoError('โหลดข้อมูลฟอร์มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'));
    const saved = readSession(slug);
    if (saved) {
      setSession(saved);
      setStep('portal');
    }
  }, [slug]);

  const endSession = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey(slug));
    } catch {}
    setSession(null);
    setOtp('');
    setHistory(null);
    setTab('register');
    setStep('email');
  }, [slug]);

  const requestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(slug)}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'ขอรหัสผ่านชั่วคราวไม่สำเร็จ');
        return;
      }
      setNotice(data.message);
      setStep('otp');
    } catch {
      setError('เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(slug)}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'รหัสผ่านชั่วคราวไม่ถูกต้อง');
        return;
      }
      const next: StoredSession = {
        token: data.sessionToken,
        sponsorSession: data.sponsorSession,
        form: data.form,
        meeting: data.meeting,
        savedAt: Date.now(),
      };
      try {
        sessionStorage.setItem(storageKey(slug), JSON.stringify(next));
      } catch {}
      setSession(next);
      setStep('portal');
    } catch {
      setError('เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  };

  const loadHistory = useCallback(async () => {
    if (!session) return;
    setHistory(null);
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(slug)}/registrations`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.status === 401) {
        endSession();
        return;
      }
      const data = await res.json();
      setHistory(data.success ? data.data : []);
    } catch {
      setHistory([]);
    }
  }, [session, slug, endSession]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, loadHistory]);

  const specialForm: SpecialFormContext | null = session
    ? {
        id: session.form.id,
        slug: session.form.slug,
        title: session.form.title,
        formType: session.form.formType,
        token: session.token,
        meeting: session.meeting,
        allowCoupon: session.form.allowCoupon,
        sponsorSession: session.sponsorSession,
        onSessionEnd: endSession,
      }
    : null;

  const title = session?.form.title || info?.title || 'ฟอร์มลงทะเบียน';

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900 flex flex-col">
      <header className="bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-4 sm:px-8 pt-5 pb-7 rounded-b-[28px] shadow-xl">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white p-1.5 shrink-0">
                <TsrmLogo className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-blue-200">สมาคมเวชศาสตร์การเจริญพันธุ์แห่งประเทศไทย</div>
                <h1 className="text-base sm:text-xl font-black leading-tight truncate">{title}</h1>
              </div>
            </div>
            {session && (
              <button
                type="button"
                onClick={endSession}
                className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                ออกจากระบบ
              </button>
            )}
          </div>
          {info?.meeting && (
            <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-[#4ade80] shrink-0" />
              <span className="truncate">{info.meeting.meeting_name}</span>
            </p>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 py-6">
        {infoError ? (
          <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm font-bold text-slate-600">{infoError}</div>
        ) : !info && !session ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#0026b3] animate-spin" />
          </div>
        ) : info && !info.isOpen && !session ? (
          <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-1">
            <p className="text-base font-black text-slate-800">ฟอร์มนี้ปิดรับลงทะเบียนแล้ว</p>
            <p className="text-sm text-slate-500">หากต้องการลงทะเบียน กรุณาติดต่อผู้ดูแลระบบของสมาคม</p>
          </div>
        ) : step !== 'portal' || !specialForm ? (
          <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0026b3] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">เข้าสู่ระบบตัวแทนบริษัท</h2>
                <p className="text-xs text-slate-500">ใช้อีเมลตัวแทนบริษัทที่แจ้งไว้กับสมาคมเท่านั้น</p>
              </div>
            </div>
            {info?.description && <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3">{info.description}</p>}

            {step === 'email' ? (
              <form onSubmit={requestOtp} className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">อีเมลตัวแทนบริษัท</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 rounded-xl bg-[#0026b3] hover:bg-[#001c8c] text-white text-sm font-black disabled:opacity-60 cursor-pointer"
                >
                  {busy ? 'กำลังส่ง...' : 'ขอรหัสผ่านชั่วคราว'}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-3">
                {notice && <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">{notice}</p>}
                <label className="block text-xs font-bold text-slate-700">รหัสผ่านชั่วคราว 6 หลัก</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-300 text-lg tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy || otp.length !== 6}
                  className="w-full py-3 rounded-xl bg-[#0026b3] hover:bg-[#001c8c] text-white text-sm font-black disabled:opacity-60 cursor-pointer"
                >
                  {busy ? 'กำลังตรวจสอบ...' : 'ยืนยันและเข้าสู่ฟอร์ม'}
                </button>
                <div className="flex justify-between text-xs font-bold">
                  <button type="button" onClick={() => setStep('email')} className="text-slate-500 hover:underline cursor-pointer">
                    เปลี่ยนอีเมล
                  </button>
                  <button type="button" onClick={() => requestOtp()} disabled={busy} className="text-[#0026b3] hover:underline cursor-pointer">
                    ขอรหัสใหม่
                  </button>
                </div>
              </form>
            )}
            {error && <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              ระบบจะออกจากระบบอัตโนมัติเมื่อไม่มีการใช้งานเกิน 5 นาที
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              {[
                { id: 'register' as const, label: 'ลงทะเบียน', icon: Ticket },
                { id: 'history' as const, label: 'รายชื่อที่เคยส่ง', icon: History },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border cursor-pointer ${
                    tab === t.id ? 'bg-[#0026b3] text-white border-[#0026b3]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'register' ? (
              <LoginView onNavigateToSignup={() => {}} onGoogleSignIn={() => {}} specialForm={specialForm} />
            ) : history === null ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-7 h-7 text-[#0026b3] animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-500">
                ยังไม่มีรายชื่อที่ส่งผ่านฟอร์มนี้
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((row) => (
                  <div key={row.slipId} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-black text-slate-800">
                        {row.ticketCode || row.slipId}
                        <span className="ml-2 text-xs font-bold text-slate-500">{row.attendees.length} ท่าน</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="text-slate-700">฿{row.amount.toLocaleString()}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {statusLabelTh(row.status)}
                        </span>
                        {row.isPayLater && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">ชำระเงินภายหลัง</span>
                        )}
                      </div>
                    </div>
                    <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
                      {row.attendees.map((a, i) => (
                        <li key={i} className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-800">
                            {a.name}
                            {a.memberNo && <span className="ml-1.5 text-[#0026b3]">#{a.memberNo}</span>}
                          </span>
                          <span className="text-slate-500">
                            {a.attendanceType === 'online' ? 'ออนไลน์' : 'ออนไซต์'} • {a.programs.join(' + ')} •{' '}
                            {a.price > 0 ? `฿${a.price.toLocaleString()}` : 'ฟรี'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="text-xs text-slate-500">
                  แนบสลิปของรายการที่เลือกชำระเงินภายหลังได้ที่หน้าแรกของระบบ ปุ่มอัปเดตข้อมูลบริษัท
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
