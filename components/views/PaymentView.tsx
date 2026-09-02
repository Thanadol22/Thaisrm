'use client';

import React from 'react';
import { ArrowLeft, Check, Copy, Shield, Upload, Globe } from 'lucide-react';
import { BornIvfLogo } from '@/components/BornIvfLogo';
import { useLanguage } from '@/context/LanguageContext';

interface PaymentViewProps {
  onNavigateBack: () => void;
  onOpenUploadModal: () => void;
  onCopyBank: () => void;
  copiedBank: boolean;
  bankAccount: string;
}

export function PaymentView({
  onNavigateBack,
  onOpenUploadModal,
  onCopyBank,
  copiedBank,
  bankAccount
}: PaymentViewProps) {
  const { lang, toggleLang, t } = useLanguage();

  return (
    <div className="flex-1 flex flex-col justify-between animate-fade-in min-h-[640px]">
      {/* Header Blue Card Section */}
      <div className="bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-5 sm:px-7 pt-6 sm:pt-8 pb-8 sm:pb-10 rounded-b-[32px] sm:rounded-b-[40px] shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Back Button */}
              <button
                onClick={onNavigateBack}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white flex items-center justify-center transition border border-white/15 cursor-pointer active:scale-95 shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Brand Logo & Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <BornIvfLogo className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-bold text-blue-200 uppercase block leading-tight truncate">
                    {t.associationName}
                  </span>
                  <span className="font-extrabold text-white text-xs sm:text-sm tracking-wide block leading-tight">
                    {t.brandName}
                  </span>
                </div>
              </div>
            </div>

            {/* Language Switcher Pill */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold transition border border-white/20 cursor-pointer active:scale-95 shrink-0 shadow-2xs"
              title="Switch Language / สลับภาษา"
            >
              <Globe className="w-3.5 h-3.5 text-blue-200 shrink-0" />
              <span className={lang === 'th' ? 'text-white font-black' : 'text-blue-200/60'}>TH</span>
              <span className="text-white/40 font-normal">|</span>
              <span className={lang === 'en' ? 'text-white font-black' : 'text-blue-200/60'}>EN</span>
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-4 sm:mt-5">
            {t.payment.title}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed mt-1.5 sm:mt-2 font-normal">
            {t.payment.subtitle}
          </p>
        </div>
      </div>

      {/* Body Content */}
      <div className="px-4 sm:px-7 py-5 sm:py-6 flex-1 flex flex-col justify-between space-y-4">
        {/* Pass Details White Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-extrabold text-[#0026b3] text-base sm:text-lg tracking-tight truncate">
              {t.payment.passName}
            </h3>
            <span className="bg-[#eff4ff] text-[#0026b3] text-[9px] sm:text-[10px] font-black tracking-widest px-2.5 sm:px-3 py-1 rounded-full border border-[#d6e4ff] shrink-0 whitespace-nowrap">
              {t.payment.passBadge}
            </span>
          </div>

          {/* Features List */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-start gap-2.5 text-xs text-slate-700">
              <Check className="w-4 h-4 text-[#0026b3] flex-shrink-0 mt-0.5 stroke-[2.5]" />
              <span>{t.payment.feature1}</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-700">
              <Check className="w-4 h-4 text-[#0026b3] flex-shrink-0 mt-0.5 stroke-[2.5]" />
              <span>{t.payment.feature2}</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-700">
              <Check className="w-4 h-4 text-[#0026b3] flex-shrink-0 mt-0.5 stroke-[2.5]" />
              <span>{t.payment.feature3}</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-baseline justify-between">
            <span className="text-xs font-bold text-slate-600">{t.payment.totalDue}</span>
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">1,000 {t.payment.currency}</span>
            </div>
          </div>
        </div>

        {/* Bank Account Info Card */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[#0026b3] font-black text-sm sm:text-base tracking-wider truncate">
              {bankAccount}
            </span>
            {/* Kasikorn K+ Badge */}
            <span className="bg-[#00a950] text-white text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 rounded shadow-2xs shrink-0 whitespace-nowrap">
              K+
            </span>
          </div>
          <button
            onClick={onCopyBank}
            className="text-xs font-bold text-[#0026b3] hover:bg-blue-50 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedBank ? t.payment.copiedButton : t.payment.copyButton}</span>
          </button>
        </div>

        {/* Security Encrypted Checkout Badge */}
        <div className="w-full bg-[#eff4ff] text-[#0026b3] font-bold text-[10px] sm:text-[11px] uppercase tracking-wider py-2 sm:py-2.5 px-3 sm:px-4 rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2 border border-[#d6e4ff] text-center">
          <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0026b3] shrink-0" />
          <span className="whitespace-normal sm:whitespace-nowrap">{t.payment.securityBadge}</span>
        </div>

        {/* Primary Green CTA Button */}
        <button
          onClick={onOpenUploadModal}
          className="w-full bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] font-bold text-sm sm:text-base py-3.5 sm:py-4 rounded-2xl shadow-sm hover:shadow transition active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5 stroke-[2.5]" />
          <span>{t.payment.uploadButton}</span>
        </button>

        {/* Footer Terms Disclaimer */}
        <p className="text-[10px] sm:text-[11px] text-slate-400 text-center leading-normal px-2 pb-4">
          {t.payment.termsDisclaimer}
        </p>
      </div>
    </div>
  );
}
