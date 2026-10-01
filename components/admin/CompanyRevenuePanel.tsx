'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, Building2, CalendarDays, CheckCircle2, Clock, Receipt, RotateCw } from 'lucide-react';
import { AdminPageHeader, HeaderButton } from '@/components/admin/AdminPageHeader';
import { EmptyState, FilterSelect, StatCard, StatGrid, Toolbar, ToolbarGroup, SearchInput } from '@/components/admin/ui';
import type { CompanyRevenue, CompanyRevenueItem } from '@/lib/services/companyRevenueService';

type Money = { received: number; payLater: number; review: number; total: number };

interface ItemRow extends Money {
  key: string;
  name: string;
  meetingName: string;
  kind: CompanyRevenueItem['kind'];
  people: number;
}

interface CompanyRow extends Money {
  id: string;
  name: string;
  tier: string | null;
  bills: number;
  people: number;
  meetingCount: number;
  items: ItemRow[];
}

const KIND_LABEL: Record<CompanyRevenueItem['kind'], string> = {
  main: 'Main Program',
  workshop: 'Workshop',
  membership: 'สมาชิก',
  format_change: 'ค่าธรรมเนียม',
  backdated: 'ลงบิลย้อนหลัง',
  adjustment: 'ส่วนต่าง',
  unassigned: 'ไม่ระบุ',
  quota: 'โควต้า',
};

const KIND_TONE: Record<CompanyRevenueItem['kind'], string> = {
  main: 'bg-blue-100 text-[#0026b3]',
  workshop: 'bg-emerald-100 text-emerald-800',
  membership: 'bg-violet-100 text-violet-800',
  format_change: 'bg-slate-100 text-slate-600',
  backdated: 'bg-slate-100 text-slate-600',
  adjustment: 'bg-amber-100 text-amber-800',
  unassigned: 'bg-slate-100 text-slate-600',
  quota: 'bg-sky-100 text-sky-800',
};

const baht = (n: number) => `฿${n.toLocaleString('th-TH')}`;
const zero = (): Money => ({ received: 0, payLater: 0, review: 0, total: 0 });
const add = (a: Money, b: Money) => {
  a.received += b.received;
  a.payLater += b.payLater;
  a.review += b.review;
  a.total += b.total;
};

function MoneyCell({ value, tone }: { value: number; tone: 'received' | 'payLater' | 'review' | 'total' }) {
  if (value === 0) return <span className="text-slate-300">-</span>;
  const cls =
    tone === 'payLater' ? 'text-rose-700' : tone === 'review' ? 'text-amber-700' : tone === 'total' ? 'text-slate-900 font-black' : 'text-emerald-700';
  return <span className={`tabular-nums font-bold ${cls}`}>{baht(value)}</span>;
}

export function CompanyRevenuePanel() {
  const [data, setData] = useState<CompanyRevenue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meetingId, setMeetingId] = useState('all');
  const [companyId, setCompanyId] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/sponsors/revenue');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setData(json.data);
      else setError(json.error || 'โหลดข้อมูลไม่สำเร็จ');
    } catch {
      setError('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const meetingOptions = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((c) => c.meetings.forEach((m) => map.set(m.meetingId, m.meetingName)));
    return [...map].map(([value, label]) => ({ value, label }));
  }, [data]);

  const rows = useMemo<CompanyRow[]>(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((c) => (companyId === 'all' || c.id === companyId) && (!q || c.name.toLowerCase().includes(q)))
      .map((c) => {
        const meetings = c.meetings.filter((m) => meetingId === 'all' || m.meetingId === meetingId);
        const row: CompanyRow = { id: c.id, name: c.name, tier: c.tier, bills: 0, people: 0, meetingCount: meetings.length, items: [], ...zero() };
        meetings.forEach((m) => {
          row.bills += m.bills;
          row.people += m.people;
          add(row, m);
          m.items.forEach((i) => row.items.push({ ...i, key: `${m.meetingId}_${i.key}`, meetingName: m.meetingName }));
        });
        return row;
      })
      .filter((r) => r.meetingCount > 0);
  }, [data, meetingId, companyId, search]);

  const totals = useMemo(() => {
    const t = { ...zero(), bills: 0, people: 0 };
    rows.forEach((r) => {
      add(t, r);
      t.bills += r.bills;
      t.people += r.people;
    });
    return t;
  }, [rows]);

  const showMeetingName = meetingId === 'all' && meetingOptions.length > 1;
  const th = 'py-2.5 px-3 text-[11px] font-bold text-slate-500 whitespace-nowrap';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <AdminPageHeader
        tab="company-revenue"
        description="ยอดเงินของแต่ละบริษัท แยกตามรอบประชุมและรายการที่ลงทะเบียน พร้อมยอดชำระภายหลัง"
        actions={
          <HeaderButton icon={RotateCw} onClick={load} disabled={loading} title="รีเฟรชข้อมูล">
            รีเฟรช
          </HeaderButton>
        }
      />

      <StatGrid cols={4}>
        <StatCard label="ยอดรวมทั้งหมด" value={baht(totals.total)} hint={`${rows.length} บริษัท · ${totals.bills} บิล · ${totals.people} คน`} icon={Banknote} tone="blue" active />
        <StatCard label="รับเงินแล้ว" value={baht(totals.received)} hint="อนุมัติและมีสลิปโอนแล้ว" icon={CheckCircle2} tone="green" />
        <StatCard label="ชำระภายหลัง" value={baht(totals.payLater)} hint="ยังไม่แนบสลิป" icon={Receipt} tone="rose" />
        <StatCard label="รอตรวจหรือรออนุมัติ" value={baht(totals.review)} hint="แนบสลิปแล้วรอตรวจ" icon={Clock} tone="amber" />
      </StatGrid>

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาชื่อบริษัท..." />
        <ToolbarGroup>
          <FilterSelect
            value={meetingId}
            onChange={setMeetingId}
            icon={CalendarDays}
            label="รอบประชุม"
            className="w-full sm:w-64"
            options={[{ value: 'all', label: 'ทุกรอบประชุม' }, ...meetingOptions]}
          />
          <FilterSelect
            value={companyId}
            onChange={setCompanyId}
            icon={Building2}
            label="บริษัท"
            className="w-full sm:w-64"
            options={[{ value: 'all', label: 'ทุกบริษัท' }, ...data.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </ToolbarGroup>
      </Toolbar>

      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {error ? (
          <EmptyState icon={Building2} title="โหลดข้อมูลไม่สำเร็จ" description={error} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Building2} title={loading ? 'กำลังคำนวณยอด...' : 'ไม่พบยอดของบริษัทตามตัวกรอง'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className={th}>บริษัท / รายการที่ลงทะเบียน</th>
                  <th className={`${th} text-center`}>ผู้ลงทะเบียน</th>
                  <th className={`${th} text-right`}>รับเงินแล้ว</th>
                  <th className={`${th} text-right`}>ชำระภายหลัง</th>
                  <th className={`${th} text-right`}>รอตรวจ</th>
                  <th className={`${th} text-right`}>ยอดรวม</th>
                </tr>
              </thead>
              {rows.map((r) => (
                <tbody key={r.id} className="border-b border-slate-200">
                  <tr className="bg-slate-50/70">
                    <td className="py-3 px-3">
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#0026b3] shrink-0" />
                        {r.name}
                        {r.tier && <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{r.tier}</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 pl-6">
                        {r.bills} บิล{meetingId === 'all' ? ` · ${r.meetingCount} รอบประชุม` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900 tabular-nums">{r.people} คน</td>
                    <td className="py-3 px-3 text-right"><MoneyCell value={r.received} tone="received" /></td>
                    <td className="py-3 px-3 text-right"><MoneyCell value={r.payLater} tone="payLater" /></td>
                    <td className="py-3 px-3 text-right"><MoneyCell value={r.review} tone="review" /></td>
                    <td className="py-3 px-3 text-right"><MoneyCell value={r.total} tone="total" /></td>
                  </tr>
                  {r.items.map((i) => (
                    <tr key={i.key} className="hover:bg-blue-50/30">
                      <td className="py-2 px-3 pl-9">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${KIND_TONE[i.kind]}`}>{KIND_LABEL[i.kind]}</span>
                          <span className="font-semibold text-slate-800">{i.name}</span>
                        </div>
                        {showMeetingName && <div className="text-[11px] text-slate-400 mt-0.5">{i.meetingName}</div>}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-600 tabular-nums">{i.people} คน</td>
                      <td className="py-2 px-3 text-right"><MoneyCell value={i.received} tone="received" /></td>
                      <td className="py-2 px-3 text-right"><MoneyCell value={i.payLater} tone="payLater" /></td>
                      <td className="py-2 px-3 text-right"><MoneyCell value={i.review} tone="review" /></td>
                      <td className="py-2 px-3 text-right text-slate-700 tabular-nums">{i.total ? baht(i.total) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
              <tfoot>
                <tr className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-t-2 border-[#0026b3]/30 font-black">
                  <td className="py-3.5 px-3 text-slate-900">รวมทุกบริษัท ({rows.length} บริษัท)</td>
                  <td className="py-3.5 px-3 text-center text-slate-900 tabular-nums">{totals.people} คน</td>
                  <td className="py-3.5 px-3 text-right"><MoneyCell value={totals.received} tone="received" /></td>
                  <td className="py-3.5 px-3 text-right"><MoneyCell value={totals.payLater} tone="payLater" /></td>
                  <td className="py-3.5 px-3 text-right"><MoneyCell value={totals.review} tone="review" /></td>
                  <td className="py-3.5 px-3 text-right text-base text-[#0026b3] tabular-nums">{baht(totals.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
      <p className="text-[11px] text-slate-500">
        บิลกลุ่มที่ไม่ได้บันทึกราคารายคน ระบบแบ่งยอดบิลจริงลงแต่ละรายการตามสัดส่วนราคาตั้ง ยอดรวมของบริษัทตรงกับยอดบิลทุกบาท
      </p>
    </div>
  );
}
