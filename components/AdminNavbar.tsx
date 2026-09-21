'use client';

import React, { useState } from 'react';
import { TsrmLogo } from '@/components/TsrmLogo';
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
  Settings,
  Mail,
  Ticket
} from 'lucide-react';

export type AdminTab = 'dashboard' | 'revenue-report' | 'members' | 'add-meeting' | 'meeting-history' | 'coupons' | 'verify-slip' | 'verify-attendees' | 'receipts' | 'emails' | 'settings';

interface AdminNavbarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout?: () => void;
  pendingSlipsCount?: number;
  totalAttendeesCount?: number;
  checkedInCount?: number;
  receiptsCount?: number;
  membersCount?: number;
  couponsCount?: number;
}

const navItems: {
  id: AdminTab;
  labelTh: string;
  labelEn: string;
  icon: React.ElementType;
  badgeKey?: 'slips' | 'attendees' | 'receipts' | 'members' | 'coupons';
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
      id: 'coupons',
      labelTh: 'จัดการคูปอง',
      labelEn: 'Coupons & Sponsor',
      icon: Ticket,
      badgeKey: 'coupons',
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
      id: 'emails',
      labelTh: 'ระบบจัดการอีเมล',
      labelEn: 'Email Center',
      icon: Mail,
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
  couponsCount,
}: AdminNavbarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getBadge = (key?: 'slips' | 'attendees' | 'receipts' | 'members' | 'coupons') => {
    if (key === 'slips') return pendingSlipsCount > 0 ? pendingSlipsCount : undefined;
    if (key === 'attendees') return totalAttendeesCount > 0 ? `${checkedInCount}/${totalAttendeesCount}` : undefined;
    if (key === 'receipts') return receiptsCount > 0 ? receiptsCount : undefined;
    if (key === 'members' && typeof membersCount === 'number') return membersCount;
    if (key === 'coupons' && typeof couponsCount === 'number') return couponsCount;
    return undefined;
  };

  const handleSelect = (id: AdminTab) => {
    onTabChange(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* ─── Desktop Sidebar (Primary Theme #0026b3) ─── */}
      <aside className="hidden lg:flex flex-col w-72 h-screen fixed inset-y-0 left-0 z-40 bg-gradient-to-b from-[#0026b3] via-[#002094] to-[#001768] text-white border-r border-blue-900/50 shadow-2xl select-none">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-white/5 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm">
            <TsrmLogo className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white tracking-wider truncate">
                TSRM
              </span>
              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-black text-[#4ade80] bg-[#4ade80]/20 border border-[#4ade80]/40 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3 text-[#4ade80]" />
                ADMIN
              </span>
            </div>
            <span className="text-base font-black text-white leading-tight flex items-center gap-1.5 mt-0.5">
              ระบบแอดมิน
              <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse"></span>
            </span>
          </div>
        </div>

        {/* Live System Stats Pill */}
        <div className="mx-4 mt-3.5 px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 flex items-center justify-between text-xs font-medium backdrop-blur-xs shrink-0">
          <div className="flex items-center gap-2 text-blue-100">
            <Activity className="w-4 h-4 text-[#4ade80]" />
            <span>สถานะระบบ:</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#4ade80] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-ping"></span>
            <span>พร้อมใช้งาน</span>
          </div>
        </div>

        {/* Navigation Items (Scrollable when screen height is short) */}
        <nav className="flex-1 px-3.5 py-3 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          <div className="text-[11px] font-extrabold text-blue-200/70 uppercase tracking-wider px-3 py-1 mb-1 flex items-center justify-between">
            <span>เมนูจัดการระบบ</span>
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badge = getBadge(item.badgeKey);

            // High-visibility badge color based on badge type
            const getBadgeClass = () => {
              if (isActive) {
                return 'bg-[#0026b3] text-white shadow-xs';
              }
              switch (item.badgeKey) {
                case 'slips':
                  return 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/25 ring-1 ring-amber-300';
                case 'receipts':
                  return 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-md shadow-orange-400/25 ring-1 ring-orange-300';
                case 'attendees':
                  return 'bg-[#4ade80] text-slate-950 shadow-md shadow-emerald-400/25 ring-1 ring-emerald-300';
                case 'members':
                  return 'bg-white text-[#0026b3] shadow-md shadow-black/15 ring-1 ring-white/80';
                default:
                  return 'bg-white text-[#0026b3] shadow-sm';
              }
            };

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all group relative cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#0026b3] shadow-lg shadow-black/25 font-black'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Left accent marker for active tab */}
                  <div
                    className={`w-1 h-5 rounded-full transition-all shrink-0 ${
                      isActive ? 'bg-[#4ade80]' : 'bg-transparent'
                    }`}
                  />
                  <div className={`p-1.5 rounded-lg transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#0026b3] text-white shadow-xs'
                      : 'bg-white/10 text-blue-200 group-hover:bg-white/20 group-hover:text-white shadow-2xs'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="truncate text-left">{item.labelTh}</span>
                </div>
                {badge && (
                  <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full shrink-0 transition-all ${getBadgeClass()}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick summary footer (Pinned at bottom, never cut off) */}
        <div className="px-4 py-3.5 border-t border-white/10 bg-black/25 space-y-2.5 shrink-0">
          <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 flex items-center justify-between text-xs">
            <span className="text-blue-100 font-medium">สลิปรอตรวจสอบ:</span>
            <span className={`font-bold px-2 py-0.5 rounded-md ${pendingSlipsCount > 0 ? 'bg-amber-400 text-slate-950 font-black' : 'bg-emerald-400 text-slate-950 font-black'}`}>
              {pendingSlipsCount} รายการ
            </span>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-200 hover:text-white bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 transition-all cursor-pointer shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          )}
        </div>
      </aside>

      {/* ─── Mobile / Tablet Top Bar (Primary Theme) ──────────────────── */}
      <header className="lg:hidden w-full bg-gradient-to-r from-[#0026b3] to-[#001c80] text-white sticky top-0 z-50 border-b border-blue-900/50 shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
              <TsrmLogo className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-white leading-tight">TSRM Admin</span>
              <span className="text-[10px] font-bold text-blue-200 flex items-center gap-1">
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
                <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-white/15 text-white border border-white/20 truncate">
                  <Icon className="w-4 h-4 shrink-0 text-[#4ade80]" />
                  <span className="truncate">{current?.labelTh}</span>
                </span>
              );
            })()}
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer"
            aria-label="Toggle Admin Menu"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Drawer Backdrop & Menu */}
        {isMobileOpen && (
          <>
            <div
              className="fixed inset-0 top-[57px] bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity"
              onClick={() => setIsMobileOpen(false)}
            />
            <div className="fixed inset-x-0 top-[57px] z-50 bg-gradient-to-b from-[#0026b3] to-[#001768] text-white border-t border-white/10 p-4 max-h-[calc(100vh-60px)] overflow-y-auto animate-slide-down shadow-2xl space-y-3">
              <div className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const badge = getBadge(item.badgeKey);

                  const getMobileBadgeClass = () => {
                    if (isActive) {
                      return 'bg-[#0026b3] text-white shadow-xs';
                    }
                    switch (item.badgeKey) {
                      case 'slips':
                        return 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/25 ring-1 ring-amber-300';
                      case 'receipts':
                        return 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-md shadow-orange-400/25 ring-1 ring-orange-300';
                      case 'attendees':
                        return 'bg-[#4ade80] text-slate-950 shadow-md shadow-emerald-400/25 ring-1 ring-emerald-300';
                      case 'members':
                        return 'bg-white text-[#0026b3] shadow-md shadow-black/15 ring-1 ring-white/80';
                      default:
                        return 'bg-white text-[#0026b3] shadow-sm';
                    }
                  };

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-white text-[#0026b3] shadow-md shadow-black/20 border-white font-black'
                          : 'border-transparent text-blue-100 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-[#0026b3] text-white' : 'bg-white/10 text-blue-200'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold">{item.labelTh}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {badge && (
                          <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${getMobileBadgeClass()}`}>
                            {badge}
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[#0026b3]' : 'text-blue-200/70'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
              {onLogout && (
                <div className="pt-3 border-t border-white/10">
                  <button
                    onClick={() => { setIsMobileOpen(false); onLogout?.(); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 transition cursor-pointer"
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


