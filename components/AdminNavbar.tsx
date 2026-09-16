'use client';

import React, { useState } from 'react';
import { ThaiSrmLogo } from '@/components/ThaiSrmLogo';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Receipt,
  UserCheck,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Activity,
  FileText,
  DollarSign,
  Users,
  Settings
} from 'lucide-react';

export type AdminTab = 'dashboard' | 'revenue-report' | 'members' | 'add-meeting' | 'meeting-history' | 'verify-slip' | 'verify-attendees' | 'receipts' | 'settings';

interface AdminNavbarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout?: () => void;
  pendingSlipsCount?: number;
  totalAttendeesCount?: number;
  checkedInCount?: number;
  receiptsCount?: number;
  membersCount?: number;
}

const navItems: {
  id: AdminTab;
  labelTh: string;
  labelEn: string;
  icon: React.ElementType;
  badgeKey?: 'slips' | 'attendees' | 'receipts' | 'members';
}[] = [
  {
    id: 'dashboard',
    labelTh: 'ภาพรวมแดชบอร์ด',
    labelEn: 'Overview Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'members',
    labelTh: 'จัดการสมาชิก',
    labelEn: 'Member Management',
    icon: Users,
    badgeKey: 'members',
  },
  {
    id: 'revenue-report',
    labelTh: 'รายงานรายได้',
    labelEn: 'Revenue Report',
    icon: DollarSign,
  },
  {
    id: 'receipts',
    labelTh: 'ออกใบเสร็จรับเงิน',
    labelEn: 'Receipts & Invoices',
    icon: FileText,
    badgeKey: 'receipts',
  },
  {
    id: 'add-meeting',
    labelTh: 'เพิ่มการประชุม',
    labelEn: 'Add Meeting',
    icon: PlusCircle,
  },
  {
    id: 'meeting-history',
    labelTh: 'ประวัติการประชุม',
    labelEn: 'Meeting History',
    icon: ClipboardList,
  },
  {
    id: 'verify-slip',
    labelTh: 'ตรวจสอบสลิป',
    labelEn: 'Verify Slips',
    icon: Receipt,
    badgeKey: 'slips',
  },
  {
    id: 'verify-attendees',
    labelTh: 'ตรวจสอบผู้เข้าร่วม',
    labelEn: 'Verify Attendees',
    icon: UserCheck,
    badgeKey: 'attendees',
  },
  {
    id: 'settings',
    labelTh: 'ตั้งค่าระบบ',
    labelEn: 'System Settings',
    icon: Settings,
  },
];

export function AdminNavbar({
  activeTab,
  onTabChange,
  onLogout,
  pendingSlipsCount = 0,
  totalAttendeesCount = 0,
  checkedInCount = 0,
  receiptsCount = 0,
  membersCount,
}: AdminNavbarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getBadge = (key?: 'slips' | 'attendees' | 'receipts' | 'members') => {
    if (key === 'slips') return pendingSlipsCount > 0 ? pendingSlipsCount : undefined;
    if (key === 'attendees') return totalAttendeesCount > 0 ? `${checkedInCount}/${totalAttendeesCount}` : undefined;
    if (key === 'receipts') return receiptsCount > 0 ? receiptsCount : undefined;
    if (key === 'members' && typeof membersCount === 'number') return membersCount;
    return undefined;
  };

  const handleSelect = (id: AdminTab) => {
    onTabChange(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* ─── Desktop Sidebar (Light Theme with Brand Primary & Accent) ─── */}
      <aside className="hidden lg:flex flex-col w-72 min-h-screen bg-white border-r border-slate-200/90 shadow-sm fixed top-0 left-0 z-40">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100 bg-gradient-to-b from-blue-50/50 to-transparent">
          <ThaiSrmLogo className="w-10 h-10 shrink-0 drop-shadow-xs" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-[#0026b3] tracking-wider truncate">
                THAI SRM
              </span>
              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-black text-emerald-900 bg-[#4ade80]/25 border border-[#4ade80]/50 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3 text-emerald-700" />
                ADMIN
              </span>
            </div>
            <span className="text-base font-black text-slate-900 leading-tight flex items-center gap-1.5 mt-0.5">
              ระบบแอดมิน
              <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse"></span>
            </span>
          </div>
        </div>

        {/* Live System Stats Pill */}
        <div className="mx-4 mt-4 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2 text-slate-600">
            <Activity className="w-4 h-4 text-[#0026b3]" />
            <span>สถานะระบบ:</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
            <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-ping"></span>
            <span>พร้อมใช้งาน</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
            <span>เมนูจัดการระบบ</span>
            <Sparkles className="w-3.5 h-3.5 text-[#0026b3]" />
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badge = getBadge(item.badgeKey);
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all group relative cursor-pointer ${
                  isActive
                    ? 'bg-[#0026b3] text-white shadow-md shadow-[#0026b3]/25 font-extrabold'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/90'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#4ade80] rounded-r-full" />
                )}
                <div className="flex items-center gap-3 min-w-0 pl-1">
                  <div className={`p-2 rounded-lg transition-all shrink-0 ${
                    isActive
                      ? 'bg-white/15 text-[#4ade80]'
                      : 'bg-slate-100 group-hover:bg-blue-100/70 text-slate-600 group-hover:text-[#0026b3] shadow-2xs'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left whitespace-nowrap">
                    <span className="block whitespace-nowrap">{item.labelTh}</span>
                  </div>
                </div>
                {badge && (
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 transition-all ${
                    isActive
                      ? 'bg-[#4ade80] text-slate-950 shadow-xs'
                      : item.badgeKey === 'slips'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-blue-50 text-[#0026b3] border border-blue-200'
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick summary footer */}
        <div className="px-4 py-4 border-t border-slate-100 bg-slate-50/70 space-y-3">
          <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">สลิปรอตรวจสอบ:</span>
            <span className={`font-bold px-2 py-0.5 rounded-md ${pendingSlipsCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700'}`}>
              {pendingSlipsCount} รายการ
            </span>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/80 transition-all cursor-pointer shadow-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ</span>
            </button>
          )}
        </div>
      </aside>

      {/* ─── Mobile / Tablet Top Bar (Light Theme) ──────────────────── */}
      <header className="lg:hidden w-full bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 shadow-xs">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <ThaiSrmLogo className="w-8 h-8 shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-900 leading-tight">Thai SRM Admin</span>
              <span className="text-[10px] font-bold text-[#0026b3] flex items-center gap-1">
                <span>ระบบแอดมิน</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></span>
              </span>
            </div>
          </div>

          {/* Current Tab Label */}
          <div className="flex-1 flex justify-center px-2">
            {(() => {
              const current = navItems.find((n) => n.id === activeTab);
              const Icon = current?.icon ?? LayoutDashboard;
              return (
                <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-[#0026b3] border border-blue-100 truncate">
                  <Icon className="w-4 h-4 shrink-0 text-[#0026b3]" />
                  <span className="truncate">{current?.labelTh}</span>
                </span>
              );
            })()}
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#0026b3] border border-slate-200 transition cursor-pointer"
            aria-label="Toggle Admin Menu"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Drawer Backdrop & Menu */}
        {isMobileOpen && (
          <>
            <div
              className="fixed inset-0 top-[57px] bg-slate-950/40 backdrop-blur-xs z-40"
              onClick={() => setIsMobileOpen(false)}
            />
            <div className="relative z-50 bg-white border-t border-slate-200 p-3.5 max-h-[calc(100vh-70px)] overflow-y-auto animate-slide-down shadow-2xl">
              <div className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const badge = getBadge(item.badgeKey);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border
                        ${isActive
                          ? 'bg-[#0026b3] text-white shadow-md shadow-[#0026b3]/25 border-[#0026b3]'
                          : 'border-transparent text-slate-700 hover:text-[#0026b3] hover:bg-blue-50/70'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-white/15 text-[#4ade80]' : 'bg-slate-100 text-slate-600'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold">{item.labelTh}</div>
                          <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>{item.labelEn}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {badge && (
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-[#4ade80] text-slate-950 shadow-xs'
                              : item.badgeKey === 'slips'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-blue-50 text-[#0026b3] border border-blue-200'
                          }`}>
                            {badge}
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[#4ade80]' : 'text-slate-400'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
              {onLogout && (
                <div className="pt-3 border-t border-slate-100 mt-3">
                  <button
                    onClick={() => { setIsMobileOpen(false); onLogout?.(); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </header>
    </>
  );
}


