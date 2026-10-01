'use client';

import React from 'react';
import { ArrowRight, Check, ChevronRight, Copy, ExternalLink, FileStack, LayoutGrid, ShieldCheck } from 'lucide-react';
import { AdminTab, navGroups } from '@/components/AdminNavbar';
import { ADMIN_FORMS, FORM_AUDIENCES } from './adminFormsCatalog';
import { useFormActions } from './FormsHubPanel';

interface DashboardShortcutsProps {
  onNavigateTab: (tab: AdminTab) => void;
  onShowToast?: (msg: string) => void;
  pendingSlipsCount: number;
  checkedInCount: number;
  registeredCount: number;
}

/** แดชบอร์ด: ฟอร์มลงทะเบียน ฟอร์มที่แอดมินกรอก และเมนูจัดการ แยกตามประเภท */
export function DashboardShortcuts({
  onNavigateTab,
  onShowToast,
  pendingSlipsCount,
  checkedInCount,
  registeredCount,
}: DashboardShortcutsProps) {
  const { copiedId, copyLink, runAction, companyModal } = useFormActions(onNavigateTab, onShowToast);

  const userForms = ADMIN_FORMS.filter((f) => f.audience !== 'admin' && !f.planned && f.href);
  const adminForms = ADMIN_FORMS.filter((f) => f.audience === 'admin');
  const audienceTitle = (id: string) => FORM_AUDIENCES.find((a) => a.id === id)?.shortTitle || '';
  const manageGroups = navGroups.filter((g) => g.title !== 'ภาพรวม');

  const badgeFor = (tab: AdminTab): string | null => {
    if (tab === 'verify-slip' && pendingSlipsCount > 0) return `รอตรวจ ${pendingSlipsCount}`;
    if (tab === 'verify-attendees' && registeredCount > 0) return `เช็คอิน ${checkedInCount}/${registeredCount}`;
    return null;
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* ฟอร์มที่ผู้ใช้กรอก */}
        <div className="xl:col-span-3 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <FileStack className="w-5 h-5 text-[#0026b3]" />
              ฟอร์มลงทะเบียน
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('forms')}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#0026b3] hover:underline cursor-pointer"
            >
              ดูฟอร์มทั้งหมด
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {userForms.map((form) => (
              <li key={form.id} className="flex items-center gap-3 px-3.5 py-3 hover:bg-slate-50/70">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">{form.title}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {audienceTitle(form.audience)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{form.access}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyLink(form.id, form.href!)}
                  title="คัดลอกลิงก์"
                  aria-label={`คัดลอกลิงก์ ${form.title}`}
                  className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                >
                  {copiedId === form.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={form.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="เปิดฟอร์ม"
                  aria-label={`เปิดฟอร์ม ${form.title}`}
                  className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg bg-[#0026b3] hover:bg-[#001c8c] text-white"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* ฟอร์มที่แอดมินกรอก */}
        <div className="xl:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            ทำรายการโดยแอดมิน
          </h3>
          <div className="space-y-2">
            {adminForms.map((form) => {
              const action = form.actions[0];
              if (!action) return null;
              return (
                <button
                  key={form.id}
                  type="button"
                  onClick={() => runAction(action)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-emerald-50/60 hover:border-emerald-200 text-left transition cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-800">{form.title}</div>
                    <div className="text-xs text-slate-500 truncate">{form.description}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* เมนูจัดการแยกตามประเภท */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-[#0026b3]" />
          เมนูจัดการแยกตามประเภท
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {manageGroups.map((group) => (
            <div key={group.title} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-1.5">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider px-1 pb-1">{group.title}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const badge = badgeFor(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigateTab(item.id)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white border border-slate-200/80 hover:border-[#0026b3]/40 hover:bg-blue-50/40 text-left transition cursor-pointer"
                  >
                    <div className="p-1.5 rounded-md bg-blue-50 text-[#0026b3] shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-700 flex-1 min-w-0 truncate">{item.labelTh}</span>
                    {badge && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 whitespace-nowrap">
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {companyModal}
    </div>
  );
}
