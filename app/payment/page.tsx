'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopNavbar } from '@/components/TopNavbar';
import { PaymentView } from '@/components/views/PaymentView';
import { SlipUploadModal } from '@/components/SlipUploadModal';
import { ToastNotification } from '@/components/ToastNotification';
import { useLanguage } from '@/context/LanguageContext';

export default function PaymentPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [copiedBank, setCopiedBank] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const bankAccountNumber = "020-8-16398-1";

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCopyBank = () => {
    navigator.clipboard.writeText(bankAccountNumber);
    setCopiedBank(true);
    triggerNotification(t.payment.copyToast);
    setTimeout(() => setCopiedBank(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-start selection:bg-[#4ade80] selection:text-slate-900 font-sans">
      <ToastNotification message={notification} />

      <main className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl min-h-screen bg-[#f6f8fc] shadow-2xl flex flex-col justify-between relative border-x border-slate-200/80 overflow-hidden transition-all duration-300">
        <TopNavbar />
        <PaymentView
          onNavigateBack={() => router.push('/signup')}
          onOpenUploadModal={() => setUploadModalOpen(true)}
          onCopyBank={handleCopyBank}
          copiedBank={copiedBank}
          bankAccount={bankAccountNumber}
        />
      </main>

      <SlipUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => triggerNotification(t.payment.uploadSuccessToast)}
        bankAccount={bankAccountNumber}
      />
    </div>
  );
}
