'use client';

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { SignupView } from '@/components/views/SignupView';
import { ToastNotification } from '@/components/ToastNotification';
import { useLanguage } from '@/context/LanguageContext';

function SignupContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const [notification, setNotification] = useState<string | null>(null);

  const handleClearForm = async () => {
    try {
      localStorage.removeItem('user_data');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('membership_registration');
      localStorage.removeItem('tsrm_user');
      localStorage.removeItem('thaisrm_user');
      document.cookie = 'tsrm_user=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      document.cookie = 'tsrm_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      document.cookie = 'thaisrm_user=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      document.cookie = 'thaisrm_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    } catch (e) { }
  };

  const handleNavigateToLogin = async () => {
    await handleClearForm();
    router.push('/login');
  };

  const handleSignupSubmit = () => {
    router.push('/payment?type=membership');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-start selection:bg-[#4ade80] selection:text-slate-900 font-sans">
      <ToastNotification message={notification} />

      <main className="w-full min-h-screen bg-[#f6f8fc] shadow-2xl flex flex-col justify-between relative border-x border-slate-200/80 overflow-hidden transition-all duration-300">
        <SignupView
          onNavigateToLogin={handleNavigateToLogin}
          onSubmitSignup={handleSignupSubmit}
          onClearForm={handleClearForm}
        />
      </main>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-[#0026b3] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
