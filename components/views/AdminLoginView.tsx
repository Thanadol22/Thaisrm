'use client';

import React, { useState } from 'react';
import { TsrmLogo } from '@/components/TsrmLogo';
import {
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  KeyRound,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

interface AdminLoginViewProps {
  onLoginSuccess: (adminUser: { username: string; role: string }) => void;
}

export function AdminLoginView({ onLoginSuccess }: AdminLoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 429 && data.retryAfterSeconds) {
          setCooldownSeconds(data.retryAfterSeconds);
          const interval = setInterval(() => {
            setCooldownSeconds((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
        throw new Error(data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 flex flex-col justify-center items-center p-3 xs:p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-[#4ade80] selection:text-slate-950">
      {/* Background Decorative Lighting */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-[#0026b3]/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#4ade80]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-4.5 xs:p-6 sm:p-8 shadow-2xl shadow-black/60 relative z-10">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
          <div className="relative mb-3.5 sm:mb-4 group">
            <div className="absolute -inset-2 bg-gradient-to-r from-[#0026b3] to-[#4ade80] rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition duration-500" />
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 border border-white/20 p-2 sm:p-2.5 flex items-center justify-center shadow-lg">
              <TsrmLogo className="w-full h-full object-contain" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-[#4ade80] border-2 border-slate-900 flex items-center justify-center">
              <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-950" />
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[#4ade80] text-[10.5px] sm:text-xs font-black tracking-wider uppercase mb-1.5 sm:mb-2">
            <Sparkles className="w-3 h-3" />
            <span>TSRM Admin Portal</span>
          </span>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            เข้าสู่ระบบผู้ดูแล
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            ระบบบริหารจัดการสมาคมเวชศาสตร์การเจริญพันธุ์ไทย
          </p>
        </div>

        {/* Error Notification Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold leading-relaxed">{errorMessage}</p>
              {cooldownSeconds > 0 && (
                <p className="text-rose-400/80 text-[11px] mt-1 font-mono">
                  สามารถลองใหม่ได้ในอีก: {Math.floor(cooldownSeconds / 60)}:{(cooldownSeconds % 60).toString().padStart(2, '0')} นาที
                </p>
              )}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              ชื่อผู้ใช้งาน
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ระบุชื่อผู้ใช้งาน"
                disabled={loading || cooldownSeconds > 0}
                required
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#4ade80] focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300">
                รหัสผ่าน
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={loading || cooldownSeconds > 0}
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#4ade80] focus:border-transparent transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2 text-[11px] text-slate-400">
            <KeyRound className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
            <span>เข้าสู่ระบบผ่านการเข้ารหัส Session แบบปลอดภัย (HMAC-SHA256)</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || cooldownSeconds > 0}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0026b3] via-[#0532e6] to-[#0026b3] text-white font-extrabold text-sm shadow-lg shadow-blue-900/40 hover:shadow-blue-800/60 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังตรวจสอบสิทธิ์...</span>
              </>
            ) : cooldownSeconds > 0 ? (
              <span>กรุณารอ {cooldownSeconds} วินาที</span>
            ) : (
              <>
                <span>เข้าสู่ระบบจัดการ</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation Links */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <Link
            href="/"
            className="flex items-center gap-1.5 hover:text-[#4ade80] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับหน้าหลัก</span>
          </Link>

          <Link
            href="/staff"
            className="flex items-center gap-1.5 hover:text-[#4ade80] transition"
          >
            <span>ระบบสแกนเจ้าหน้าที่</span>
          </Link>
        </div>
      </div>

      {/* Security Badge Footer */}
      <div className="mt-6 text-center text-[11px] text-slate-500 font-medium">
        สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (TSRM) &copy; {new Date().getFullYear()} &bull; Admin Security Protected
      </div>
    </div>
  );
}
