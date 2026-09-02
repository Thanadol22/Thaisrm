'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BornIvfLogo } from '@/components/BornIvfLogo';
import { useLanguage } from '@/context/LanguageContext';
import { LogIn, UserPlus, CreditCard, QrCode, Menu, X, ChevronRight, Globe } from 'lucide-react';

export function TopNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { lang, toggleLang, t } = useLanguage();
  const navRef = useRef<HTMLDivElement>(null);

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close mobile drawer when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const navItems = [
    { label: t.nav.signIn, path: '/login', icon: LogIn, badge: null },
    { label: t.nav.signUp, path: '/signup', icon: UserPlus, badge: null },
    { label: t.nav.payment, path: '/payment', icon: CreditCard, badge: null },
    { label: t.nav.staffScan, path: '/staff/scan', icon: QrCode, badge: t.nav.staffBadge },
  ];

  return (
    <header ref={navRef} className="w-full bg-slate-900/95 backdrop-blur-md text-white sticky top-0 z-50 border-b border-slate-800/90 shadow-lg">
      <div className="px-2.5 sm:px-3.5 py-2 flex items-center justify-between gap-1.5 max-w-7xl mx-auto">
        {/* Logo & Brand Info */}
        <Link
          href="/login"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2 hover:opacity-90 transition shrink-0"
          aria-label="THAISRM Home"
        >
          <BornIvfLogo className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 transition-transform active:scale-95" />
          <div className="flex flex-col justify-center shrink-0">
            <span className="hidden min-[480px]:block text-[9px] min-[540px]:text-[10px] font-bold text-blue-300 leading-none truncate max-w-[130px] min-[540px]:max-w-[200px] min-[1080px]:max-w-none">
              {t.associationName}
            </span>
            <span className="text-xs sm:text-sm font-black tracking-wider text-white leading-tight">
              {t.brandName}
            </span>
          </div>
        </Link>

        {/* Right Section: Nav Items & Language Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Desktop & Wide Layout Navigation Pills */}
          <nav className="hidden min-[1080px]:flex items-center bg-slate-950/90 p-0.5 rounded-xl border border-slate-800/90 gap-0.5 shrink-0">
            {navItems.map((item) => {
              const isActive = pathname === item.path || (pathname === '/' && item.path === '/login');
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-2 py-1 rounded-lg text-[10px] min-[1180px]:text-[11px] font-bold transition-all flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#0026b3] text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-0.5 bg-emerald-500/20 text-emerald-300 text-[8px] font-black px-1 py-0.2 rounded-full border border-emerald-500/40 uppercase">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Language Switcher Button */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition cursor-pointer active:scale-95 shrink-0 shadow-sm"
            title="Switch Language / สลับภาษา"
            aria-label="Switch language between Thai and English"
          >
            <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400 shrink-0" />
            <span className={lang === 'th' ? 'text-white font-black text-blue-300' : 'text-slate-400 font-medium'}>TH</span>
            <span className="text-slate-600 font-normal text-[9px]">|</span>
            <span className={lang === 'en' ? 'text-white font-black text-blue-300' : 'text-slate-400 font-medium'}>EN</span>
          </button>

          {/* Mobile & Tablet Hamburger Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="min-[1080px]:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center transition border border-slate-700/80 cursor-pointer active:scale-95 shrink-0 shadow-sm"
            aria-label="Toggle Navigation Menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Expandable Drawer Navigation Menu */}
      {isOpen && (
        <div className="min-[1080px]:hidden bg-slate-950/98 backdrop-blur-xl border-t border-slate-800/90 p-2.5 sm:p-3 animate-slide-down shadow-2xl space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (pathname === '/' && item.path === '/login');
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsOpen(false)}
                className={`w-full px-3 py-2.5 sm:py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                  isActive
                    ? 'bg-[#0026b3] text-white shadow-lg ring-1 ring-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-white/20' : 'bg-slate-800/90'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold">{item.label}</span>
                </div>

                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-white translate-x-0.5' : 'text-slate-500 opacity-70'}`} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

