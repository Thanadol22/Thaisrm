'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, CalendarDays, Check, Eye, FileText, Layers, Mail, ReceiptText, RefreshCw, Send } from 'lucide-react';
import { Btn, EmptyState, Field, FilterSelect, Panel, SearchSelect, Segmented, inputCls } from '@/components/admin/ui';
import { EmailPreviewModal } from '@/components/EmailPreviewModal';
import { ThaiDatePicker } from '@/components/ThaiDatePicker';

type Kind = 'history' | 'overdue';
type Scope = 'all' | 'bill' | 'meeting';

interface BillInfo {
  billNo: string;
  billDate: string;
  billType: string;
  billStatus: string;
  billStatusLabel: string;
  billAmount: number;
  isOutstanding: boolean;
  meetingId: string;
  meetingName: string;
  count: number;
}

interface SponsorInfo {
  id: string;
  name: string;
  tier: string;
  contactName: string | null;
  contactEmail: string;
  isActive: boolean;
  bills: BillInfo[];
}

/** ค่าของตัวเลือกบริษัทที่หมายถึงทุกบริษัทที่มียอดค้างชำระ */
const ALL_OVERDUE = '__all_overdue__';

const fmtMoney = (n: number) => `${n.toLocaleString('th-TH')} บาท`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });

export function SponsorHistoryEmailPanel({ notify }: { notify: (msg: string) => void }) {
  const [sponsors, setSponsors] = useState<SponsorInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<Kind>('history');
  const [sponsorId, setSponsorId] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [billNos, setBillNos] = useState<string[]>([]);
  const [selectedMeetingId, setMeetingId] = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [testRecipient, setTestRecipient] = useState('');
  const [busy, setBusy] = useState<'preview' | 'test' | 'send' | null>(null);
  const [lastResult, setLastResult] = useState<{ message: string; errors: string[] } | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/email/sponsor-history');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSponsors(json.data);
        setSponsorId((prev) => prev || json.data.find((s: SponsorInfo) => s.bills.length > 0)?.id || json.data[0]?.id || '');
      } else {
        notify(json.error || 'โหลดข้อมูลบริษัทไม่สำเร็จ');
      }
    } catch {
      notify('โหลดข้อมูลบริษัทไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overdueSponsors = useMemo(() => sponsors.filter((s) => s.bills.some((b) => b.isOutstanding)), [sponsors]);
  const isAllOverdue = sponsorId === ALL_OVERDUE;
  const sponsor = sponsors.find((s) => s.id === sponsorId) || null;

  // เปลี่ยนบริษัทหรือประเภทอีเมลแล้วล้างบิลที่เลือก
  // ทุกบริษัทที่ค้างชำระใช้ได้เฉพาะอีเมลแจ้งค้างชำระ และเลือกรายบิลไม่ได้
  const changeKind = (k: Kind) => {
    setKind(k);
    setBillNos([]);
    setLastResult(null);
    if (k === 'history' && isAllOverdue) setSponsorId(overdueSponsors[0]?.id || sponsors[0]?.id || '');
  };
  const changeSponsor = (id: string) => {
    setSponsorId(id);
    setBillNos([]);
    setLastResult(null);
    if (id === ALL_OVERDUE && scope === 'bill') setScope('all');
  };

  // บิลของบริษัทที่เลือก (หรือของทุกบริษัทที่ค้างชำระ)
  const sourceBills = useMemo(() => {
    const list = isAllOverdue ? overdueSponsors.flatMap((s) => s.bills) : sponsor?.bills || [];
    return kind === 'overdue' ? list.filter((b) => b.isOutstanding) : list;
  }, [isAllOverdue, overdueSponsors, sponsor, kind]);

  const meetingOptions = useMemo(() => {
    const map = new Map<string, string>();
    sourceBills.forEach((b) => map.set(b.meetingId, b.meetingName));
    return [...map].map(([value, label]) => ({ value, label }));
  }, [sourceBills]);

  // รอบประชุมที่เลือกไม่อยู่ในรายการแล้ว ให้ใช้รอบแรก
  const meetingId = meetingOptions.some((m) => m.value === selectedMeetingId) ? selectedMeetingId : meetingOptions[0]?.value || '';

  const includedBills = useMemo(() => {
    if (scope === 'bill') return sourceBills.filter((b) => billNos.includes(b.billNo));
    if (scope === 'meeting') return sourceBills.filter((b) => b.meetingId === meetingId);
    return sourceBills;
  }, [sourceBills, scope, billNos, meetingId]);

  const totals = useMemo(
    () => ({
      people: includedBills.reduce((s, b) => s + b.count, 0),
      amount: includedBills.reduce((s, b) => s + b.billAmount, 0),
      outstanding: includedBills.filter((b) => b.isOutstanding).reduce((s, b) => s + b.billAmount, 0),
    }),
    [includedBills]
  );

  const targetSponsors = isAllOverdue ? overdueSponsors : sponsor ? [sponsor] : [];
  // บริษัทที่มีบิลตามตัวกรองจริง (บริษัทที่ไม่มีบิลในรอบประชุมที่เลือกจะถูกข้าม)
  const receivingCount = targetSponsors.filter((sp) => sp.bills.some((b) => includedBills.includes(b))).length;

  const toggleBill = (no: string) =>
    setBillNos((prev) => (prev.includes(no) ? prev.filter((x) => x !== no) : [...prev, no]));

  const submit = async (mode: 'preview' | 'test' | 'send') => {
    if (targetSponsors.length === 0) return notify('กรุณาเลือกบริษัท');
    if (includedBills.length === 0) return notify(scope === 'bill' ? 'กรุณาเลือกบิลอย่างน้อย 1 บิล' : 'ไม่มีบิลตามเงื่อนไขที่เลือก');
    if (mode === 'test' && !testRecipient.includes('@')) return notify('กรุณาระบุอีเมลสำหรับรับข้อความทดสอบ');
    if (mode === 'send') {
      const who = isAllOverdue
        ? `บริษัทที่มียอดค้างชำระ ${receivingCount} บริษัท`
        : `${sponsor?.name} (${sponsor?.contactEmail})`;
      const what = kind === 'overdue' ? 'อีเมลแจ้งเตือนค้างชำระ' : 'อีเมลประวัติการลงทะเบียน';
      if (!window.confirm(`ยืนยันการส่ง${what}ถึง ${who}?`)) return;
    }

    try {
      setBusy(mode);
      const res = await fetch('/api/email/sponsor-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          kind,
          scope,
          sponsorIds: targetSponsors.map((s) => s.id),
          billNos,
          meetingId,
          extraNote,
          dueDate: kind === 'overdue' ? dueDate : '',
          testRecipient,
        }),
      });
      const json = await res.json();
      if (!json.success) return notify(`ข้อผิดพลาด: ${json.error || 'ดำเนินการไม่สำเร็จ'}`);
      if (mode === 'preview') {
        setPreview({ subject: json.data.subject, html: json.data.html });
        return;
      }
      notify(json.message || 'ส่งอีเมลเรียบร้อย');
      if (mode === 'send') setLastResult({ message: json.message, errors: json.data?.errors || [] });
    } catch (err: any) {
      notify(`เกิดข้อผิดพลาด: ${err?.message || 'Server error'}`);
    } finally {
      setBusy(null);
    }
  };

  const companyOptions = [
    ...(kind === 'overdue' && overdueSponsors.length > 0
      ? [{ value: ALL_OVERDUE, label: `ทุกบริษัทที่มียอดค้างชำระ (${overdueSponsors.length} บริษัท)` }]
      : []),
    ...sponsors.map((s) => {
      const outstanding = s.bills.filter((b) => b.isOutstanding).length;
      const suffix = kind === 'overdue' ? (outstanding ? ` · ค้างชำระ ${outstanding} บิล` : ' · ไม่มียอดค้าง') : ` · ${s.bills.length} บิล`;
      return { value: s.id, label: `${s.name}${suffix}` };
    }),
  ];

  if (!loading && sponsors.length === 0) {
    return (
      <Panel>
        <EmptyState icon={Building2} title="ยังไม่มีบริษัทในระบบ" description="เพิ่มบริษัทได้ที่เมนูบริษัทสปอนเซอร์" />
      </Panel>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Panel
        className="lg:col-span-2"
        icon={kind === 'overdue' ? AlertCircle : ReceiptText}
        tone={kind === 'overdue' ? 'amber' : 'blue'}
        title="ส่งประวัติการลงทะเบียนให้บริษัท"
        description="สรุปบิลและรายชื่อผู้เข้าร่วมส่งถึงอีเมลผู้ติดต่อของบริษัท พร้อมแจ้งเตือนยอดค้างชำระ"
        actions={
          <Btn size="sm" variant="ghost" icon={RefreshCw} loading={loading} onClick={load}>
            โหลดใหม่
          </Btn>
        }
      >
        <div className="space-y-5">
          <Segmented<Kind>
            value={kind}
            onChange={changeKind}
            options={[
              { id: 'history', label: 'ประวัติการลงทะเบียน', icon: FileText },
              { id: 'overdue', label: 'แจ้งเตือนค้างชำระ', icon: AlertCircle, count: overdueSponsors.length },
            ]}
          />

          <Field label="บริษัท" hint={!isAllOverdue && sponsor ? `ส่งถึง ${sponsor.contactName ? `${sponsor.contactName} · ` : ''}${sponsor.contactEmail}` : isAllOverdue ? 'ส่งแยกถึงอีเมลผู้ติดต่อของแต่ละบริษัท' : undefined}>
            <SearchSelect value={sponsorId} onChange={changeSponsor} options={companyOptions} icon={Building2} label="บริษัท" placeholder="ค้นหาชื่อบริษัท..." />
          </Field>

          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-700">ขอบเขตข้อมูล</span>
            <Segmented<Scope>
              value={scope}
              onChange={setScope}
              options={[
                { id: 'all', label: 'รวมทุกบิล', icon: Layers },
                ...(isAllOverdue ? [] : [{ id: 'bill' as Scope, label: 'แยกตามบิล', icon: ReceiptText, count: billNos.length || undefined }]),
                { id: 'meeting', label: 'แยกตามรอบประชุม', icon: CalendarDays },
              ]}
            />
          </div>

          {scope === 'meeting' && (
            meetingOptions.length > 0 ? (
              <FilterSelect value={meetingId} onChange={setMeetingId} options={meetingOptions} icon={CalendarDays} label="รอบประชุม" />
            ) : (
              <p className="text-xs text-slate-500">ไม่มีรอบประชุมที่มีบิลตามเงื่อนไข</p>
            )
          )}

          {scope === 'bill' && (
            sourceBills.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {sourceBills.map((b) => {
                  const checked = billNos.includes(b.billNo);
                  return (
                    <button
                      key={b.billNo}
                      type="button"
                      onClick={() => toggleBill(b.billNo)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                        checked ? 'border-[#0026b3] bg-blue-50/60 ring-1 ring-[#0026b3]' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`mt-0.5 w-4 h-4 rounded-md shrink-0 flex items-center justify-center ${checked ? 'bg-[#0026b3] text-white' : 'border-2 border-slate-300'}`}>
                        {checked && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-black text-slate-900">{b.billNo}</span>
                          <span className="text-sm font-black text-slate-900 tabular-nums">{fmtMoney(b.billAmount)}</span>
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5">
                          {fmtDate(b.billDate)} · {b.meetingName} · {b.count} ท่าน
                        </span>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${b.isOutstanding ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                          {b.billStatusLabel}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500">{kind === 'overdue' ? 'บริษัทนี้ไม่มีบิลค้างชำระ' : 'บริษัทนี้ยังไม่มีบิล'}</p>
            )
          )}

          {kind === 'overdue' && (
            <Field label="กำหนดชำระภายในวันที่" hint="เว้นว่างได้ ถ้าไม่ต้องการระบุวันครบกำหนด">
              <ThaiDatePicker value={dueDate} onChange={setDueDate} outputFormat="iso" placeholder="เลือกวันครบกำหนดชำระ" />
            </Field>
          )}

          <Field label="ข้อความเพิ่มเติมในอีเมล">
            <textarea
              value={extraNote}
              onChange={(e) => setExtraNote(e.target.value)}
              rows={3}
              placeholder={kind === 'overdue' ? 'เช่น หากมีข้อสงสัยเรื่องยอดชำระ ติดต่อฝ่ายการเงินของสมาคม' : 'เช่น ขอบคุณที่ส่งบุคลากรเข้าร่วมประชุม'}
              className={inputCls}
            />
          </Field>

          {lastResult && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
              <div className="font-black">{lastResult.message}</div>
              {lastResult.errors.map((e) => (
                <div key={e} className="text-rose-600 font-bold">{e}</div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-end gap-2">
            <Btn icon={Eye} loading={busy === 'preview'} disabled={!!busy} onClick={() => submit('preview')}>
              ดูตัวอย่าง
            </Btn>
            <Btn variant="primary" icon={Send} loading={busy === 'send'} disabled={!!busy} onClick={() => submit('send')}>
              {isAllOverdue ? `ส่งถึง ${receivingCount} บริษัท` : 'ส่งอีเมล'}
            </Btn>
          </div>
        </div>
      </Panel>

      <div className="space-y-6">
        <Panel icon={Layers} title="สรุปรายการที่จะส่ง" tone="slate">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50">
              <dt className="text-slate-500 font-bold">บริษัท</dt>
              <dd className="text-lg font-black text-slate-900 tabular-nums">{receivingCount}</dd>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <dt className="text-slate-500 font-bold">บิล</dt>
              <dd className="text-lg font-black text-slate-900 tabular-nums">{includedBills.length}</dd>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <dt className="text-slate-500 font-bold">ผู้เข้าร่วม</dt>
              <dd className="text-lg font-black text-slate-900 tabular-nums">{totals.people.toLocaleString('th-TH')}</dd>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <dt className="text-slate-500 font-bold">{kind === 'overdue' ? 'ยอดค้างชำระ' : 'ยอดรวม'}</dt>
              <dd className={`text-lg font-black tabular-nums ${kind === 'overdue' ? 'text-orange-700' : 'text-[#0026b3]'}`}>
                {(kind === 'overdue' ? totals.outstanding : totals.amount).toLocaleString('th-TH')}
              </dd>
            </div>
          </dl>
          {kind === 'history' && totals.outstanding > 0 && (
            <p className="mt-3 text-xs font-bold text-orange-700">ในจำนวนนี้มียอดรอชำระ {fmtMoney(totals.outstanding)}</p>
          )}
        </Panel>

        <Panel icon={Mail} title="ทดสอบส่ง" tone="slate" description="ส่งตัวอย่างของบริษัทแรกไปยังอีเมลที่ระบุ">
          <div className="space-y-2">
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="admin@example.com"
              className={inputCls}
            />
            <Btn className="w-full" icon={Send} loading={busy === 'test'} disabled={!!busy} onClick={() => submit('test')}>
              ส่งอีเมลทดสอบ
            </Btn>
          </div>
        </Panel>
      </div>

      <EmailPreviewModal
        isOpen={!!preview}
        onClose={() => setPreview(null)}
        subject={preview?.subject || ''}
        htmlContent={preview?.html || ''}
      />
    </div>
  );
}
