'use client';

import React from 'react';
import { ThaiSrmLogo } from '@/components/ThaiSrmLogo';
import { useLanguage } from '@/context/LanguageContext';
import {
  ShieldCheck,
  Calendar
} from 'lucide-react';

export function Footer() {
  const { lang, t } = useLanguage();

  return (
    <footer className="w-full bg-[#070b14] text-slate-300 border-t border-slate-800/80 relative overflow-hidden font-sans">
      {/* Ambient background glow accents */}
      <div className="absolute top-0 left-1/4 w-96 h-48 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-48 bg-[#4ade80]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Footer Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">

          {/* Society Identity */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 max-w-2xl w-full">
            <ThaiSrmLogo className="w-12 h-12 ring-2 ring-white/10 shrink-0 shadow-md" />
            <div className="space-y-1.5 min-w-0 w-full">
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight [text-wrap:balance]">
                {lang === 'th' ? t.footer.orgNameTh : t.footer.orgNameEn}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-normal [text-wrap:balance] break-words">
                {t.footer.orgDescription}
              </p>
            </div>
          </div>

          {/* Event Congress Badge */}
          <div className="inline-flex items-center justify-center gap-2 bg-blue-950/70 text-blue-200 border border-blue-500/25 px-4 py-2.5 rounded-2xl text-xs font-semibold shrink-0 shadow-md max-w-full text-center">
            <Calendar className="w-4 h-4 text-[#4ade80] shrink-0" />
            <span className="truncate min-[420px]:whitespace-normal">THAISRM Annual Congress 2026 | Oct 15-17</span>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Legal */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 text-center sm:text-left">
          <p className="[text-wrap:balance]">
            {t.footer.copyright}
          </p>
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center text-[10px] sm:text-[11px]">
            <span className="hover:text-slate-400 transition-colors cursor-pointer">
              {t.footer.privacy}
            </span>
            <span className="opacity-40">•</span>
            <span className="hover:text-slate-400 transition-colors cursor-pointer">
              {t.footer.terms}
            </span>
            <span className="opacity-40">•</span>
            <span className="hover:text-slate-400 transition-colors flex items-center gap-1 cursor-pointer">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
              <span>{t.footer.pdpa}</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
