'use client';

import React from 'react';
import { CheckCircle2, Mail, QrCode, X, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface RegistrationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed?: () => void;
  title?: string;
}

export function RegistrationSuccessModal({
  isOpen,
  onClose,
  onProceed,
  title,
}: RegistrationSuccessModalProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 relative text-center space-y-5 animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Badge with Glow */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#4ade80]/30 rounded-full blur-xl animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0026b3] to-[#0044ff] text-white flex items-center justify-center shadow-lg ring-4 ring-[#4ade80]/40">
            <CheckCircle2 className="w-9 h-9 text-[#4ade80] stroke-[2.5]" />
          </div>
        </div>

        {/* Title & Main Notice */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {title || t.successModal.title}
          </h2>
          <p className="text-xs sm:text-sm font-extrabold text-[#0026b3] leading-relaxed px-2">
            {t.successModal.message}
          </p>
        </div>

        {/* Email & QR Info Card */}
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 space-y-2.5 text-left text-xs text-slate-700">
          <div className="flex items-center gap-2.5 text-[#0026b3] font-bold">
            <Mail className="w-4 h-4 shrink-0 text-[#0026b3]" />
            <span>ส่งข้อมูลไปยัง Email เรียบร้อยแล้ว</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-600 font-medium">
            <QrCode className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>ใช้ QR Code ใน Email สแกนผ่านประตูเข้างานประชุม TSRM</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2 pt-1">
          {onProceed ? (
            <button
              onClick={() => {
                onClose();
                onProceed();
              }}
              className="w-full bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] font-bold text-sm py-3.5 px-5 rounded-2xl shadow-sm hover:shadow transition active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{t.successModal.proceedToPaymentButton}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full bg-[#0026b3] hover:bg-[#001f94] text-white font-bold text-sm py-3.5 px-5 rounded-2xl shadow-sm hover:shadow transition active:scale-[0.99] cursor-pointer"
            >
              {t.successModal.confirmButton}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
