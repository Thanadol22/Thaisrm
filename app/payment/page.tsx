'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PaymentView } from '@/components/views/PaymentView';
import { SlipUploadModal } from '@/components/SlipUploadModal';
import { RegistrationSuccessModal } from '@/components/RegistrationSuccessModal';
import { ToastNotification } from '@/components/ToastNotification';
import { useLanguage } from '@/context/LanguageContext';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, lang } = useLanguage();
  const [copiedBank, setCopiedBank] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [uploadedSlipData, setUploadedSlipData] = useState<{ fileName: string; fileUrl: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Router determines the payment type: 'registration' vs 'membership'
  const typeParam = searchParams.get('type');
  const paymentType: 'registration' | 'membership' = 
    typeParam === 'registration' || typeParam === 'conference' ? 'registration' : 'membership';

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

  const amountDueText = paymentType === 'registration'
    ? (lang === 'th' ? 'จำนวน 3,500 บาท' : 'Amount: 3,500 THB')
    : (lang === 'th' ? 'จำนวน 1,000 บาท' : 'Amount: 1,000 THB');

  const successModalTitle = paymentType === 'registration'
    ? (t.successModal as any).paymentSuccessTitle || t.successModal.title
    : (t.successModal as any).membershipSuccessTitle || t.successModal.loginTitle || t.successModal.title;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-start selection:bg-[#4ade80] selection:text-slate-900 font-sans">
      <ToastNotification message={notification} />

      <RegistrationSuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
        title={successModalTitle}
      />

      <main className="w-full min-h-screen bg-[#f6f8fc] shadow-2xl flex flex-col justify-between relative border-x border-slate-200/80 overflow-hidden transition-all duration-300">
        <PaymentView
          paymentType={paymentType}
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
        amountDueText={amountDueText}
      />
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-4 border-[#0026b3] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
