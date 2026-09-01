'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopNavbar } from '@/components/TopNavbar';
import { LoginView } from '@/components/views/LoginView';
import { ToastNotification } from '@/components/ToastNotification';

export default function Home() {
  const router = useRouter();
  const [notification, setNotification] = useState<string | null>(null);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-start selection:bg-[#4ade80] selection:text-slate-900 font-sans">
      <ToastNotification message={notification} />

      <main className="w-full max-w-md md:max-w-xl lg:max-w-3xl min-h-screen bg-[#f6f8fc] shadow-2xl flex flex-col justify-between relative border-x border-slate-200/80 transition-all duration-300">
        <TopNavbar />
        <LoginView
          onNavigateToSignup={() => router.push('/signup')}
          onGoogleSignIn={() => triggerNotification("เข้าสู่ระบบด้วย Google สำเร็จ")}
          onNavigateToStaffScan={() => router.push('/staff/scan')}
        />
      </main>
    </div>
  );
}
