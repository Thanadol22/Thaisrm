'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ThaiSrmLogo } from '@/components/ThaiSrmLogo';
import { useLanguage } from '@/context/LanguageContext';
import { Calendar, Sparkles, MapPin, Globe, Menu, X, ChevronRight, LogOut, CreditCard } from 'lucide-react';

export function TopNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
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

  const handleLogout = () => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    } catch (e) {
      console.error('Logout error', e);
    }
    router.push('/login');
  };

  const navItems = [
    { label: lang === 'th' ? 'วาระการประชุม' : 'Agenda', href: '/agenda#agenda-section', icon: Calendar, isAnchor: true },
    { label: lang === 'th' ? 'ข่าวสาร & ประชาสัมพันธ์' : 'News & PR', href: '/agenda#pr-section', icon: Sparkles, isAnchor: true },
    { label: lang === 'th' ? 'สถานที่ & ติดต่อ' : 'Venue & Contact', href: '/agenda#contact-section', icon: MapPin, isAnchor: true },
    { label: t.nav.payment, href: '/payment', icon: CreditCard, isAnchor: false },
  ];

  return (
    <header ref={navRef} className="w-full bg-slate-950/95 backdrop-blur-md text-white sticky top-0 z-50 border-b border-slate-800/90 shadow-xl">
      <div className="px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Logo & Brand Info */}
        <Link
          href="/agenda"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2.5 hover:opacity-95 transition shrink-0 group"
          aria-label="THAISRM Agenda"
        >
          <ThaiSrmLogo className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 group-hover:scale-105 transition-transform" />
          <div className="flex flex-col justify-center shrink-0">
            <span className="block text-[9px] min-[360px]:text-[10px] font-bold text-blue-300 leading-none truncate max-w-[150px] min-[440px]:max-w-none">
              {t.associationName}
            </span>
            <span className="text-xs sm:text-sm font-black tracking-wider text-white leading-tight">
              {t.brandName} <span className="text-[#4ade80] text-[10px] font-bold">2026</span>
            </span>
          </div>
        </Link>

        {/* Right Section: Desktop Navigation & Language Switcher & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center bg-slate-900/90 p-1 rounded-2xl border border-slate-800 gap-1 shrink-0">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <a
                  key={idx}
                  href={item.href}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>{item.label}</span>
                </a>
              );
            })}

            {/* Logout Button in Desktop Nav */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-300 hover:text-rose-100 hover:bg-rose-950/60 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer border border-rose-500/20 active:scale-95"
              title={t.nav.signOut}
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{t.nav.signOut}</span>
            </button>
          </nav>

          {/* Language Switcher Pill */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition border border-white/15 cursor-pointer active:scale-95 shrink-0 shadow-xs"
            title="Switch Language / สลับภาษา"
          >
            <Globe className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
            <span className={lang === 'th' ? 'text-white font-black' : 'text-blue-200/60'}>TH</span>
            <span className="text-white/40 font-normal">|</span>
            <span className={lang === 'en' ? 'text-white font-black' : 'text-blue-200/60'}>EN</span>
          </button>

          {/* Mobile & Tablet Hamburger Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center transition border border-slate-700/80 cursor-pointer active:scale-95 shrink-0 shadow-sm"
            aria-label="Toggle Navigation Menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Expandable Drawer Navigation Menu */}
      {isOpen && (
        <div className="lg:hidden bg-slate-950/98 backdrop-blur-xl border-t border-slate-800/90 p-3 sm:p-4 animate-slide-down shadow-2xl space-y-1.5">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <a
                key={idx}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="w-full px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between text-slate-200 hover:bg-slate-800/80 hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800/90 text-[#4ade80]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </a>
            );
          })}

          {/* Mobile Logout Option */}
          <button
            onClick={() => {
              setIsOpen(false);
              handleLogout();
            }}
            className="w-full px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between text-rose-300 hover:bg-rose-950/50 hover:text-rose-100 border border-rose-900/40 mt-1 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-950/60 text-rose-400">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold">{t.nav.signOut}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-500" />
          </button>
        </div>
      )}
    </header>
  );
}



