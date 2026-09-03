'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import { LoginView } from '@/components/views/LoginView';
import { ToastNotification } from '@/components/ToastNotification';
import { useLanguage } from '@/context/LanguageContext';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [notification, setNotification] = useState<string | null>(null);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

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
