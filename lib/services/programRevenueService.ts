import prisma from '@/lib/prisma';
import { attendeeBackdatedCharges, resolveAttendeeActivities } from '@/lib/services/sponsorCouponService';
import { groupPeople } from '@/lib/services/sponsorRegistrationService';

// รายได้แยกตามหลักสูตรของแต่ละรอบประชุม
// แจกยอดเงินของทุกบิล (รวมบิลกลุ่มบริษัท) ลงหลักสูตรตามที่ผู้เข้าร่วมแต่ละคนเลือก โดยยอดรวมทุกแถวเท่ากับยอดสลิปจริงเสมอ
// รายการที่ไม่ใช่หลักสูตร (ค่าสมัครสมาชิก ค่าเปลี่ยนรูปแบบ รายการลงบิลย้อนหลัง) แยกเป็นแถวต่างหาก

export type ProgramRevenueKind = 'main' | 'workshop' | 'membership' | 'format_change' | 'backdated' | 'unassigned';

export interface ProgramRevenueRow {
  key: string;
  name: string;
  kind: ProgramRevenueKind;
  dateText: string;
  approvedRevenue: number;
  pendingRevenue: number;
  /** ส่วนของ approvedRevenue / pendingRevenue ที่เป็นบิลชำระภายหลังซึ่งยังไม่แนบสลิป */
  payLaterApprovedRevenue: number;
  payLaterPendingRevenue: number;
  /** จำนวนผู้ลงทะเบียน (คน) ที่สลิปอนุมัติแล้ว */
  approvedPeople: number;
  pendingPeople: number;
  payLaterPeople: number;
}

export interface MeetingProgramRevenue {
  meetingId: string;
  rows: ProgramRevenueRow[];
  approvedTotal: number;
  pendingTotal: number;
  approvedBills: number;
  pendingBills: number;
  payLaterApprovedTotal: number;
  payLaterPendingTotal: number;
  payLaterBills: number;
  payLaterPendingBills: number;
}

const EXTRA_ROWS: Record<Exclude<ProgramRevenueKind, 'main' | 'workshop'>, string> = {
  membership: 'ค่าสมัครสมาชิก',
  format_change: 'ค่าธรรมเนียมเปลี่ยนรูปแบบการเข้าร่วม',
  backdated: 'รายการลงบิลย้อนหลัง',
  unassigned: 'ไม่ระบุหลักสูตร',
};

const NO_SLIP_URLS = new Set(['PAY_LATER', 'pay_later_pending', '/placeholder-slip.png', 'GROUP_REGISTRATION', 'GROUP_MEMBERSHIP']);

/** บิลชำระภายหลังที่ยังไม่แนบสลิป (เกณฑ์เดียวกับหน้าบริษัทและหน้าตรวจสอบการชำระเงิน) */
function isUnpaidPayLater(s: { slip_url: string | null; bank: string | null; amount: number }): boolean {
  const url = s.slip_url || '';
  const hasActualSlip = Boolean(url) && !NO_SLIP_URLS.has(url) && !url.startsWith('TEMP_');
  const isPayLater =
    url === 'PAY_LATER' ||
    url === 'pay_later_pending' ||
    (typeof s.bank === 'string' && (s.bank.includes('ชำระเงินภายหลัง') || s.bank.toLowerCase().includes('pay later')));
  return isPayLater && !hasActualSlip && Number(s.amount) > 0;
}

const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

function parse(raw: unknown): any {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw ?? null;
}

interface Line {
  key: string;
  weight: number;
  person: string;
}

/** แบ่งยอดบิลตามสัดส่วนน้ำหนัก ปัดเศษให้ผลรวมเท่ายอดบิลพอดี */
function splitAmount(amount: number, lines: Line[]): number[] {
  const total = lines.reduce((s, l) => s + l.weight, 0);
  const weights = total > 0 ? lines.map((l) => l.weight) : lines.map(() => 1);
  const sum = weights.reduce((s, w) => s + w, 0);
  const parts = weights.map((w) => Math.floor((amount * w) / sum));
  let remainder = amount - parts.reduce((s, p) => s + p, 0);
  for (let i = 0; remainder > 0; i = (i + 1) % parts.length, remainder--) parts[i] += 1;
  return parts;
}

export type MeetingRow = { meeting_id: string; activities: unknown; pricing_tiers: unknown; base_price: number | null };
export type SlipRow = {
  slip_id: string;
  meeting_id: string;
  amount: number;
  status: string;
  is_member: boolean;
  selected_activities: unknown;
  slip_url: string | null;
  bank: string | null;
};

/** รวมยอดของสลิปชุดหนึ่ง (ของรอบประชุมเดียวกัน) แจกลงหลักสูตร */
export function aggregateMeetingSlips(m: MeetingRow, slips: SlipRow[]): MeetingProgramRevenue {
  const acts: any[] = Array.isArray(m.activities) ? (m.activities as any[]) : [];
  const tiers = (parse(m.pricing_tiers) || {}) as any;
  const mainAct = acts.find((a) => a?.type === 'main') || null;

  const rows = new Map<string, ProgramRevenueRow & { approvedSet: Set<string>; pendingSet: Set<string>; payLaterSet: Set<string> }>();
  const rowFor = (key: string, name: string, kind: ProgramRevenueKind, dateText = '') => {
    let row = rows.get(key);
    if (!row) {
      row = {
        key, name, kind, dateText,
        approvedRevenue: 0, pendingRevenue: 0, payLaterApprovedRevenue: 0, payLaterPendingRevenue: 0,
        approvedPeople: 0, pendingPeople: 0, payLaterPeople: 0,
        approvedSet: new Set(), pendingSet: new Set(), payLaterSet: new Set(),
      };
      rows.set(key, row);
    }
    return row;
  };
  // หลักสูตรที่เปิดในรอบนี้แสดงทุกแถวแม้ยังไม่มีรายได้
  acts.forEach((a, idx) => {
    rowFor(`act:${a?.id || idx}`, String(a?.name || `หลักสูตร ${idx + 1}`).replace(/\s+/g, ' ').trim(), a?.type === 'main' ? 'main' : 'workshop', a?.date || '');
  });

  const findAct = (item: any) =>
    acts.find((a) => (item?.id && a?.id === item.id) || (item?.name && norm(a?.name) === norm(item.name))) ||
    (item?.type === 'main' || item?.id === 'main' ? mainAct : null);

  /** น้ำหนักไว้แบ่งยอด: ราคาที่บันทึกในรายการก่อน ไม่มีจึงใช้ราคาตั้งของหลักสูตร */
  const weightOf = (item: any, act: any, isMember: boolean, online: boolean) => {
    const own = Number(item?.price);
    if (own > 0) return own;
    if (act?.type === 'main') {
      const p = tiers.participant || {};
      const v = online ? p.onlineMember : isMember ? p.onsiteMember : p.onsiteNonMember;
      return Number(v) || Number(m.base_price) || 1;
    }
    return Number(isMember ? act?.memberPrice : act?.nonMemberPrice) || Number(act?.memberPrice) || 1;
  };

  /** รายการหลักสูตรของผู้เข้าร่วม 1 คน (ไม่เลือกอะไรเลย = ลงเฉพาะการประชุมหลัก) */
  const personLines = (items: any[], person: string, isMember: boolean, online: boolean): Line[] => {
    const list = items.length > 0 ? items : mainAct ? [mainAct] : [];
    if (list.length === 0) return [{ key: 'unassigned', weight: 1, person }];
    return list.map((item) => {
      const act = findAct(item);
      return { key: act ? `act:${act.id}` : 'unassigned', weight: weightOf(item, act, isMember, online), person };
    });
  };

  let approvedTotal = 0;
  let pendingTotal = 0;
  let approvedBills = 0;
  let pendingBills = 0;
  let payLaterApprovedTotal = 0;
  let payLaterPendingTotal = 0;
  let payLaterBills = 0;
  let payLaterPendingBills = 0;

  for (const s of slips) {
    const payload = parse(s.selected_activities);
    // บันทึกแยกสำหรับผู้ดูแลระบบ ยอดรวมอยู่ในบิลอื่นแล้ว ไม่นับซ้ำ
    if (payload && !Array.isArray(payload) && payload.adminOnly) continue;

    const amount = Number(s.amount) || 0;
    const approved = s.status === 'approved';
    const payLater = isUnpaidPayLater(s);
    if (approved) {
      approvedTotal += amount;
      approvedBills++;
    } else {
      pendingTotal += amount;
      pendingBills++;
    }
    if (payLater) {
      payLaterBills++;
      if (approved) payLaterApprovedTotal += amount;
      else {
        payLaterPendingTotal += amount;
        payLaterPendingBills++;
      }
    }

    let lines: Line[] = [];
    const obj = payload && !Array.isArray(payload) ? payload : null;
    const hasAttendees = Array.isArray(obj?.attendees) && obj.attendees.length > 0;
    const hasApplicants = Array.isArray(obj?.applicants) && obj.applicants.length > 0;
    if (obj && (obj.type === 'membership_group_registration' || obj.type === 'membership_registration' || (obj.isGroup && hasApplicants && !hasAttendees))) {
      const people = obj.type === 'membership_registration' ? 1 : groupPeople(obj).length;
      lines = Array.from({ length: Math.max(1, people) }, (_, i) => ({ key: 'membership', weight: 1, person: `${s.slip_id}:${i}` }));
    } else if (obj?.isFormatChange) {
      lines = [{ key: 'format_change', weight: 1, person: s.slip_id }];
    } else if (obj && Array.isArray(obj.attendees) && (obj.isGroup || obj.type === 'conference_group_registration')) {
      obj.attendees.forEach((att: any, i: number) => {
        const person = `${s.slip_id}:${i}`;
        const isMember = Boolean(att?.isMember || att?.memberNo);
        const online = (att?.selectedFormat || att?.attendanceType || att?.format) === 'online';
        lines.push(...personLines(resolveAttendeeActivities(att, acts), person, isMember, online));
        attendeeBackdatedCharges(att).forEach((c) => lines.push({ key: 'backdated', weight: c.amount, person }));
      });
    } else {
      const items: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(obj?.activities)
          ? obj.activities
          : Array.isArray(obj?.selectedActivities)
            ? obj.selectedActivities
            : [];
      const online = (obj?.attendanceType || obj?.attendees?.[0]?.attendanceType) === 'online';
      lines = personLines(items.filter((x) => x && typeof x === 'object'), s.slip_id, Boolean(s.is_member), online);
    }

    if (amount === 0 && lines.length === 0) continue;
    if (lines.length === 0) lines = [{ key: 'unassigned', weight: 1, person: s.slip_id }];

    splitAmount(amount, lines).forEach((part, i) => {
      const line = lines[i];
      const row =
        line.key.startsWith('act:')
          ? rows.get(line.key)!
          : rowFor(line.key, EXTRA_ROWS[line.key as keyof typeof EXTRA_ROWS], line.key as ProgramRevenueKind);
      if (approved) {
        row.approvedRevenue += part;
        row.approvedSet.add(line.person);
        if (payLater) row.payLaterApprovedRevenue += part;
      } else {
        row.pendingRevenue += part;
        row.pendingSet.add(line.person);
        if (payLater) row.payLaterPendingRevenue += part;
      }
      if (payLater) row.payLaterSet.add(line.person);
    });
  }

  return {
    meetingId: m.meeting_id,
    rows: [...rows.values()]
      .filter((r) => r.kind === 'main' || r.kind === 'workshop' || r.approvedRevenue > 0 || r.pendingRevenue > 0)
      .map(({ approvedSet, pendingSet, payLaterSet, ...r }) => ({
        ...r,
        approvedPeople: approvedSet.size,
        pendingPeople: pendingSet.size,
        payLaterPeople: payLaterSet.size,
      })),
    approvedTotal,
    pendingTotal,
    approvedBills,
    pendingBills,
    payLaterApprovedTotal,
    payLaterPendingTotal,
    payLaterBills,
    payLaterPendingBills,
  };
}

const MEETING_SELECT = { meeting_id: true, activities: true, pricing_tiers: true, base_price: true } as const;
const SLIP_SELECT = {
  slip_id: true, meeting_id: true, amount: true, status: true, is_member: true,
  selected_activities: true, slip_url: true, bank: true, guest_workplace: true, guest_email: true,
} as const;

export async function getProgramRevenue(meetingIds?: string[]): Promise<Record<string, MeetingProgramRevenue>> {
  const meetings = await prisma.meetings.findMany({
    where: meetingIds?.length ? { meeting_id: { in: meetingIds } } : undefined,
    select: MEETING_SELECT,
  });
  const slips = await prisma.payment_slips.findMany({
    where: { meeting_id: { in: meetings.map((m) => m.meeting_id) }, status: { in: ['approved', 'pending'] } },
    select: SLIP_SELECT,
  });

  const result: Record<string, MeetingProgramRevenue> = {};
  for (const m of meetings) {
    result[m.meeting_id] = aggregateMeetingSlips(m, slips.filter((s) => s.meeting_id === m.meeting_id));
  }
  return result;
}
