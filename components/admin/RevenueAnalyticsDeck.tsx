'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Clock, Receipt, Tag, Minus } from 'lucide-react';
import { MeetingItem, SlipItem } from './types';

/* ─── Revenue Analytics Deck: กราฟภาพรวมรายได้แบบแดชบอร์ด ───────────────── */

// สีกราฟ (ผ่านการตรวจสอบ CVD/ความสว่างบนพื้นขาว) — เฉดเดียวกับสีหลักของระบบ
const C_MAIN = '#1d4ed8';
const C_LIGHT = '#60a5fa';
const C_PENDING = '#d97706';
const PENDING_TEXTURE = `repeating-linear-gradient(135deg, ${C_PENDING} 0 3px, #fbbf24 3px 6px)`;

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

type Granularity = 'day' | 'week' | 'month';
const GRAN_OPTIONS: Array<{ id: Granularity; label: string; count: number }> = [
  { id: 'day', label: 'รายวัน', count: 14 },
  { id: 'week', label: 'รายสัปดาห์', count: 12 },
  { id: 'month', label: 'รายเดือน', count: 12 },
];

/* ─── Helpers ─── */

function fmtCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return Math.round(n).toLocaleString();
}

function niceMax(v: number) {
  if (v <= 0) return 1000;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * exp;
}

function toGregorian(y: number) {
  return y > 2400 ? y - 543 : y;
}

// วันที่ของสลิป: ใช้วันที่โอนก่อน (รองรับ ISO และรูปแบบไทย วว/ดด/ปปปป) แล้วจึงใช้วันที่ส่งสลิป
function slipDate(s: SlipItem): Date | null {
  const t = (s.transferDate || '').trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(toGregorian(+m[1]), +m[2] - 1, +m[3]);
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(toGregorian(+m[3]), +m[2] - 1, +m[1]);
  if (s.createdAt) {
    const d = new Date(s.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function bucketStart(d: Date, g: Granularity) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (g === 'week') x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  if (g === 'month') x.setDate(1);
  return x;
}

function shiftBucket(d: Date, g: Granularity, n: number) {
  const x = new Date(d);
  if (g === 'day') x.setDate(x.getDate() + n);
  else if (g === 'week') x.setDate(x.getDate() + 7 * n);
  else x.setMonth(x.getMonth() + n);
  return x;
}

function bucketLabels(d: Date, g: Granularity) {
  const mon = TH_MONTHS[d.getMonth()];
  const yy = d.getFullYear() + 543;
  if (g === 'day') return { short: TH_DAYS[d.getDay()], sub: `${d.getDate()}`, full: `${d.getDate()} ${mon} ${yy}` };
  if (g === 'week') return { short: `${d.getDate()}`, sub: mon, full: `สัปดาห์ของ ${d.getDate()} ${mon} ${yy}` };
  return { short: mon, sub: `${String(yy).slice(2)}`, full: `${mon} ${yy}` };
}

// เส้นโค้งแบบ monotone ไม่ล้นต่ำกว่าศูนย์เหมือน Catmull-Rom
function monotonePath(pts: Array<{ x: number; y: number }>) {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;
  const dx: number[] = [];
  const ms: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    ms[i] = (pts[i + 1].y - pts[i].y) / dx[i];
  }
  const t: number[] = new Array(n);
  t[0] = ms[0];
  t[n - 1] = ms[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = ms[i - 1] * ms[i] <= 0 ? 0 : (ms[i - 1] + ms[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (ms[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / ms[i];
    const b = t[i + 1] / ms[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      t[i] = tau * a * ms[i];
      t[i + 1] = tau * b * ms[i];
    }
  }
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i].x + h},${pts[i].y + t[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - t[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

/* ─── Hooks ─── */

function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = reduce ? 1 : Math.min(1, (now - start) / duration);
      const v = from + (target - from) * (1 - Math.pow(1 - p, 3));
      fromRef.current = v;
      setVal(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function useReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return ready;
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/* ─── Shared UI ─── */

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col min-w-0 transition-shadow duration-300 hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
}

function DeltaBadge({ delta, caption }: { delta: number | null; caption: string }) {
  if (delta === null) {
    return <span className="text-[11px] font-medium text-slate-400">ยังไม่มีข้อมูลช่วงก่อนหน้า</span>;
  }
  const up = delta > 0;
  const flat = delta === 0;
  return (
    <span className="text-[11px] font-medium text-slate-500">
      <span className={`font-bold ${flat ? 'text-slate-600' : up ? 'text-emerald-700' : 'text-rose-700'}`}>
        {up ? '+' : ''}
        {delta.toFixed(1)}%
      </span>{' '}
      {caption}
    </span>
  );
}

function TrendIcon({ delta }: { delta: number | null }) {
  const Icon = delta === null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const tone =
    delta === null || delta === 0
      ? 'bg-slate-100 text-slate-500'
      : delta > 0
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-rose-50 text-rose-700';
  return (
    <span className={`inline-flex w-9 h-9 rounded-full items-center justify-center shrink-0 ${tone}`}>
      <Icon className="w-4.5 h-4.5" />
    </span>
  );
}

function YAxisGrid({ max, ticks = 4 }: { max: number; ticks?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (max * (ticks - i)) / ticks;
        return (
          <div key={i} className="relative h-0">
            <span className="absolute -left-1 -translate-x-full -translate-y-1/2 text-[10px] font-medium text-slate-400 tabular-nums">
              {fmtCompact(v)}
            </span>
            <div className={`border-t ${i === ticks ? 'border-slate-200' : 'border-dashed border-slate-100'}`} />
          </div>
        );
      })}
    </div>
  );
}

/* ─── Props ─── */

export interface RevenueAnalyticsDeckProps {
  meetings: MeetingItem[];
  slips: SlipItem[];
  selectedMeetingId: string;
  onSelectMeeting: (id: string) => void;
  onShowPending: () => void;
  rounds: Array<{
    id: string;
    titleTh: string;
    approvedRevenue: number;
    approvedMainRevenue: number;
    approvedWorkshopRevenue: number;
    pendingRevenue: number;
  }>;
}

export function RevenueAnalyticsDeck({
  meetings,
  slips,
  selectedMeetingId,
  onSelectMeeting,
  onShowPending,
  rounds,
}: RevenueAnalyticsDeckProps) {
  const [gran, setGran] = useState<Granularity>('week');

  // สลิปในขอบเขตตัวกรองปัจจุบัน
  const scopedSlips = useMemo(() => {
    if (selectedMeetingId !== 'all') return slips.filter((s) => s.meetingId === selectedMeetingId);
    const ids = new Set(meetings.map((m) => m.id));
    return slips.filter((s) => ids.has(s.meetingId));
  }, [slips, meetings, selectedMeetingId]);

  const scopedMeetings = useMemo(
    () => (selectedMeetingId === 'all' ? meetings : meetings.filter((m) => m.id === selectedMeetingId)),
    [meetings, selectedMeetingId]
  );

  // รวมยอดตามช่วงเวลา
  const series = useMemo(() => {
    const count = GRAN_OPTIONS.find((o) => o.id === gran)!.count;
    const dated = scopedSlips
      .filter((s) => s.status === 'approved' || s.status === 'pending')
      .map((s) => ({ s, d: slipDate(s) }))
      .filter((x): x is { s: SlipItem; d: Date } => x.d !== null);

    const latest = dated.reduce<Date | null>((acc, x) => (!acc || x.d > acc ? x.d : acc), null) || new Date();
    const end = bucketStart(latest, gran);
    const buckets = Array.from({ length: count }, (_, i) => {
      const start = shiftBucket(end, gran, i - count + 1);
      return { start, approved: 0, approvedCount: 0, pending: 0, pendingCount: 0, ...bucketLabels(start, gran) };
    });
    const index = new Map(buckets.map((b, i) => [b.start.getTime(), i]));
    dated.forEach(({ s, d }) => {
      const i = index.get(bucketStart(d, gran).getTime());
      if (i === undefined) return;
      if (s.status === 'approved') {
        buckets[i].approved += s.amount || 0;
        buckets[i].approvedCount += 1;
      } else {
        buckets[i].pending += s.amount || 0;
        buckets[i].pendingCount += 1;
      }
    });
    return buckets;
  }, [scopedSlips, gran]);

  const approvedTotal = useMemo(
    () => scopedSlips.filter((s) => s.status === 'approved').reduce((sum, s) => sum + (s.amount || 0), 0),
    [scopedSlips]
  );
  const pendingSlips = useMemo(() => scopedSlips.filter((s) => s.status === 'pending'), [scopedSlips]);
  const pendingTotal = pendingSlips.reduce((sum, s) => sum + (s.amount || 0), 0);

  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const trendDelta = prev && prev.approved > 0 ? ((last.approved - prev.approved) / prev.approved) * 100 : null;
  const pendingDelta = prev && prev.pending > 0 ? ((last.pending - prev.pending) / prev.pending) * 100 : null;

  const granCaption =
    gran === 'day' ? 'เทียบกับวันก่อน' : gran === 'week' ? 'เทียบกับสัปดาห์ก่อน' : 'เทียบกับเดือนก่อน';

  // ช่วงราคาต่อรายการตามประเภทบัตร
  const tierRanges = useMemo(() => {
    const map = new Map<string, number[]>();
    scopedSlips
      .filter((s) => s.status === 'approved' && s.amount > 0)
      .forEach((s) => {
        const name = s.ticketType || (s.memberCode ? 'สมาชิกสมาคม' : 'บุคคลทั่วไป');
        map.set(name, [...(map.get(name) || []), s.amount]);
      });
    return Array.from(map.entries())
      .map(([name, amounts]) => ({
        name,
        min: Math.min(...amounts),
        max: Math.max(...amounts),
        avg: amounts.reduce((a, b) => a + b, 0) / amounts.length,
        count: amounts.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [scopedSlips]);
  const approvedCount = scopedSlips.filter((s) => s.status === 'approved').length;
  const avgTicket = approvedCount > 0 ? approvedTotal / approvedCount : 0;

  // อัตราความสำเร็จ
  const rates = useMemo(() => {
    const registered = scopedMeetings.reduce((s, m) => s + (m.registered || 0), 0);
    const attended = scopedMeetings.reduce((s, m) => s + (m.attended || 0), 0);
    const seats = scopedMeetings.reduce((s, m) => s + (m.maxSeats || 0), 0);
    const inflow = approvedTotal + pendingTotal;
    const pct = (a: number, b: number) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);
    return [
      { label: 'จัดเก็บเงินสำเร็จ', value: pct(approvedTotal, inflow), color: '#0026b3', hint: `฿${fmtCompact(approvedTotal)} จาก ฿${fmtCompact(inflow)}` },
      { label: 'เช็คอินเข้างานจริง', value: pct(attended, registered), color: C_MAIN, hint: `${attended.toLocaleString()} จาก ${registered.toLocaleString()} คน` },
      { label: 'ที่นั่งถูกจองแล้ว', value: pct(registered, seats), color: '#3b82f6', hint: `${registered.toLocaleString()} จาก ${seats.toLocaleString()} ที่นั่ง` },
    ];
  }, [scopedMeetings, approvedTotal, pendingTotal]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-5">
      <TrendCard
        className="md:col-span-2 xl:col-span-6"
        series={series}
        total={approvedTotal}
        delta={trendDelta}
        caption={granCaption}
        gran={gran}
        onGranChange={setGran}
      />
      <PendingCard
        className="xl:col-span-3"
        buckets={series.slice(-4)}
        total={pendingTotal}
        count={pendingSlips.length}
        delta={pendingDelta}
        caption={granCaption}
      />
      <TierRangeCard className="xl:col-span-3" tiers={tierRanges} avg={avgTicket} />
      <RoundsCard
        className="md:col-span-2 xl:col-span-6"
        rounds={rounds}
        selectedMeetingId={selectedMeetingId}
        onSelectMeeting={onSelectMeeting}
      />
      <RatesCard
        className="md:col-span-2 xl:col-span-6"
        rates={rates}
        pendingTotal={pendingTotal}
        pendingCount={pendingSlips.length}
        onShowPending={onShowPending}
      />
    </div>
  );
}

/* ─── 1. Trend: เส้นโค้งรายได้ตามช่วงเวลา ─── */

type Bucket = {
  start: Date;
  approved: number;
  approvedCount: number;
  pending: number;
  pendingCount: number;
  short: string;
  sub: string;
  full: string;
};

function TrendCard({
  className,
  series,
  total,
  delta,
  caption,
  gran,
  onGranChange,
}: {
  className: string;
  series: Bucket[];
  total: number;
  delta: number | null;
  caption: string;
  gran: Granularity;
  onGranChange: (g: Granularity) => void;
}) {
  const shown = useCountUp(total);
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/:/g, '');

  const H = 236;
  const padL = 40;
  const padR = 14;
  const padT = 18;
  const plotH = 170;
  const W = Math.max(width, 280);
  const yMax = niceMax(Math.max(...series.map((b) => b.approved), 0) * 1.1);
  const stepX = series.length > 1 ? (W - padL - padR) / (series.length - 1) : 0;
  const pts = series.map((b, i) => ({ x: padL + i * stepX, y: padT + plotH - (b.approved / yMax) * plotH }));
  const line = monotonePath(pts);
  const area = pts.length > 1 ? `${line} L${pts[pts.length - 1].x},${padT + plotH} L${pts[0].x},${padT + plotH} Z` : '';
  const signature = `${gran}-${series.map((b) => b.approved).join(',')}`;
  const labelEvery = series.length > 12 ? 2 : 1;
  const active = hover ?? null;
  const lastIdx = series.length - 1;

  const handleMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const i = stepX > 0 ? Math.round((x - padL) / stepX) : 0;
    setHover(Math.max(0, Math.min(series.length - 1, i)));
  };

  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">แนวโน้มรายได้ที่อนุมัติแล้ว</h3>
        <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 text-[11px] font-bold">
          {GRAN_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onGranChange(o.id)}
              className={`px-2.5 py-1 rounded-lg transition-all duration-300 cursor-pointer whitespace-nowrap ${
                gran === o.id ? 'bg-white text-[#0026b3] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-3">
        <div className="flex items-center gap-3 min-w-0">
          <TrendIcon delta={delta} />
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-sm font-extrabold text-[#0026b3]">฿</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums truncate">
              {Math.round(shown).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <DeltaBadge delta={delta} caption={caption} />
        </div>
      </div>

      <div ref={wrapRef} className="relative mt-2 -mx-1 select-none" style={{ height: H }}>
        {width > 0 && (
          <svg width={W} height={H} className="block overflow-visible" role="img" aria-label="กราฟแนวโน้มรายได้">
            <defs>
              <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C_MAIN} stopOpacity="0.22" />
                <stop offset="100%" stopColor={C_MAIN} stopOpacity="0" />
              </linearGradient>
              <clipPath id={`reveal-${uid}`}>
                <rect key={signature} x="0" y="0" width={W} height={H} className="chart-reveal" />
              </clipPath>
            </defs>

            {/* เส้นกริดแนวนอน */}
            {[0, 1, 2, 3].map((i) => {
              const y = padT + (plotH * i) / 3;
              return (
                <g key={i}>
                  <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={i === 3 ? '' : '3 4'} />
                  <text x={padL - 8} y={y + 3.5} textAnchor="end" className="fill-slate-400 text-[10px] font-medium tabular-nums">
                    {fmtCompact((yMax * (3 - i)) / 3)}
                  </text>
                </g>
              );
            })}

            <g clipPath={`url(#reveal-${uid})`}>
              <path d={area} fill={`url(#area-${uid})`} />
              <path d={line} fill="none" stroke={C_MAIN} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {/* เส้นตัดแนวตั้งเมื่อชี้ */}
            {active !== null && pts[active] && (
              <line
                x1={pts[active].x}
                x2={pts[active].x}
                y1={padT}
                y2={padT + plotH}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                className="transition-all duration-200"
              />
            )}

            {/* จุดล่าสุดแบบเรือง */}
            {active === null && pts[lastIdx] && (
              <g key={`pulse-${signature}`} className="animate-fade-in" style={{ animationDelay: '1.1s', opacity: 0 }}>
                <circle cx={pts[lastIdx].x} cy={pts[lastIdx].y} r={9} fill={C_MAIN} opacity={0.18} className="chart-pulse" />
                <circle cx={pts[lastIdx].x} cy={pts[lastIdx].y} r={5} fill="#fff" stroke={C_MAIN} strokeWidth={2.5} />
              </g>
            )}
            {active !== null && pts[active] && (
              <circle
                cx={pts[active].x}
                cy={pts[active].y}
                r={6}
                fill="#fff"
                stroke={C_MAIN}
                strokeWidth={2.5}
                style={{ transition: 'cx 200ms ease-out, cy 200ms ease-out' }}
              />
            )}

            {/* แกน X: จุดและป้าย */}
            {series.map((b, i) => {
              const isActive = active === i || (active === null && i === lastIdx);
              return (
                <g key={i}>
                  <circle
                    cx={pts[i].x}
                    cy={padT + plotH + 18}
                    r={4}
                    fill={isActive ? C_MAIN : '#fff'}
                    stroke={isActive ? C_MAIN : '#cbd5e1'}
                    strokeWidth={1.5}
                    className="transition-colors duration-200"
                  />
                  {i % labelEvery === (lastIdx % labelEvery) && (
                    <text
                      x={pts[i].x}
                      y={padT + plotH + 40}
                      textAnchor="middle"
                      className={`text-[10px] font-bold transition-colors duration-200 ${isActive ? 'fill-[#0026b3]' : 'fill-slate-500'}`}
                    >
                      {b.short}
                      <tspan x={pts[i].x} dy="12" className="fill-slate-400 font-medium text-[9px]">
                        {b.sub}
                      </tspan>
                    </text>
                  )}
                </g>
              );
            })}

            <rect
              x={padL - stepX / 2}
              y={0}
              width={W - padL - padR + stepX}
              height={padT + plotH + 30}
              fill="transparent"
              onPointerMove={handleMove}
              onPointerLeave={() => setHover(null)}
              className="cursor-crosshair"
            />
          </svg>
        )}

        {active !== null && pts[active] && (
          <div
            className="absolute pointer-events-none z-10 -translate-x-1/2 -translate-y-full"
            style={{
              left: Math.min(Math.max(pts[active].x, 70), W - 70),
              top: pts[active].y - 12,
              transition: 'left 200ms ease-out, top 200ms ease-out',
            }}
          >
            <div className="bg-slate-900 text-white rounded-xl px-3 py-2 shadow-lg text-center whitespace-nowrap">
              <div className="text-sm font-black tabular-nums">฿{series[active].approved.toLocaleString()}</div>
              <div className="text-[10px] text-slate-300 font-medium">{series[active].full}</div>
              <div className="text-[10px] text-slate-400">{series[active].approvedCount} รายการ</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─── 2. อนุมัติแล้วกับรอตรวจ: แท่งคู่ 4 ช่วงล่าสุด ─── */

function PendingCard({
  className,
  buckets,
  total,
  count,
  delta,
  caption,
}: {
  className: string;
  buckets: Bucket[];
  total: number;
  count: number;
  delta: number | null;
  caption: string;
}) {
  const shown = useCountUp(total);
  const ready = useReady();
  const [hover, setHover] = useState<number | null>(null);
  const yMax = niceMax(Math.max(...buckets.flatMap((b) => [b.approved, b.pending]), 0));

  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">ยอดรอตรวจสลิป</h3>
        <span className="inline-flex w-9 h-9 rounded-full items-center justify-center bg-amber-50 text-amber-700 shrink-0">
          <Clock className="w-4.5 h-4.5" />
        </span>
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-sm font-extrabold text-amber-700">฿</span>
        <span className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">
          {Math.round(shown).toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <DeltaBadge delta={delta} caption={caption} />
        <span className="text-[11px] text-slate-400">• {count} รายการ</span>
      </div>

      <div className="flex items-center gap-3 mt-3 text-[10px] font-bold text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: C_MAIN }} />
          อนุมัติแล้ว
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PENDING_TEXTURE }} />
          รอตรวจ
        </span>
      </div>

      <div className="relative mt-3 ml-8 flex-1 min-h-[170px]">
        <div className="absolute inset-x-0 top-0 bottom-7">
          <YAxisGrid max={yMax} />
          <div className="absolute inset-0 flex items-end justify-around gap-2">
            {buckets.map((b, i) => (
              <div
                key={b.start.getTime()}
                className="relative h-full flex items-end justify-center gap-[2px] flex-1 cursor-default"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              >
                {[
                  { v: b.approved, bg: C_MAIN },
                  { v: b.pending, bg: PENDING_TEXTURE },
                ].map((bar, j) => (
                  <div
                    key={j}
                    className="w-3.5 rounded-t-[4px]"
                    style={{
                      height: ready ? `${Math.max(bar.v > 0 ? 3 : 0, (bar.v / yMax) * 100)}%` : '0%',
                      background: bar.bg,
                      transition: `height 900ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 80 + j * 40}ms, opacity 250ms`,
                      opacity: hover === null || hover === i ? 1 : 0.35,
                    }}
                  />
                ))}
                {hover === i && (
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 bg-slate-900 text-white rounded-lg px-2.5 py-1.5 text-[10px] whitespace-nowrap shadow-lg pointer-events-none animate-fade-in">
                    <div className="font-bold text-slate-300">{b.full}</div>
                    <div>อนุมัติ ฿{b.approved.toLocaleString()}</div>
                    <div className="text-amber-300">รอตรวจ ฿{b.pending.toLocaleString()}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-6 flex justify-around">
          {buckets.map((b) => (
            <span key={b.start.getTime()} className="flex-1 text-center text-[10px] font-bold text-slate-500 truncate">
              {b.short} {b.sub}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ─── 3. ช่วงราคาต่อรายการตามประเภทบัตร: แท่งลอย ─── */

function TierRangeCard({
  className,
  tiers,
  avg,
}: {
  className: string;
  tiers: Array<{ name: string; min: number; max: number; avg: number; count: number }>;
  avg: number;
}) {
  const shown = useCountUp(avg);
  const ready = useReady();
  const [hover, setHover] = useState<number | null>(null);
  const yMax = niceMax(Math.max(...tiers.map((t) => t.max), 0));
  const focus = hover !== null ? tiers[hover] : null;

  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">ช่วงราคาต่อรายการ</h3>
        <span className="inline-flex w-9 h-9 rounded-full items-center justify-center bg-blue-50 text-[#0026b3] shrink-0">
          <Tag className="w-4.5 h-4.5" />
        </span>
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-sm font-extrabold text-[#0026b3]">฿</span>
        <span className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">
          {Math.round(shown).toLocaleString()}
        </span>
      </div>
      <div className="text-[11px] text-slate-500 font-medium">ค่าเฉลี่ยต่อสลิปที่อนุมัติแล้ว</div>

      {tiers.length === 0 ? (
        <div className="flex-1 min-h-[170px] mt-3 flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60">
          <Receipt className="w-6 h-6 text-slate-300" />
          <p className="text-[11px] text-slate-400 mt-1">ยังไม่มีสลิปที่อนุมัติ</p>
        </div>
      ) : (
        <>
          <div className="relative mt-4 ml-8 flex-1 min-h-[150px]">
            <div className="absolute inset-x-0 top-0 bottom-6">
              <YAxisGrid max={yMax} />
              <div className="absolute inset-0 flex justify-around">
                {tiers.map((t, i) => {
                  const bottom = (t.min / yMax) * 100;
                  const height = Math.max(4, ((t.max - t.min) / yMax) * 100);
                  return (
                    <div
                      key={t.name}
                      className="relative h-full flex-1 flex justify-center cursor-default"
                      onPointerEnter={() => setHover(i)}
                      onPointerLeave={() => setHover(null)}
                    >
                      <div
                        className="absolute w-3 rounded-full"
                        style={{
                          bottom: ready ? `${bottom}%` : '0%',
                          height: ready ? `${height}%` : '0%',
                          background: `linear-gradient(to top, ${C_MAIN}, ${C_LIGHT})`,
                          transition: `bottom 1000ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 90}ms, height 1000ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 90}ms, opacity 250ms`,
                          opacity: hover === null || hover === i ? 1 : 0.35,
                        }}
                      />
                      <div
                        className="absolute w-2 h-2 rounded-full bg-white border-2"
                        style={{
                          borderColor: '#0026b3',
                          bottom: `calc(${ready ? (t.avg / yMax) * 100 : 0}% - 4px)`,
                          opacity: ready ? 1 : 0,
                          transition: 'all 1000ms cubic-bezier(0.22, 1, 0.36, 1)',
                          transitionDelay: `${i * 90 + 200}ms`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-5 flex justify-around">
              {tiers.map((t, i) => (
                <span
                  key={t.name}
                  className={`flex-1 text-center text-[10px] font-bold tabular-nums ${hover === i ? 'text-[#0026b3]' : 'text-slate-500'}`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-2 h-9 text-[11px] leading-tight rounded-lg bg-slate-50 px-2.5 py-1.5 border border-slate-100">
            {focus ? (
              <>
                <div className="font-bold text-slate-800 truncate">{focus.name}</div>
                <div className="text-slate-500 tabular-nums">
                  ฿{focus.min.toLocaleString()} – ฿{focus.max.toLocaleString()} • {focus.count} รายการ
                </div>
              </>
            ) : (
              <div className="text-slate-400 pt-1.5">ชี้ที่แท่งเพื่อดูประเภทบัตร • จุดขาวคือค่าเฉลี่ย</div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

/* ─── 4. รายได้แยกตามรอบ: แท่งคู่หลักสูตรหลักกับเวิร์กช็อป ─── */

function RoundsCard({
  className,
  rounds,
  selectedMeetingId,
  onSelectMeeting,
}: {
  className: string;
  rounds: RevenueAnalyticsDeckProps['rounds'];
  selectedMeetingId: string;
  onSelectMeeting: (id: string) => void;
}) {
  const ready = useReady();
  const [hover, setHover] = useState<number | null>(null);
  const data = rounds.map((r) => {
    const split = r.approvedMainRevenue + r.approvedWorkshopRevenue > 0;
    return {
      ...r,
      main: split ? r.approvedMainRevenue : r.approvedRevenue,
      ws: split ? r.approvedWorkshopRevenue : 0,
    };
  });
  const yMax = niceMax(Math.max(...data.flatMap((d) => [d.main, d.ws]), 0));

  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">รายได้แยกตามรอบการประชุม</h3>
        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: C_MAIN }} />
            หลักสูตรหลัก
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: C_LIGHT }} />
            เวิร์กช็อป
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="mt-4 h-[240px] flex items-center justify-center text-xs text-slate-400 rounded-xl border border-dashed border-slate-200">
          ไม่มีรอบการประชุมในตัวกรองนี้
        </div>
      ) : (
        <div className="overflow-x-auto mt-4 pb-1 scrollbar-thin">
          <div className="relative ml-9 h-[250px]" style={{ minWidth: `${Math.max(320, data.length * 64)}px` }}>
            <div className="absolute inset-x-0 top-2 bottom-8">
              <YAxisGrid max={yMax} />
              <div className="absolute inset-0 flex items-end justify-around">
                {data.map((d, i) => {
                  const selected = selectedMeetingId === d.id;
                  const dim = (hover !== null && hover !== i) || (selectedMeetingId !== 'all' && !selected);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => onSelectMeeting(selected ? 'all' : d.id)}
                      onPointerEnter={() => setHover(i)}
                      onPointerLeave={() => setHover(null)}
                      className="relative h-full flex-1 flex items-end justify-center gap-[2px] cursor-pointer"
                      title={d.titleTh}
                    >
                      {[
                        { v: d.main, bg: `linear-gradient(to top, #0026b3, ${C_MAIN})` },
                        { v: d.ws, bg: `linear-gradient(to top, #3b82f6, ${C_LIGHT})` },
                      ].map((bar, j) => (
                        <span
                          key={j}
                          className="block w-4 sm:w-5 rounded-t-[4px]"
                          style={{
                            height: ready ? `${bar.v > 0 ? Math.max(2, (bar.v / yMax) * 100) : 0}%` : '0%',
                            background: bar.bg,
                            transition: `height 1000ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 70 + j * 35}ms, opacity 250ms`,
                            opacity: dim ? 0.3 : 1,
                          }}
                        />
                      ))}
                      {hover === i && (
                        <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 bg-slate-900 text-white rounded-lg px-2.5 py-1.5 text-[10px] text-left whitespace-nowrap shadow-lg pointer-events-none animate-fade-in">
                          <span className="block font-bold text-slate-200 max-w-[220px] truncate">{d.titleTh}</span>
                          <span className="block">หลักสูตรหลัก ฿{d.main.toLocaleString()}</span>
                          <span className="block text-blue-300">เวิร์กช็อป ฿{d.ws.toLocaleString()}</span>
                          {d.pendingRevenue > 0 && (
                            <span className="block text-amber-300">รอตรวจ ฿{d.pendingRevenue.toLocaleString()}</span>
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-7 flex justify-around">
              {data.map((d) => (
                <span
                  key={d.id}
                  className={`flex-1 text-center text-[10px] font-bold truncate px-0.5 pt-1.5 ${
                    selectedMeetingId === d.id ? 'text-[#0026b3]' : 'text-slate-500'
                  }`}
                >
                  {d.id}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ─── 5. วงแหวนอัตราความสำเร็จ ─── */

function Ring({ value, color, label, hint, delay }: { value: number; color: string; label: string; hint: string; delay: number }) {
  const ready = useReady();
  const shown = useCountUp(value, 1200);
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center text-center min-w-0 group">
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 transition-transform duration-300 group-hover:scale-105">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="11" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={ready ? c * (1 - value / 100) : c}
            style={{ transition: `stroke-dashoffset 1300ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base sm:text-lg font-black text-slate-900 tabular-nums">{Math.round(shown)}%</span>
        </div>
      </div>
      <div className="mt-2 text-xs sm:text-sm font-bold text-slate-800">{label}</div>
      <div className="text-[10px] sm:text-[11px] text-slate-400 tabular-nums">{hint}</div>
    </div>
  );
}

function RatesCard({
  className,
  rates,
  pendingTotal,
  pendingCount,
  onShowPending,
}: {
  className: string;
  rates: Array<{ label: string; value: number; color: string; hint: string }>;
  pendingTotal: number;
  pendingCount: number;
  onShowPending: () => void;
}) {
  return (
    <Card className={className}>
      <h3 className="text-sm sm:text-base font-extrabold text-slate-900">อัตราความสำเร็จ</h3>
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 flex-1 items-center">
        {rates.map((r, i) => (
          <Ring key={r.label} {...r} delay={i * 150} />
        ))}
      </div>
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-900">
            {pendingCount > 0 ? 'ตรวจสลิปที่ค้างเพื่อเพิ่มยอดจัดเก็บ' : 'ตรวจสลิปครบทุกรายการแล้ว'}
          </div>
          <p className="text-[11px] text-slate-500">
            {pendingCount > 0
              ? `มีสลิปรอตรวจ ${pendingCount} รายการ รวม ฿${pendingTotal.toLocaleString()} ยังไม่นับเป็นรายได้`
              : 'รายได้ทั้งหมดในขอบเขตนี้ผ่านการอนุมัติแล้ว'}
          </p>
        </div>
        {pendingCount > 0 && (
          <button
            type="button"
            onClick={onShowPending}
            className="shrink-0 px-4 py-2 rounded-full bg-[#0026b3] hover:bg-[#001f94] text-white text-xs font-bold shadow-xs transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
          >
            ดูรายการรอตรวจ
          </button>
        )}
      </div>
    </Card>
  );
}
