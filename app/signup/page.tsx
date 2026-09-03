'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { signIn } from 'next-auth/react';
import { SignupView } from '@/components/views/SignupView';
import { ToastNotification } from '@/components/ToastNotification';
import { RegistrationSuccessModal } from '@/components/RegistrationSuccessModal';
import { useLanguage } from '@/context/LanguageContext';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [notification, setNotification] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [initialUserData, setInitialUserData] = useState<{ name?: string; email?: string; picture?: string } | null>(null);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Auto-fill from NextAuth session when user signs up via Google
  useEffect(() => {
    if (session?.user) {
      const userData = {
        name: session.user.name || undefined,
        email: session.user.email || undefined,
        picture: (session.user as any).picture || session.user.image || undefined,
      };
      setInitialUserData(userData);
      triggerNotification(t.signup.googleAutofillSuccessToast);
    }
  }, [session, t.signup.googleAutofillSuccessToast]);

  const handleClearForm = () => {
    setInitialUserData(null);
  };

  const handleNavigateToLogin = () => {
    handleClearForm();
    router.push('/login');
  };

  const handleSignupSubmit = () => {
    router.push('/payment');
  };

  const handleGoogleSignUp = async () => {
    try {
      await signIn('google', { callbackUrl: '/signup' });
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
          onClearForm={handleClearForm}
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
