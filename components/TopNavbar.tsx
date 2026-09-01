'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BornIvfLogo } from '@/components/BornIvfLogo';
import { LogIn, UserPlus, CreditCard, QrCode, Menu, X, ChevronRight } from 'lucide-react';

export function TopNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { label: 'Sign In', fullLabel: 'Sign In (เข้าสู่ระบบ)', path: '/login', icon: LogIn, badge: null },
    { label: 'Sign Up', fullLabel: 'Sign Up (สมัครสมาชิก)', path: '/signup', icon: UserPlus, badge: null },
    { label: 'Payment', fullLabel: 'Payment (ชำระเงินและสลิป)', path: '/payment', icon: CreditCard, badge: null },
    { label: 'Staff Scan', fullLabel: 'Staff Scan (สแกนเช็คอิน)', path: '/staff/scan', icon: QrCode, badge: 'Staff' },
  ];

  return (
    <header className="w-full bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-md">
      <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        <Link href="/login" onClick={() => setIsOpen(false)} className="flex items-center gap-2 hover:opacity-90 transition flex-shrink-0">
          <BornIvfLogo className="w-8 h-8" />
          <div>
            <span className="text-sm font-extrabold tracking-wide text-white block leading-tight">THAISRM</span>
            <span className="text-[10px] text-slate-400 font-medium block whitespace-nowrap">Meeting Summit 2026</span>
          </div>
        </Link>

        {/* Tablet & Desktop Inline Navigation Pills */}
        <nav className="hidden md:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-0.5 lg:gap-1 flex-shrink-0">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (pathname === '/' && item.path === '/login');
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`px-2 py-1.5 lg:px-2.5 rounded-lg text-[11px] lg:text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-[#0026b3] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile & Small Tablet Hamburger Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center transition border border-slate-700/80 cursor-pointer active:scale-95 flex-shrink-0"
          aria-label="Toggle Hamburger Menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile & Small Tablet Hamburger Dropdown Navigation Menu */}
      {isOpen && (
        <div className="md:hidden bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-3 animate-slide-down shadow-2xl space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (pathname === '/' && item.path === '/login');
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsOpen(false)}
                className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                  isActive
                    ? 'bg-[#0026b3] text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-white/15' : 'bg-slate-800'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{item.fullLabel}</span>
                </div>

                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
