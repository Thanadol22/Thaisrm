'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SignupView } from '@/components/views/SignupView';
import { ToastNotification } from '@/components/ToastNotification';
import { RegistrationSuccessModal } from '@/components/RegistrationSuccessModal';
import { useLanguage } from '@/context/LanguageContext';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [notification, setNotification] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const initialUserData = useMemo(() => {
    const userJson = searchParams.get('user');
    const token = searchParams.get('token');
    if (userJson) {
      try {
        const userData = JSON.parse(decodeURIComponent(userJson));
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_data', JSON.stringify(userData));
          if (token) localStorage.setItem('auth_token', token);
        }
        return userData;
      } catch (e) {
        console.error('Failed to parse user from query params:', e);
      }
    }
    return null;
  }, [searchParams]);

  useEffect(() => {
    if (initialUserData) {
      triggerNotification(t.signup.googleAutofillSuccessToast);
    }
    return () => {
      try {
        localStorage.removeItem('user_data');
      } catch (e) { }
    };
  }, [initialUserData, t.signup.googleAutofillSuccessToast]);

  const handleNavigateToLogin = () => {
    try {
      localStorage.removeItem('user_data');
    } catch (e) { }
    router.push('/login');
  };

  const handleSignupSubmit = () => {
    router.push('/payment');
  };

  const handleGoogleSignUp = async () => {
    try {
      const response = await fetch('/api/auth/google/url?from=signup');
      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Google Sign Up Error:', err);
    }
  };

  const handleProceedToPayment = () => {
    router.push('/payment');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-start selection:bg-[#4ade80] selection:text-slate-900 font-sans">
      <ToastNotification message={notification} />
      <RegistrationSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onProceed={handleProceedToPayment}
      />

      <main className="w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl min-h-screen bg-[#f6f8fc] shadow-2xl flex flex-col justify-between relative border-x border-slate-200/80 overflow-hidden transition-all duration-300">
        <SignupView
          onNavigateToLogin={handleNavigateToLogin}
          onSubmitSignup={handleSignupSubmit}
          onGoogleSignUp={handleGoogleSignUp}
          initialUserData={initialUserData}
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
