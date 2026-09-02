'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2, Mail, QrCode } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const userJson = searchParams.get('user');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setStatus('error');
      setErrorMessage(decodeURIComponent(errorParam));
      setTimeout(() => router.push('/login'), 4000);
      return;
    }

    if (token && userJson) {
      try {
        const userData = JSON.parse(decodeURIComponent(userJson));
        
        // บันทึก Token และข้อมูล User ใน localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(userData));

        setStatus('success');
      } catch (err) {
        setStatus('error');
        setErrorMessage(t.login.cannotReadUser);
        setTimeout(() => router.push('/login'), 4000);
      }
    } else {
      setStatus('error');
      setErrorMessage(t.login.missingToken);
      setTimeout(() => router.push('/login'), 4000);
    }
  }, [searchParams, router, t.login.cannotReadUser, t.login.missingToken]);

  const handleConfirmSuccess = () => {
    router.push('/login');
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl max-w-sm sm:max-w-md w-full text-center border border-slate-100 flex flex-col items-center animate-fade-in space-y-4">
      {status === 'loading' && (
        <>
          <Loader2 className="w-12 h-12 text-[#0026b3] animate-spin mb-2" />
          <h2 className="text-xl font-bold text-slate-800">{t.login.verifyingAuth}</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{t.login.verifyingSubtitle}</p>
        </>
      )}

      {status === 'success' && (
        <div className="space-y-4 w-full">
          {/* Icon Badge with Glow */}
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 bg-[#4ade80]/30 rounded-full blur-xl animate-pulse" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0026b3] to-[#0044ff] text-white flex items-center justify-center shadow-lg ring-4 ring-[#4ade80]/40">
              <CheckCircle2 className="w-8 h-8 text-[#4ade80] stroke-[2.5]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-slate-900">{t.successModal.loginTitle}</h2>
            <p className="text-xs sm:text-sm font-extrabold text-[#0026b3] leading-relaxed">
              {t.successModal.message}
            </p>
          </div>

          {/* Email & QR Info Card */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 space-y-2.5 text-left text-xs text-slate-700">
            <div className="flex items-center gap-2.5 text-[#0026b3] font-bold">
              <Mail className="w-4 h-4 shrink-0 text-[#0026b3]" />
              <span>{t.successModal.emailSent}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600 font-medium">
              <QrCode className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{t.successModal.qrInstruction}</span>
            </div>
          </div>

          <button
            onClick={handleConfirmSuccess}
            className="w-full bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-sm py-3 px-5 rounded-2xl shadow-sm hover:shadow transition active:scale-[0.99] cursor-pointer mt-2"
          >
            {t.successModal.confirmButton}
          </button>
        </div>
      )}

      {status === 'error' && (
        <>
          <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mb-2">
            <AlertCircle className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">{t.login.loginFailed}</h2>
          <p className="text-xs sm:text-sm text-rose-500 mt-1">{errorMessage}</p>
          <p className="text-xs text-slate-400 mt-3">{t.login.redirecting}</p>
        </>
      )}
    </div>
  );
}

export default function LoginCallbackPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-[#0026b3] animate-spin mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Loading...</h2>
        </div>
      }>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
