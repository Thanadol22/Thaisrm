'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CalendarDays, FileSpreadsheet, Filter, RotateCw, Users } from 'lucide-react';
import { Btn, EmptyState, FilterSelect, IconBtn, SearchInput, Toolbar, ToolbarGroup } from '@/components/admin/ui';
import { statusLabelTh } from '@/lib/statusLabels';

interface RegistrationRow {
  key: string;
  billNo: string;
  slipId: string | null;
  billDate: string;
  billAmount: number;
  billCount: number;
  billStatus: string;
  billStatusLabel: string;
  billType: string;
  company: string;
  couponCode: string | null;
  meetingId: string;
  meetingName: string;
  seq: number;
  memberNo: string;
  name: string;
  email: string;
  phone: string;
  programs: string;
  format: string;
  isAddOn: boolean;
  isFellow: boolean;
  discount: number;
  netPrice: number;
  attendanceStatus: string | null;
}

const STATUS_TONE: Record<string, string> = {
  paid: 'text-emerald-700 bg-emerald-50',
  free: 'text-emerald-700 bg-emerald-50',
  quota: 'text-blue-700 bg-blue-50',
  review: 'text-amber-700 bg-amber-50',
  awaiting: 'text-orange-700 bg-orange-50',
  pending: 'text-slate-600 bg-slate-100',
  rejected: 'text-rose-700 bg-rose-50',
};

const fmtMoney = (n: number) => n.toLocaleString('th-TH');
const fmtDate = (d: string) =>
  new Date(d).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });

// คอลัมน์ระดับบิล (รวมเซลล์ตามจำนวนผู้เข้าร่วมในบิล)
const BILL_COLS = ['เลขที่บิล', 'วันที่', 'บริษัท', 'งานประชุม', 'ประเภท', 'คูปอง', 'ยอดบิล', 'สถานะบิล'];
const PERSON_COLS = ['ลำดับ', 'เลขสมาชิก', 'ชื่อ-นามสกุล', 'อีเมล', 'โทรศัพท์', 'หลักสูตร', 'รูปแบบ', 'ส่วนลด', 'ยอดสุทธิ', 'สถานะเข้างาน'];

const th = 'sticky top-0 z-10 bg-slate-100 border border-slate-300 px-2 py-1.5 text-[11px] font-bold text-slate-600 whitespace-nowrap text-left';
const td = 'border border-slate-200 px-2 py-1 align-top whitespace-nowrap';

const TIER_WEIGHT: Record<string, number> = { Platinum: 1, Gold: 2, Silver: 3 };

/** sponsors: รายชื่อบริษัทตามลำดับในหน้าบริษัท ใช้เรียงตัวเลือกบริษัทตามเทียร์แล้วตามลำดับบริษัท */
export default function SponsorRegistrationsSheet({ sponsors = [] }: { sponsors?: { name: string; tier: string }[] }) {
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [company, setCompany] = useState('all');
  const [meeting, setMeeting] = useState('all');
  const [status, setStatus] = useState('all');

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sponsors/registrations');
      const json = await res.json();
      setRows(json.success && Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      console.error('Failed to load sponsor registrations:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const companyOptions = useMemo(() => {
    const order = new Map<string, { tier: number; index: number }>();
    sponsors.forEach((sp, index) => order.set(sp.name.toLowerCase().trim(), { tier: TIER_WEIGHT[sp.tier] ?? 4, index }));
    const rank = (name: string) => order.get(name.toLowerCase().trim()) ?? { tier: 4, index: 999 };
    return [...new Set(rows.map((r) => r.company))].sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      return ra.tier - rb.tier || ra.index - rb.index || a.localeCompare(b, 'th');
    });
  }, [rows, sponsors]);

  // เริ่มต้นที่บริษัทแรกตามลำดับเทียร์ (ยังเลือกทุกบริษัทได้จากตัวเลือก)
  const [companyInitialized, setCompanyInitialized] = useState(false);
  useEffect(() => {
    if (companyInitialized || companyOptions.length === 0 || sponsors.length === 0) return;
    setCompany(companyOptions[0]);
    setCompanyInitialized(true);
  }, [companyInitialized, companyOptions, sponsors.length]);
  const meetingOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.meetingId, r.meetingName));
    return [...map.entries()];
  }, [rows]);
  const statusOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.billStatus, r.billStatusLabel.startsWith('ฟรี') ? 'ฟรี' : r.billStatusLabel));
    return [...map.entries()];
  }, [rows]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (company !== 'all' && r.company !== company) return false;
      if (meeting !== 'all' && r.meetingId !== meeting) return false;
      if (status !== 'all' && r.billStatus !== status) return false;
      if (!s) return true;
      return [r.billNo, r.company, r.memberNo, r.name, r.email, r.phone, r.couponCode, r.meetingName]
        .some((v) => v && v.toLowerCase().includes(s));
    });
  }, [rows, search, company, meeting, status]);

  // จำนวนแถวที่ต่อเนื่องของบิลเดียวกัน สำหรับรวมเซลล์คอลัมน์ระดับบิล
  const spans = useMemo(() => {
    const result: number[] = new Array(filtered.length).fill(0);
    for (let i = 0; i < filtered.length; ) {
      let j = i + 1;
      while (j < filtered.length && filtered[j].billNo === filtered[i].billNo) j++;
      result[i] = j - i;
      i = j;
    }
    return result;
  }, [filtered]);

  const totals = useMemo(() => {
    const bills = new Map<string, number>();
    let net = 0;
    let discount = 0;
    filtered.forEach((r) => {
      bills.set(r.billNo, r.billAmount);
      net += r.netPrice;
      discount += r.discount;
    });
    return {
      bills: bills.size,
      billAmount: [...bills.values()].reduce((a, b) => a + b, 0),
      net,
      discount,
      companies: new Set(filtered.map((r) => r.company)).size,
    };
  }, [filtered]);

  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const data = filtered.map((r) => [
      r.billNo,
      fmtDate(r.billDate),
      r.company,
      r.meetingName,
      r.billType,
      r.couponCode || '',
      r.billAmount,
      r.billStatusLabel,
      r.seq,
      r.memberNo,
      r.name,
      r.email,
      r.phone,
      r.isFellow ? `${r.programs} - ราคา fellow` : r.programs,
      r.format,
      r.discount,
      r.netPrice,
      r.attendanceStatus ? statusLabelTh(r.attendanceStatus) : '',
    ]);
    const sheet = XLSX.utils.aoa_to_sheet([[...BILL_COLS, ...PERSON_COLS], ...data]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'ประวัติลงทะเบียนบริษัท');
    XLSX.writeFile(book, `sponsor-registrations-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ค้นหาเลขที่บิล, บริษัท, ชื่อ, เลขสมาชิก หรืออีเมล..."
        />
        <ToolbarGroup>
          <FilterSelect
            value={company}
            onChange={setCompany}
            icon={Building2}
            label="บริษัท"
            className="min-w-[160px]"
            options={[{ value: 'all', label: 'ทุกบริษัท' }, ...companyOptions.map((c) => ({ value: c, label: c }))]}
          />
          <FilterSelect
            value={meeting}
            onChange={setMeeting}
            icon={CalendarDays}
            label="งานประชุม"
            className="min-w-[160px]"
            options={[{ value: 'all', label: 'ทุกงานประชุม' }, ...meetingOptions.map(([id, name]) => ({ value: id, label: name }))]}
          />
          <FilterSelect
            value={status}
            onChange={setStatus}
            icon={Filter}
            label="สถานะบิล"
            className="min-w-[150px]"
            options={[{ value: 'all', label: 'ทุกสถานะ' }, ...statusOptions.map(([k, l]) => ({ value: k, label: l }))]}
          />
          <Btn icon={FileSpreadsheet} variant="secondary" onClick={handleExport} disabled={filtered.length === 0}>
            ส่งออก Excel
          </Btn>
          <IconBtn
            icon={RotateCw}
            label="รีเฟรชข้อมูล"
            tone="blue"
            onClick={fetchRows}
            className={`w-10 h-10 rounded-xl ${loading ? '[&_svg]:animate-spin' : ''}`}
          />
        </ToolbarGroup>
      </Toolbar>

      <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs">
        {/* แถบสรุปแบบแถบสถานะของสเปรดชีต */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 bg-slate-50 border-b border-slate-300 text-[11px] text-slate-600 font-semibold">
          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            ประวัติการลงทะเบียนของบริษัท
          </span>
          <span>{totals.bills.toLocaleString('th-TH')} บิล</span>
          <span>{filtered.length.toLocaleString('th-TH')} ท่าน</span>
          <span>{totals.companies.toLocaleString('th-TH')} บริษัท</span>
          <span className="sm:ml-auto">ยอดบิลรวม {fmtMoney(totals.billAmount)} บาท</span>
        </div>

        {loading && rows.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2.5">
            <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>กำลังโหลดประวัติการลงทะเบียน...</span>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="ไม่พบประวัติการลงทะเบียนตามเงื่อนไขที่ค้นหา" />
        ) : (
          <div className="overflow-auto max-h-[70vh]">
            <table className="border-collapse text-[12px] text-slate-800 min-w-full">
              <thead>
                <tr>
                  <th className={`${th} left-0 z-20 w-10 text-center bg-slate-200`}></th>
                  {BILL_COLS.map((c) => (
                    <th key={c} className={`${th} ${c === 'ยอดบิล' ? 'text-right' : ''}`}>{c}</th>
                  ))}
                  {PERSON_COLS.map((c) => (
                    <th key={c} className={`${th} ${c === 'ส่วนลด' || c === 'ยอดสุทธิ' ? 'text-right' : ''} ${c === 'ลำดับ' ? 'text-center' : ''}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const span = spans[i];
                  const isBillStart = span > 0;
                  const billBg = isBillStart ? 'bg-white' : '';
                  return (
                    <tr key={r.key} className={`hover:bg-blue-50/60 ${isBillStart && i > 0 ? 'border-t-2 border-t-slate-300' : ''}`}>
                      <td className="sticky left-0 bg-slate-100 border border-slate-300 px-2 py-1 text-center text-[10px] font-semibold text-slate-400 tabular-nums">
                        {i + 1}
                      </td>
                      {isBillStart && (
                        <>
                          <td rowSpan={span} className={`${td} ${billBg} font-mono font-bold text-[#0026b3]`}>{r.billNo}</td>
                          <td rowSpan={span} className={`${td} ${billBg} text-slate-600 tabular-nums`}>{fmtDate(r.billDate)}</td>
                          <td rowSpan={span} className={`${td} ${billBg} font-semibold max-w-[220px] truncate`} title={r.company}>{r.company}</td>
                          <td rowSpan={span} className={`${td} ${billBg} max-w-[200px] truncate`} title={r.meetingName}>{r.meetingName}</td>
                          <td rowSpan={span} className={`${td} ${billBg}`}>{r.billType}</td>
                          <td rowSpan={span} className={`${td} ${billBg} font-mono text-purple-700`}>{r.couponCode || '-'}</td>
                          <td rowSpan={span} className={`${td} ${billBg} text-right font-bold tabular-nums`}>{fmtMoney(r.billAmount)}</td>
                          <td rowSpan={span} className={`${td} ${billBg}`}>
                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${STATUS_TONE[r.billStatus] || STATUS_TONE.pending}`}>
                              {r.billStatusLabel}
                            </span>
                          </td>
                        </>
                      )}
                      <td className={`${td} text-center tabular-nums text-slate-500`}>{r.seq}</td>
                      <td className={`${td} font-mono font-bold text-blue-600`}>{r.memberNo || '-'}</td>
                      <td className={`${td} font-semibold`}>
                        {r.name}
                        {r.isAddOn && <span className="ml-1.5 text-[10px] font-bold text-amber-700">ลงเพิ่ม</span>}
                      </td>
                      <td className={`${td} text-slate-600`}>{r.email || '-'}</td>
                      <td className={`${td} text-slate-600 tabular-nums`}>{r.phone || '-'}</td>
                      <td className={`${td} min-w-[220px] max-w-[320px] whitespace-normal`} title={r.isFellow ? `${r.programs} - ราคา fellow` : r.programs}>
                        {r.isFellow && (
                          <span className="mr-1.5 inline-block px-1.5 py-px rounded bg-lime-50 text-lime-800 border border-lime-200 text-[10px] font-bold align-middle">
                            ราคา fellow
                          </span>
                        )}
                        {r.programs || '-'}
                      </td>
                      <td className={td}>{r.format || '-'}</td>
                      <td className={`${td} text-right tabular-nums text-slate-600`}>{r.discount ? fmtMoney(r.discount) : '-'}</td>
                      <td className={`${td} text-right tabular-nums font-semibold`}>{fmtMoney(r.netPrice)}</td>
                      <td className={td}>{r.attendanceStatus ? statusLabelTh(r.attendanceStatus) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-700">
                  <td className="sticky left-0 bg-slate-200 border border-slate-300 px-2 py-1.5"></td>
                  <td colSpan={6} className="border border-slate-300 px-2 py-1.5">
                    รวม {totals.bills.toLocaleString('th-TH')} บิล
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">{fmtMoney(totals.billAmount)}</td>
                  <td colSpan={8} className="border border-slate-300 px-2 py-1.5">
                    {filtered.length.toLocaleString('th-TH')} ท่าน
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">{fmtMoney(totals.discount)}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">{fmtMoney(totals.net)}</td>
                  <td className="border border-slate-300 px-2 py-1.5"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
