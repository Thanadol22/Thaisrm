'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BornIvfLogo } from '@/components/BornIvfLogo';
import { LogIn, UserPlus, CreditCard, QrCode } from 'lucide-react';

export function TopNavbar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Sign In', path: '/login', icon: LogIn },
    { label: 'Sign Up', path: '/signup', icon: UserPlus },
    { label: 'Payment', path: '/payment', icon: CreditCard },
    { label: 'Staff Scan', path: '/staff/scan', icon: QrCode },
  ];

  return (
    <header className="w-full max-w-md bg-slate-900 text-white px-3 py-2.5 shadow-md flex items-center justify-between sticky top-0 z-40 border-b border-slate-800">
      <Link href="/login" className="flex items-center gap-2 hover:opacity-90 transition">
        <BornIvfLogo className="w-7 h-7" />
        <span className="text-xs font-bold tracking-wide">Born IVF</span>
      </Link>

      {/* Screen Navigation Tab Bar */}
      <nav className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (pathname === '/' && item.path === '/login');
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#0026b3] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
