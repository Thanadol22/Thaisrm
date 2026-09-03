'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { LoginView } from '@/components/views/LoginView';
import { ToastNotification } from '@/components/ToastNotification';
import { useLanguage } from '@/context/LanguageContext';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { t, lang } = useLanguage();
  const [notification, setNotification] = useState<string | null>(null);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
  };

  // If already logged in, automatically redirect to /agenda
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.replace('/agenda');
    }
  }, [status, session, router]);

  // Handle URL errors (e.g. ?error=Configuration or ?error=AccessDenied)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      if (errorParam === 'Configuration') {
        triggerNotification(
          lang === 'th'
            ? 'เกิดข้อผิดพลาดในการตั้งค่า Google OAuth (Configuration Error) กรุณาตรวจสอบ Authorized Redirect URI ใน Google Cloud Console'
            : 'Google OAuth Configuration Error. Please verify Authorized Redirect URI in Google Cloud Console'
        );
      } else if (errorParam === 'AccessDenied') {
        triggerNotification(
          lang === 'th'
            ? 'การเข้าสู่ระบบถูกปฏิเสธ (Access Denied)'
            : 'Access was denied during sign in.'
        );
      } else {
        triggerNotification(
          lang === 'th'
            ? `การเข้าสู่ระบบไม่สำเร็จ (${errorParam})`
            : `Sign in failed (${errorParam})`
        );
      }
    }
  }, [searchParams, lang]);

  const handleGoogleSignIn = async () => {
    try {
      await signIn('google', { callbackUrl: '/agenda' });
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      triggerNotification(err.message || t.login.serverError);
    }
  };

  const handleNavigateToSignup = async () => {
    try {
      localStorage.removeItem('user_data');
      localStorage.removeItem('auth_token');
      document.cookie = 'thaisrm_user=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      document.cookie = 'thaisrm_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    } catch (e) {}
    try {
      await signOut({ redirect: false });
    } catch (e) {}
    router.push('/signup');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-start selection:bg-[#4ade80] selection:text-slate-900 font-sans">
      <ToastNotification message={notification} />

      <main className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl min-h-screen bg-[#f6f8fc] shadow-2xl flex flex-col justify-between relative border-x border-slate-200/80 overflow-hidden transition-all duration-300">
        <LoginView
          onNavigateToSignup={handleNavigateToSignup}
          onGoogleSignIn={handleGoogleSignIn}
        />
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-4 border-[#0026b3] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

