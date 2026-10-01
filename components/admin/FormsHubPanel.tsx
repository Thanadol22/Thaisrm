'use client';

import React, { useState } from 'react';
import {
  Building2,
  Copy,
  Check,
  ExternalLink,
  FileStack,
  HardHat,
  ShieldCheck,
  Users,
  ArrowRight,
  Clock,
  Link2,
} from 'lucide-react';
import type { AdminTab } from '@/components/AdminNavbar';
import { AdminCompanyMemberModal, CompanyOption } from '@/components/AdminCompanyMemberModal';
import { ADMIN_FORMS, FORM_AUDIENCES, FormAudience, AdminFormItem, FormAction } from './adminFormsCatalog';
import { SpecialFormsManager } from './SpecialFormsManager';
import type { MeetingItem } from './types';

const AUDIENCE_STYLE: Record<FormAudience, { icon: React.ElementType; accent: string; chip: string }> = {
  public: { icon: Users, accent: 'bg-blue-50 text-[#0026b3] border-blue-100', chip: 'bg-blue-50 text-[#0026b3] border-blue-200' },
  company: { icon: Building2, accent: 'bg-violet-50 text-violet-700 border-violet-100', chip: 'bg-violet-50 text-violet-700 border-violet-200' },
  staff: { icon: HardHat, accent: 'bg-amber-50 text-amber-700 border-amber-100', chip: 'bg-amber-50 text-amber-800 border-amber-200' },
  admin: { icon: ShieldCheck, accent: 'bg-emerald-50 text-emerald-700 border-emerald-100', chip: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};

export function absoluteFormUrl(href: string): string {
  if (typeof window === 'undefined') return href;
  return `${window.location.origin}${href}`;
}

/** ปุ่มคำสั่งของฟอร์ม ใช้ร่วมกันในหน้าแดชบอร์ดและหน้ารวมฟอร์ม */
export function useFormActions(onNavigateTab: (tab: AdminTab) => void, onShowToast?: (msg: string) => void) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);

  const copyLink = async (id: string, href: string) => {
    try {
      await navigator.clipboard.writeText(absoluteFormUrl(href));
      setCopiedId(id);
      onShowToast?.('คัดลอกลิงก์ฟอร์มแล้ว');
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
    } catch {
      onShowToast?.('คัดลอกลิงก์ไม่สำเร็จ กรุณาคัดลอกจากช่องลิงก์');
    }
  };

  const openCompanyRegister = async () => {
    setCompanyModalOpen(true);
    if (companies.length > 0) return;
    try {
      const res = await fetch('/api/sponsors');
      const data = await res.json();
      if (res.ok && data.success) setCompanies(data.sponsors || []);
    } catch (err) {
      console.error('Failed to load sponsors:', err);
    }
  };

  const runAction = (action: FormAction) => {
    if (action.kind === 'open') window.open(action.href, '_blank', 'noopener,noreferrer');
    else if (action.kind === 'tab') onNavigateTab(action.tab);
    else openCompanyRegister();
  };

  const companyModal = (
    <AdminCompanyMemberModal
      isOpen={companyModalOpen}
      onClose={() => setCompanyModalOpen(false)}
      companies={companies}
      onSuccess={(msg) => onShowToast?.(msg)}
    />
  );

  return { copiedId, copyLink, runAction, companyModal };
}

function ActionButton({ action, primary, onRun }: { action: FormAction; primary: boolean; onRun: () => void }) {
  const Icon = action.kind === 'open' ? ExternalLink : action.kind === 'company-register' ? Building2 : ArrowRight;
  return (
    <button
      type="button"
      onClick={onRun}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
        primary
          ? 'bg-[#0026b3] hover:bg-[#001c8c] text-white shadow-sm'
          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{action.label}</span>
    </button>
  );
}

function FormCard({
  form,
  copied,
  onCopy,
  onRun,
}: {
  form: AdminFormItem;
  copied: boolean;
  onCopy: () => void;
  onRun: (action: FormAction) => void;
}) {
  const style = AUDIENCE_STYLE[form.audience];
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-4 sm:p-5 bg-white shadow-xs ${
        form.planned ? 'border-dashed border-slate-300 bg-slate-50/60' : 'border-slate-200/90'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">{form.title}</h4>
          <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">{form.description}</p>
        </div>
        {form.planned && (
          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
            <Clock className="w-3 h-3" />
            กำลังพัฒนา
          </span>
        )}
      </div>

      <div className={`inline-flex w-fit items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg border ${style.chip}`}>
        <span>เข้าใช้งาน:</span>
        <span className="font-semibold">{form.access}</span>
      </div>

      {form.href && !form.planned && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 min-w-0">
          <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs font-mono text-slate-600 truncate flex-1 min-w-0">{form.href}</span>
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</span>
          </button>
        </div>
      )}

      {form.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-auto pt-1">
          {form.actions.map((action, idx) => (
            <ActionButton key={idx} action={action} primary={idx === 0} onRun={() => onRun(action)} />
          ))}
        </div>
      )}
    </div>
  );
}

export interface FormsHubPanelProps {
  onNavigateTab: (tab: AdminTab) => void;
  onShowToast?: (msg: string) => void;
  meetings: MeetingItem[];
}

/** เมนูรวมฟอร์มทั้งหมดของระบบ แยกตามกลุ่มผู้ใช้ */
export function FormsHubPanel({ onNavigateTab, onShowToast, meetings }: FormsHubPanelProps) {
  const { copiedId, copyLink, runAction, companyModal } = useFormActions(onNavigateTab, onShowToast);
  const [filter, setFilter] = useState<FormAudience | 'all'>('all');

  const audiences = FORM_AUDIENCES.filter((a) => filter === 'all' || a.id === filter);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 text-[#0026b3] border border-blue-100">
            <FileStack className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">ฟอร์มลงทะเบียน</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              รวมทุกฟอร์มของระบบ แยกตามผู้ใช้งาน พร้อมลิงก์สำหรับส่งต่อและเมนูที่เกี่ยวข้อง
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[{ id: 'all' as const, title: 'ทั้งหมด' }, ...FORM_AUDIENCES.map((a) => ({ id: a.id, title: a.shortTitle }))].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                filter === opt.id
                  ? 'bg-[#0026b3] text-white border-[#0026b3]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {opt.title}
            </button>
          ))}
        </div>
      </div>

      {audiences.map((aud) => {
        const style = AUDIENCE_STYLE[aud.id];
        const Icon = style.icon;
        const forms = ADMIN_FORMS.filter((f) => f.audience === aud.id);
        return (
          <section key={aud.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${style.accent}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {aud.title} <span className="text-slate-400 font-bold">({forms.length})</span>
                </h3>
                <p className="text-xs text-slate-500">{aud.description}</p>
              </div>
            </div>
            {aud.id === 'company' && (
              <SpecialFormsManager meetings={meetings} onNavigateTab={onNavigateTab} onShowToast={onShowToast} />
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {forms.map((form) => (
                <FormCard
                  key={form.id}
                  form={form}
                  copied={copiedId === form.id}
                  onCopy={() => form.href && copyLink(form.id, form.href)}
                  onRun={runAction}
                />
              ))}
            </div>
          </section>
        );
      })}

      {companyModal}
    </div>
  );
}
