'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThaiSrmLogo } from '@/components/ThaiSrmLogo';
import { useLanguage } from '@/context/LanguageContext';
import { 
  QrCode, 
  Receipt, 
  Users, 
  Globe, 
  Menu, 
  X, 
  ChevronRight, 
  Lock, 
  LogOut, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export type StaffTab = 'scan' | 'slips' | 'history';

interface StaffTopNavbarProps {
  activeTab: StaffTab;
  onTabChange: (tab: StaffTab) => void;
  pendingSlipsCount?: number;
  totalRegisteredCount?: number;
  checkedInCount?: number;
  onLock: () => void;
  onExit: () => void;
}

export function StaffTopNavbar({
  activeTab,
  onTabChange,
  pendingSlipsCount = 3,
  totalRegisteredCount = 500,
  checkedInCount = 148,
  onLock,
  onExit,
}: StaffTopNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { lang, toggleLang, t } = useLanguage();
  const navRef = useRef<HTMLDivElement>(null);

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

  const navItems: { id: StaffTab; label: string; icon: React.ElementType; badge?: number | string; badgeColor?: string }[] = [
    {
      id: 'scan',
      label: lang === 'th' ? 'สแกนเช็คอิน' : 'Scan Check-in',
      icon: QrCode,
    },
    {
      id: 'slips',
      label: lang === 'th' ? 'สลิปการโอนเงิน' : 'Payment Slips',
      icon: Receipt,
      badge: pendingSlipsCount > 0 ? pendingSlipsCount : undefined,
      badgeColor: 'bg-amber-400 text-amber-950',
    },
    {
      id: 'history',
      label: lang === 'th' ? 'ข้อมูลการลงทะเบียน' : 'Registration Data',
      icon: Users,
      badge: `${checkedInCount}/${totalRegisteredCount}`,
      badgeColor: 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30',
    },
  ];

  const handleSelectTab = (tabId: StaffTab) => {
    onTabChange(tabId);
    setIsOpen(false);
  };

  return (
    <header ref={navRef} className="w-full bg-slate-950/95 backdrop-blur-md text-white sticky top-0 z-50 border-b border-slate-800/90 shadow-xl">
      <div className="px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Logo & Brand Info with Staff Indicator */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div 
            onClick={() => handleSelectTab('scan')} 
            className="flex items-center gap-2.5 cursor-pointer group hover:opacity-95 transition"
            title="TSRM Staff Portal"
          >
            <ThaiSrmLogo className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 group-hover:scale-105 transition-transform" />
            <div className="flex flex-col justify-center shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="block text-[9px] min-[360px]:text-[10px] font-bold text-blue-300 leading-none truncate max-w-[120px] min-[440px]:max-w-none">
                  {t.associationName}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30 text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  STAFF
                </span>
              </div>
              <span className="text-xs sm:text-sm font-black tracking-wider text-white leading-tight flex items-center gap-1.5">
                {t.brandName} <span className="text-[#4ade80] text-[10px] font-bold">STAFF PORTAL</span>
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center bg-slate-900/90 p-1 rounded-2xl border border-slate-800 gap-1 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#0026b3] text-white shadow-md ring-1 ring-blue-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#4ade80]' : 'text-blue-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-blue-500 text-white'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Section: Language Switcher, Lock & Exit */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
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

          {/* Lock Staff View Button */}
          <button
            onClick={onLock}
            className="hidden sm:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition border border-slate-700/80 cursor-pointer active:scale-95 shrink-0"
            title={lang === 'th' ? 'ล็อคหน้าต่างเจ้าหน้าที่' : 'Lock Staff View'}
          >
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden lg:inline">{t.staff.passcodeLock}</span>
          </button>

          {/* Exit / Return to Login Button */}
          <button
            onClick={onExit}
            className="hidden sm:flex items-center gap-1.5 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border border-rose-800/40 cursor-pointer active:scale-95 shrink-0"
            title={lang === 'th' ? 'ออกจากระบบเจ้าหน้าที่' : 'Exit Staff'}
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="hidden lg:inline">{lang === 'th' ? 'ออกจากระบบ' : 'Exit'}</span>
          </button>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center transition border border-slate-700/80 cursor-pointer active:scale-95 shrink-0 shadow-sm"
            aria-label="Toggle Staff Navigation Menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div className="md:hidden bg-slate-950/98 backdrop-blur-xl border-t border-slate-800/90 p-3 sm:p-4 animate-slide-down shadow-2xl space-y-2">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'bg-[#0026b3] text-white shadow-md ring-1 ring-blue-400/30'
                      : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-800 text-[#4ade80]' : 'bg-slate-800/90 text-blue-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge !== undefined && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-blue-500 text-white'}`}>
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onLock();
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/40 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.staff.passcodeLock}</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                onExit();
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>{lang === 'th' ? 'ออกจากระบบ' : 'Exit'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
