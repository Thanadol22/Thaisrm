'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopNavbar } from '@/components/TopNavbar';
import { SignupView } from '@/components/views/SignupView';
import { ToastNotification } from '@/components/ToastNotification';
import { RegistrationSuccessModal } from '@/components/RegistrationSuccessModal';

export default function SignupPage() {
  const router = useRouter();
  const [notification, setNotification] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSignupSubmit = () => {
    setShowSuccessModal(true);
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
        <TopNavbar />
        <SignupView
          onNavigateToLogin={() => router.push('/login')}
          onSubmitSignup={handleSignupSubmit}
          onGoogleSignUp={handleSignupSubmit}
        />
      </main>
    </div>
  );
}
