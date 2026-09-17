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

  const isAutofill = searchParams.get('autofill') === 'true';
  const tabParam = searchParams.get('tab');
  const autofillTarget: 'conference' | 'membership' | null = isAutofill
    ? (tabParam === 'membership' ? 'membership' : 'conference')
    : null;

  // Handle autofill feedback on return from Google
  useEffect(() => {
    if (isAutofill && session?.user) {
      triggerNotification(
        lang === 'th'
          ? 'นำเข้าข้อมูลจากบัญชี Google สำเร็จ'
          : 'Google account details auto-filled successfully'
      );
    }
  }, [isAutofill, session, lang]);

  const handleGoogleSignIn = async () => {
    try {
      await signIn('google', { callbackUrl: '/login' }, { prompt: 'select_account' });
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      triggerNotification(err.message || t.login.serverError);
    }
  };

  const handleGoogleAutofill = async (tab?: 'conference' | 'membership') => {
    try {
      const targetTab = tab || (tabParam === 'membership' ? 'membership' : 'conference');
      await signIn('google', { callbackUrl: `/login?autofill=true&tab=${targetTab}` }, { prompt: 'select_account' });
    } catch (err: any) {
      console.error('Google Autofill Error:', err);
      triggerNotification(err.message || t.login.serverError);
    }
  };

  const handleNavigateToSignup = async () => {
    try {
      localStorage.removeItem('user_data');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('membership_registration');
      localStorage.removeItem('thaisrm_user');
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

      <main className="w-full min-h-screen bg-[#f6f8fc] shadow-2xl flex flex-col justify-between relative border-x border-slate-200/80 overflow-hidden transition-all duration-300">
        <LoginView
          onNavigateToSignup={handleNavigateToSignup}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleAutofill={handleGoogleAutofill}
          defaultTab={tabParam === 'membership' ? 'membership' : 'conference'}
          autofillTarget={autofillTarget}
          initialGoogleUser={
            isAutofill && session?.user
              ? {
                  name: session.user.name,
                  email: session.user.email,
                  picture: (session.user as any).picture || session.user.image || null,
                  given_name: (session.user as any).given_name || null,
                  family_name: (session.user as any).family_name || null,
                }
              : null
          }
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

