'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Btn, EmptyState, SectionTitle } from './ui';
import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { AdminTab } from '@/components/AdminNavbar';
import { AdminCompanyMemberModal, AdminSpecialFormOption, CompanyOption } from '@/components/AdminCompanyMemberModal';
import type { MeetingItem } from './types';

interface FormItemInput {
  activityId: string;
  label: string;
  onsiteMember: number;
  onsiteNonMember: number;
  online: number;
}

interface SpecialFormRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  formType: string;
  meetingId: string;
  meetingName: string;
  items: FormItemInput[];
  allowCoupon: boolean;
  isOpen: boolean;
  closeAt: string | null;
  sponsors: { id: string; name: string; contactEmail: string }[];
  stats: { slips: number; attendees: number; amount: number; pending: number };
}

interface DraftForm {
  id?: string;
  title: string;
  description: string;
  formType: string;
  meetingId: string;
  items: Record<string, FormItemInput & { enabled: boolean }>;
  allowCoupon: boolean;
  isOpen: boolean;
  closeAt: string;
  sponsorIds: string[];
}

const FORM_TYPE_OPTIONS = [
  { id: 'fellow', label: 'ราคา fellow' },
  { id: 'special', label: 'ราคาพิเศษ' },
];

const isMain = (a: any) => a?.type === 'main' || a?.id === 'main';

/** ราคา fellow ที่ตั้งไว้ในการประชุม (ตรงกับ getMeetingFellowPrices ฝั่งเซิร์ฟเวอร์) */
function meetingFellowPrices(meeting: MeetingItem | undefined) {
  const f = (meeting?.pricingTiers as any)?.fellow;
  if (!f || f.enabled === false) return null;
  const prices = {
    onsiteMember: Math.max(0, Number(f.onsiteMember) || 0),
    onsiteNonMember: Math.max(0, Number(f.onsiteNonMember) || 0),
    online: Math.max(0, Number(f.onlineMember) || 0),
  };
  return prices.onsiteMember + prices.onsiteNonMember + prices.online > 0 ? prices : null;
}

/** ราคาเริ่มต้นของรายการ: fellow ใช้ราคา fellow ที่ตั้งไว้ในการประชุม (ถ้ามี) ที่เหลือใช้ราคาปกติ */
function defaultItem(act: any, meeting: MeetingItem | undefined, formType: string): FormItemInput {
  const tiers = (meeting?.pricingTiers || {}) as any;
  if (isMain(act)) {
    const f = formType === 'fellow' ? tiers.fellow : null;
    const fellow =
      f && Number(f.onsiteMember || 0) + Number(f.onsiteNonMember || 0) + Number(f.onlineMember ?? f.onlineMemberPrice ?? 0) > 0 ? f : null;
    const p = tiers.participant || {};
    return {
      activityId: String(act.id),
      label: act.name || 'Main Program',
      onsiteMember: Number(fellow?.onsiteMember ?? p.onsiteMember ?? 0),
      onsiteNonMember: Number(fellow?.onsiteNonMember ?? p.onsiteNonMember ?? 0),
      online: Number(
        fellow ? fellow.onlineMember ?? (fellow.onlineMemberType === 'free' ? 0 : fellow.onlineMemberPrice ?? 0) : p.onlineMember ?? 0
      ),
    };
  }
  return {
    activityId: String(act.id),
    label: act.name || String(act.id),
    onsiteMember: Number(act.memberPrice ?? act.price ?? 0),
    onsiteNonMember: Number(act.nonMemberPrice ?? act.memberPrice ?? act.price ?? 0),
    online: 0,
  };
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formUrl(slug: string) {
  return typeof window === 'undefined' ? `/forms/${slug}` : `${window.location.origin}/forms/${slug}`;
}

export function SpecialFormsManager({
  meetings,
  onNavigateTab,
  onShowToast,
}: {
  meetings: MeetingItem[];
  onNavigateTab: (tab: AdminTab) => void;
  onShowToast?: (msg: string) => void;
}) {
  const [forms, setForms] = useState<SpecialFormRow[] | null>(null);
  const [sponsors, setSponsors] = useState<CompanyOption[]>([]);
  const [draft, setDraft] = useState<DraftForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [registerFor, setRegisterFor] = useState<{ form: AdminSpecialFormOption; companies: CompanyOption[] } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const toast = (msg: string) => onShowToast?.(msg);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/special-forms');
      const data = await res.json();
      setForms(data.success ? data.data : []);
    } catch {
      setForms([]);
    }
  }, []);

  useEffect(() => {
    load();
    fetch('/api/sponsors')
      .then((r) => r.json())
      .then((d) => d.success && setSponsors(d.sponsors || []))
      .catch(() => {});
  }, [load]);

  const openCreate = () => {
    const meeting = meetings.find((m) => m.status !== 'completed') || meetings[0];
    setFormError('');
    setDraft(buildDraft({ meeting, formType: 'fellow' }));
  };

  const buildDraft = ({ meeting, formType, base }: { meeting?: MeetingItem; formType: string; base?: SpecialFormRow }): DraftForm => {
    const acts: any[] = meeting?.activities || [];
    const items: DraftForm['items'] = {};
    for (const act of acts) {
      const existing = base?.items.find((i) => i.activityId === String(act.id));
      items[String(act.id)] = existing
        ? { ...existing, enabled: true }
        : { ...defaultItem(act, meeting, formType), enabled: !base && isMain(act) };
    }
    return {
      id: base?.id,
      title: base?.title ?? 'ลงทะเบียนราคา fellow',
      description: base?.description ?? '',
      formType: base?.formType ?? formType,
      meetingId: meeting?.id || '',
      items,
      allowCoupon: base?.allowCoupon ?? true,
      isOpen: base?.isOpen ?? true,
      closeAt: toLocalInput(base?.closeAt ?? null),
      sponsorIds: base?.sponsors.map((s) => s.id) ?? [],
    };
  };

  const openEdit = (row: SpecialFormRow) => {
    setFormError('');
    setDraft(buildDraft({ meeting: meetings.find((m) => m.id === row.meetingId), formType: row.formType, base: row }));
  };

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    setFormError('');
    try {
      const body = {
        title: draft.title,
        description: draft.description,
        formType: draft.formType,
        meetingId: draft.meetingId,
        items: Object.values(draft.items)
          .filter((i) => i.enabled)
          .map((i) => ({
            activityId: i.activityId,
            label: i.label,
            onsiteMember: i.onsiteMember,
            onsiteNonMember: i.onsiteNonMember,
            online: i.online,
          })),
        allowCoupon: draft.allowCoupon,
        isOpen: draft.isOpen,
        closeAt: draft.closeAt ? new Date(draft.closeAt).toISOString() : null,
        sponsorIds: draft.sponsorIds,
      };
      const res = await fetch(draft.id ? `/api/admin/special-forms/${draft.id}` : '/api/admin/special-forms', {
        method: draft.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        setFormError(data.error || 'บันทึกไม่สำเร็จ');
        return;
      }
      toast(draft.id ? 'บันทึกการแก้ไขฟอร์มแล้ว' : 'สร้างฟอร์มแล้ว คัดลอกลิงก์ส่งให้บริษัทได้เลย');
      setDraft(null);
      load();
    } catch {
      setFormError('เชื่อมต่อระบบไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const toggleOpen = async (row: SpecialFormRow) => {
    const res = await fetch(`/api/admin/special-forms/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOpen: !row.isOpen }),
    });
    const data = await res.json();
    if (data.success) {
      toast(row.isOpen ? 'ปิดรับลงทะเบียนแล้ว' : 'เปิดรับลงทะเบียนแล้ว');
      load();
    }
  };

  const remove = async (row: SpecialFormRow) => {
    if (!confirm(`ลบฟอร์ม "${row.title}" ใช่หรือไม่`)) return;
    const res = await fetch(`/api/admin/special-forms/${row.id}`, { method: 'DELETE' });
    const data = await res.json();
    toast(data.success ? 'ลบฟอร์มแล้ว' : data.error || 'ลบไม่สำเร็จ');
    if (data.success) load();
  };

  const copyLink = async (row: SpecialFormRow) => {
    try {
      await navigator.clipboard.writeText(formUrl(row.slug));
      setCopied(row.id);
      toast('คัดลอกลิงก์ฟอร์มแล้ว');
      setTimeout(() => setCopied((c) => (c === row.id ? null : c)), 2000);
    } catch {
      toast('คัดลอกลิงก์ไม่สำเร็จ');
    }
  };

  const openRegister = async (row: SpecialFormRow) => {
    const res = await fetch(`/api/admin/special-forms/${row.id}`);
    const data = await res.json();
    if (!data.success) {
      toast(data.error || 'โหลดฟอร์มไม่สำเร็จ');
      return;
    }
    if (!data.companies?.length) {
      toast('ยังไม่ได้เลือกบริษัทที่มีสิทธิ์ในฟอร์มนี้');
      return;
    }
    setRegisterFor({
      form: {
        id: row.id,
        slug: row.slug,
        title: row.title,
        formType: row.formType,
        allowCoupon: row.allowCoupon,
        meeting: data.meeting,
      },
      companies: data.companies,
    });
  };

  return (
    <section className="space-y-3">
      <SectionTitle
        icon={Sparkles}
        tone="green"
        title="ฟอร์มเฉพาะราคาพิเศษ"
        count={forms?.length ?? 0}
        description="ตั้งรายการและราคาเอง เลือกบริษัทที่เข้าได้ แล้วส่งลิงก์ให้บริษัท"
        actions={
          <Btn variant="primary" icon={Plus} onClick={openCreate}>
            สร้างฟอร์มเฉพาะ
          </Btn>
        }
      />

      {forms === null ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#0026b3] animate-spin" />
        </div>
      ) : forms.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-2xl bg-white">
          <EmptyState
            icon={Sparkles}
            title="ยังไม่มีฟอร์มเฉพาะ"
            description="สร้างฟอร์มที่ตั้งราคาเองสำหรับบริษัทที่เลือก แล้วส่งลิงก์ให้บริษัทลงทะเบียน"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {forms.map((row) => (
            <div key={row.id} className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900">{row.title}</h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-lime-50 text-lime-800 border border-lime-200">
                      {FORM_TYPE_OPTIONS.find((t) => t.id === row.formType)?.label || row.formType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{row.meetingName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleOpen(row)}
                  className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer ${
                    row.isOpen ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                  title="กดเพื่อเปิดหรือปิดรับลงทะเบียน"
                >
                  {row.isOpen ? 'เปิดรับลงทะเบียน' : 'ปิดรับลงทะเบียน'}
                </button>
              </div>

              <ul className="text-xs border border-slate-100 rounded-xl divide-y divide-slate-100">
                {row.items.map((i) => (
                  <li key={i.activityId} className="px-3 py-1.5 flex flex-wrap justify-between gap-2">
                    <span className="font-bold text-slate-700">{i.label}</span>
                    <span className="text-slate-500">
                      สมาชิก ฿{i.onsiteMember.toLocaleString()} • บุคคลทั่วไป ฿{i.onsiteNonMember.toLocaleString()}
                      {i.online > 0 ? ` • ออนไลน์ ฿${i.online.toLocaleString()}` : ''}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-50 text-violet-800 border border-violet-200 font-bold">
                  <Building2 className="w-3 h-3" />
                  {row.sponsors.length} บริษัท
                </span>
                {row.sponsors.slice(0, 4).map((s) => (
                  <span key={s.id} className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
                    {s.name}
                  </span>
                ))}
                {row.sponsors.length > 4 && <span className="text-slate-400">และอีก {row.sponsors.length - 4} บริษัท</span>}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'รายการ', value: row.stats.slips },
                  { label: 'ผู้ลงทะเบียน', value: row.stats.attendees },
                  { label: 'ยอดรวม', value: `฿${row.stats.amount.toLocaleString()}` },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-100 py-2">
                    <div className="text-sm font-black text-slate-800">{s.value}</div>
                    <div className="text-[10px] font-bold text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 min-w-0">
                <span className="text-xs font-mono text-slate-600 truncate flex-1 min-w-0">/forms/{row.slug}</span>
                <button
                  type="button"
                  onClick={() => copyLink(row)}
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  {copied === row.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === row.id ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
                </button>
                <a
                  href={`/forms/${row.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  เปิด
                </a>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openRegister(row)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0026b3] hover:bg-[#001c8c] text-white text-xs font-bold cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  ลงทะเบียนแทนบริษัท
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('verify-slip')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  ตรวจรายการ{row.stats.pending > 0 ? ` ${row.stats.pending} รอตรวจ` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => remove(row)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold cursor-pointer ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {mounted && draft &&
        createPortal(
          <DraftModal
            draft={draft}
            setDraft={setDraft}
            meetings={meetings}
            sponsors={sponsors}
            saving={saving}
            error={formError}
            onSave={saveDraft}
            onRebuild={(meetingId, formType) =>
              setDraft((d) =>
                d ? { ...buildDraft({ meeting: meetings.find((m) => m.id === meetingId), formType }), id: d.id, title: d.title, description: d.description, sponsorIds: d.sponsorIds, allowCoupon: d.allowCoupon, isOpen: d.isOpen, closeAt: d.closeAt } : d
              )
            }
          />,
          document.body
        )}

      <AdminCompanyMemberModal
        isOpen={Boolean(registerFor)}
        onClose={() => setRegisterFor(null)}
        companies={registerFor?.companies || []}
        specialForm={registerFor?.form || null}
        onSuccess={(msg) => {
          toast(msg);
          load();
        }}
      />
    </section>
  );
}

function DraftModal({
  draft,
  setDraft,
  meetings,
  sponsors,
  saving,
  error,
  onSave,
  onRebuild,
}: {
  draft: DraftForm;
  setDraft: React.Dispatch<React.SetStateAction<DraftForm | null>>;
  meetings: MeetingItem[];
  sponsors: CompanyOption[];
  saving: boolean;
  error: string;
  onSave: () => void;
  onRebuild: (meetingId: string, formType: string) => void;
}) {
  const [sponsorQuery, setSponsorQuery] = useState('');
  const meeting = meetings.find((m) => m.id === draft.meetingId);
  const acts: any[] = meeting?.activities || [];
  const boundFellow = draft.formType === 'fellow' ? meetingFellowPrices(meeting) : null;
  const update = (patch: Partial<DraftForm>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const updateItem = (id: string, patch: Partial<FormItemInput & { enabled: boolean }>) =>
    setDraft((d) => (d ? { ...d, items: { ...d.items, [id]: { ...d.items[id], ...patch } } } : d));

  const filteredSponsors = useMemo(() => {
    const q = sponsorQuery.trim().toLowerCase();
    return sponsors
      .filter((s) => s.is_active || draft.sponsorIds.includes(s.id))
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.contact_email.toLowerCase().includes(q));
  }, [sponsors, sponsorQuery, draft.sponsorIds]);

  const toggleSponsor = (id: string) =>
    update({ sponsorIds: draft.sponsorIds.includes(id) ? draft.sponsorIds.filter((x) => x !== id) : [...draft.sponsorIds, id] });

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3]';
  const priceCls = 'w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm text-right focus:outline-none focus:border-[#0026b3]';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/50">
          <h3 className="font-black text-base text-slate-900">{draft.id ? 'แก้ไขฟอร์มเฉพาะ' : 'สร้างฟอร์มเฉพาะ'}</h3>
          <button type="button" onClick={() => setDraft(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* 1. ข้อมูลฟอร์ม */}
          <div className="space-y-3">
            <h4 className="text-sm font-extrabold text-slate-800">1. ข้อมูลฟอร์ม</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs font-bold text-slate-600">ชื่อฟอร์ม</span>
                <input className={inputCls} value={draft.title} onChange={(e) => update({ title: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold text-slate-600">ประเภทราคา</span>
                <select
                  className={inputCls}
                  value={draft.formType}
                  onChange={(e) => {
                    update({ formType: e.target.value });
                    if (!draft.id) onRebuild(draft.meetingId, e.target.value);
                  }}
                >
                  {FORM_TYPE_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold text-slate-600">งานประชุม</span>
                <select className={inputCls} value={draft.meetingId} onChange={(e) => onRebuild(e.target.value, draft.formType)}>
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.id}] {m.titleTh}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs font-bold text-slate-600">คำอธิบายในหน้าเข้าสู่ระบบ</span>
                <textarea rows={2} className={inputCls} value={draft.description} onChange={(e) => update({ description: e.target.value })} />
              </label>
            </div>
          </div>

          {/* 2. รายการและราคา */}
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-extrabold text-slate-800">2. รายการและราคา</h4>
              <p className="text-xs text-slate-500">
                เลือกกิจกรรมของงานประชุมที่จะเปิดในฟอร์ม ตั้งชื่อรายการและราคาเอง จำนวนที่นั่งใช้ตามกิจกรรมเดิม ออนไลน์ลงได้เฉพาะสมาชิก
              </p>
            </div>
            {acts.length === 0 ? (
              <p className="text-sm text-slate-500">งานประชุมนี้ยังไม่มีกิจกรรม</p>
            ) : (
              <div className="space-y-2">
                {acts.map((act) => {
                  const id = String(act.id);
                  const item = draft.items[id];
                  if (!item) return null;
                  const onlineCapable = isMain(act) && (act.format || 'both') !== 'onsite';
                  const bound = isMain(act) ? boundFellow : null;
                  const shown = bound ? { ...item, ...bound } : item;
                  return (
                    <div key={id} className={`rounded-xl border p-3 space-y-2 ${item.enabled ? 'border-[#0026b3]/40 bg-blue-50/30' : 'border-slate-200 bg-slate-50/50'}`}>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={item.enabled} onChange={(e) => updateItem(id, { enabled: e.target.checked })} />
                        <span className="text-sm font-bold text-slate-800">{act.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {isMain(act) ? 'การประชุมหลัก' : 'เวิร์กช็อป'}
                        </span>
                        {Number(act.maxSeats) > 0 && <span className="text-[11px] text-slate-500">{act.maxSeats} ที่นั่ง</span>}
                      </label>
                      {item.enabled && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <label className="space-y-1 col-span-2 sm:col-span-1">
                            <span className="text-[11px] font-bold text-slate-500">ชื่อรายการในฟอร์ม</span>
                            <input className={priceCls.replace('text-right', '')} value={item.label} onChange={(e) => updateItem(id, { label: e.target.value })} />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-500">สมาชิก ออนไซต์</span>
                            <input type="number" min={0} className={`${priceCls} disabled:bg-violet-50 disabled:text-violet-800`} value={shown.onsiteMember} disabled={!!bound} onChange={(e) => updateItem(id, { onsiteMember: Number(e.target.value) })} />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-500">บุคคลทั่วไป ออนไซต์</span>
                            <input type="number" min={0} className={`${priceCls} disabled:bg-violet-50 disabled:text-violet-800`} value={shown.onsiteNonMember} disabled={!!bound} onChange={(e) => updateItem(id, { onsiteNonMember: Number(e.target.value) })} />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-500">สมาชิก ออนไลน์</span>
                            <input
                              type="number"
                              min={0}
                              disabled={!onlineCapable || !!bound}
                              className={`${priceCls} disabled:bg-slate-100 disabled:text-slate-400`}
                              value={onlineCapable ? shown.online : 0}
                              onChange={(e) => updateItem(id, { online: Number(e.target.value) })}
                            />
                          </label>
                        </div>
                      )}
                      {item.enabled && bound && (
                        <p className="text-[11px] font-semibold text-violet-700">
                          ราคาการประชุมหลักผูกกับราคา Fellow ของการประชุมนี้ แก้ราคาได้ที่หน้าแก้ไขการประชุม
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. บริษัทที่มีสิทธิ์ */}
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-extrabold text-slate-800">3. บริษัทที่เข้าฟอร์มได้ ({draft.sponsorIds.length})</h4>
              <p className="text-xs text-slate-500">บริษัทต้องเข้าระบบด้วยอีเมลตัวแทนที่บันทึกไว้ บริษัทที่ไม่ได้เลือกจะเข้าฟอร์มไม่ได้</p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input className={`${inputCls} pl-9`} placeholder="ค้นหาชื่อบริษัทหรืออีเมล" value={sponsorQuery} onChange={(e) => setSponsorQuery(e.target.value)} />
            </div>
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {filteredSponsors.map((s) => (
                <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={draft.sponsorIds.includes(s.id)} onChange={() => toggleSponsor(s.id)} />
                  <span className="text-sm font-bold text-slate-800 flex-1 min-w-0 truncate">{s.name}</span>
                  <span className="text-xs text-slate-500 truncate">{s.contact_email}</span>
                </label>
              ))}
              {filteredSponsors.length === 0 && <p className="px-3 py-4 text-sm text-slate-500 text-center">ไม่พบบริษัท</p>}
            </div>
          </div>

          {/* 4. การตั้งค่า */}
          <div className="space-y-3">
            <h4 className="text-sm font-extrabold text-slate-800">4. การตั้งค่า</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 cursor-pointer">
                <input type="checkbox" checked={draft.isOpen} onChange={(e) => update({ isOpen: e.target.checked })} />
                <span className="text-sm font-bold text-slate-700">เปิดรับลงทะเบียน</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 cursor-pointer">
                <input type="checkbox" checked={draft.allowCoupon} onChange={(e) => update({ allowCoupon: e.target.checked })} />
                <span className="text-sm font-bold text-slate-700">ใช้คูปองสิทธิ์ฟรีของบริษัทได้</span>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold text-slate-600">ปิดรับอัตโนมัติ</span>
                <input type="datetime-local" className={inputCls} value={draft.closeAt} onChange={(e) => update({ closeAt: e.target.value })} />
              </label>
            </div>
            {draft.id && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                ราคาที่แก้ไขใช้กับการลงทะเบียนครั้งถัดไป รายการที่ลงทะเบียนไปแล้วคงราคาเดิม
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs font-bold text-rose-700 min-h-[1rem]">{error}</div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setDraft(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#0026b3] hover:bg-[#001c8c] text-white text-sm font-black disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'กำลังบันทึก...' : draft.id ? 'บันทึกการแก้ไข' : 'สร้างฟอร์ม'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
