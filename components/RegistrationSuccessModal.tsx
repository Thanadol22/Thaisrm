'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Mail, QrCode, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface RegistrationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed?: () => void;
  title?: string;
  message?: string;
  statusBadge?: string;
  type?: 'registration' | 'membership';
}

export function RegistrationSuccessModal({
  isOpen,
  onClose,
  onProceed,
  title,
  message,
  statusBadge,
  type = 'registration',
}: RegistrationSuccessModalProps) {
  const { t, lang } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const defaultMessage = type === 'membership'
    ? (lang === 'th'
        ? 'ระบบได้รับข้อมูลการสมัครสมาชิกและหลักฐานของท่านแล้ว เจ้าหน้าที่จะดำเนินการตรวจสอบและแจ้งผลการอนุมัติทางอีเมล'
        : 'Your membership application and slip have been received. Staff will review and notify you via email.')
    : t.successModal.message;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
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
          {statusBadge && (
            <div className="flex justify-center">
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black px-3 py-1 rounded-full shadow-2xs">
                {statusBadge}
              </span>
            </div>
          )}
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {title || (type === 'membership' ? (lang === 'th' ? 'ส่งใบสมัครและหลักฐานการชำระเงินเรียบร้อยแล้ว' : 'Membership Application Submitted') : t.successModal.title)}
          </h2>
          <p className="text-xs sm:text-sm font-extrabold text-[#0026b3] leading-relaxed px-2">
            {message || defaultMessage}
          </p>
        </div>

        {/* Info Card (Membership verification vs Conference QR entrance) */}
        {type === 'membership' ? (
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 space-y-2.5 text-left text-xs text-slate-700">
            <div className="flex items-center gap-2.5 text-[#0026b3] font-bold">
              <Mail className="w-4 h-4 shrink-0 text-[#0026b3]" />
              <span>{lang === 'th' ? 'ส่งข้อมูลยืนยันการสมัครไปยัง Email เรียบร้อยแล้ว' : 'Application confirmation sent to your email'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-emerald-800 font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{lang === 'th' ? 'เจ้าหน้าที่จะตรวจสอบเอกสารและแจ้งผลการอนุมัติสถานะสมาชิกผ่านทางอีเมล' : 'Staff will review documents and confirm membership status via email'}</span>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 space-y-2.5 text-left text-xs text-slate-700">
            <div className="flex items-center gap-2.5 text-[#0026b3] font-bold">
              <Mail className="w-4 h-4 shrink-0 text-[#0026b3]" />
              <span>{t.successModal.emailSent}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600 font-medium">
              <QrCode className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{t.successModal.qrInstruction}</span>
            </div>
          </div>
        )}

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
              className="w-full bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] font-bold text-sm py-3.5 px-5 rounded-2xl shadow-sm hover:shadow transition active:scale-[0.99] cursor-pointer"
            >
              {t.successModal.confirmButton}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
