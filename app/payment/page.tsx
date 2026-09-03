'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PaymentView } from '@/components/views/PaymentView';
import { SlipUploadModal } from '@/components/SlipUploadModal';
import { RegistrationSuccessModal } from '@/components/RegistrationSuccessModal';
import { ToastNotification } from '@/components/ToastNotification';
import { useLanguage } from '@/context/LanguageContext';

export default function PaymentPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [copiedBank, setCopiedBank] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [uploadedSlipData, setUploadedSlipData] = useState<{ fileName: string; fileUrl: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const bankAccountNumber = "020-8-16398-1";

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleCopyBank = () => {
    navigator.clipboard.writeText(bankAccountNumber);
    setCopiedBank(true);
    triggerNotification(t.payment.copyToast);
    setTimeout(() => setCopiedBank(false), 2500);
  };

  const handleSlipUploadSuccess = (slipData: { fileName: string; fileUrl: string }) => {
    setUploadedSlipData(slipData);
    triggerNotification(t.payment.uploadSuccessToast);
  };

  const handleRemoveSlip = () => {
    setUploadedSlipData(null);
  };

  const handleConfirmPayment = () => {
    if (!uploadedSlipData) {
      triggerNotification(t.payment.noSlipWarning);
      setUploadModalOpen(true);
      return;
    }
    setShowSuccessModal(true);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-start selection:bg-[#4ade80] selection:text-slate-900 font-sans">
      <ToastNotification message={notification} />

      <RegistrationSuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
        title={t.successModal.loginTitle}
      />

      <main className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl min-h-screen bg-[#f6f8fc] shadow-2xl flex flex-col justify-between relative border-x border-slate-200/80 overflow-hidden transition-all duration-300">
        <PaymentView
          onNavigateBack={() => router.push('/signup')}
          onOpenUploadModal={() => setUploadModalOpen(true)}
          onCopyBank={handleCopyBank}
          copiedBank={copiedBank}
          bankAccount={bankAccountNumber}
          uploadedSlipData={uploadedSlipData}
          onRemoveSlip={handleRemoveSlip}
          onConfirmPayment={handleConfirmPayment}
        />
      </main>

      <SlipUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleSlipUploadSuccess}
        bankAccount={bankAccountNumber}
      />
    </div>
  );
}

