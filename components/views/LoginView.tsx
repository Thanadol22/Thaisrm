'use client';

import React from 'react';
import { Shield, Globe } from 'lucide-react';
import { BornIvfLogo } from '@/components/BornIvfLogo';
import { GoogleIcon } from '@/components/GoogleIcon';
import { useLanguage } from '@/context/LanguageContext';

interface LoginViewProps {
  onNavigateToSignup: () => void;
  onGoogleSignIn: () => void;
}

export function LoginView({ onNavigateToSignup, onGoogleSignIn }: LoginViewProps) {
  const { lang, toggleLang, t } = useLanguage();

  return (
    <div className="flex-1 flex flex-col justify-between animate-fade-in min-h-[640px]">
      {/* Header Blue Card Section */}
      <div className="bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-5 sm:px-7 pt-6 sm:pt-8 pb-8 sm:pb-10 rounded-b-[28px] sm:rounded-b-[40px] shadow-xl relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 -left-12 w-40 h-40 bg-[#4ade80]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div
              onClick={() => window.location.href = '/login'}
              className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer group hover:opacity-90 transition"
              title="หน้าเข้าสู่ระบบ / Login Page"
            >
              <BornIvfLogo className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 group-hover:scale-105 transition-transform" />
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-bold tracking-wider sm:tracking-widest text-blue-200 uppercase block truncate">
                  {t.associationName}
                </span>
                <p className="text-xs sm:text-sm font-extrabold text-white">{t.brandName}</p>
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            {t.login.welcomeTitle}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed mt-1.5 font-normal">
            {t.login.welcomeSubtitle}
          </p>
        </div>
      </div>

      {/* Content Body */}
      <div className="px-5 sm:px-7 py-6 sm:py-8 flex-1 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Security Badge */}
          <div className="flex justify-start">
            <span className="inline-flex items-center gap-2 bg-[#eff4ff] text-[#0026b3] text-[10px] sm:text-[11px] font-bold tracking-wider uppercase px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#d6e4ff] whitespace-nowrap">
              <Shield className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
              <span>{t.login.securityBadge}</span>
            </span>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={onGoogleSignIn}
            className="w-full bg-white hover:bg-slate-50 text-slate-800 font-semibold py-3.5 sm:py-4 px-5 sm:px-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow transition flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99]"
          >
            <GoogleIcon className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs sm:text-base font-semibold">{t.login.googleSignInButton}</span>
          </button>
        </div>

        {/* Switch to Sign Up */}
        <div className="text-center pt-8 sm:pt-10 pb-4">
          <p className="text-xs sm:text-sm text-slate-500">
            {t.login.noAccount}{' '}
            <button
              onClick={onNavigateToSignup}
              className="text-[#0026b3] font-bold hover:underline cursor-pointer ml-1"
            >
              {t.login.signUpLink}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
