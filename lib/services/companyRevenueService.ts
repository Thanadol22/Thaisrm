import prisma from '@/lib/prisma';
import { aggregateMeetingSlips, buildGroupAddOnIndex, ProgramRevenueKind, SlipRow } from '@/lib/services/programRevenueService';
import { getSponsorRegistrationRows, groupPeople } from '@/lib/services/sponsorRegistrationService';

// ยอดรวมของแต่ละบริษัทแยกตามรอบประชุมและรายการที่ลงทะเบียน
// ใช้ตัวแจกยอดลงหลักสูตรตัวเดียวกับรายงานรายได้ ยอดทุกรายการรวมกันจึงเท่ากับยอดบิลของบริษัทเสมอ

export interface CompanyRevenueItem {
  key: string;
  name: string;
  kind: ProgramRevenueKind | 'quota';
  people: number;
  /** อนุมัติและมีสลิปโอนจริงแล้ว */
  received: number;
  /** บิลชำระภายหลังที่ยังไม่แนบสลิป */
  payLater: number;
  /** แนบสลิปแล้วรอตรวจ หรือรออนุมัติสิทธิ์ */
  review: number;
  total: number;
}

export interface CompanyMeetingRevenue {
  meetingId: string;
  meetingName: string;
  items: CompanyRevenueItem[];
  bills: number;
  people: number;
  received: number;
  payLater: number;
  review: number;
  total: number;
}

export interface CompanyRevenue {
  /** id บริษัทในตาราง sponsors หรือ name:<ชื่อ> เมื่อจับคู่บริษัทไม่ได้ */
  id: string;
  name: string;
  tier: string | null;
  meetings: CompanyMeetingRevenue[];
}

const TIER_WEIGHT: Record<string, number> = { Platinum: 1, Gold: 2, Silver: 3 };
const lower = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

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

/** บิลแบบบริษัท (เกณฑ์เดียวกับประวัติการลงทะเบียนของบริษัท) คืนชื่อบริษัท หรือ null */
function companyOfSlip(s: { selected_activities: unknown; guest_workplace: string | null }): string | null {
  const payload = parse(s.selected_activities);
  if (!payload || Array.isArray(payload) || payload.adminOnly) return null;
  const people = groupPeople(payload);
  const isMembership = payload.type === 'membership_group_registration' || (Array.isArray(payload.applicants) && payload.applicants.length > 0);
  if (!payload.isGroup && payload.type !== 'conference_group_registration' && !isMembership) return null;
  if (people.length === 0) return null;
  return String(payload.companyName || s.guest_workplace || '').trim() || null;
}

export async function getCompanyRevenue(): Promise<CompanyRevenue[]> {
  const [sponsors, meetings, slips, registrationRows] = await Promise.all([
    prisma.sponsors.findMany({ select: { id: true, name: true, tier: true, contact_email: true } }),
    prisma.meetings.findMany({ select: { meeting_id: true, meeting_name: true, activities: true, pricing_tiers: true, base_price: true } }),
    prisma.payment_slips.findMany({
      where: { status: { in: ['approved', 'pending'] } },
      select: {
        slip_id: true, meeting_id: true, amount: true, status: true, is_member: true,
        selected_activities: true, slip_url: true, bank: true, guest_workplace: true, guest_email: true,
      },
    }),
    getSponsorRegistrationRows(),
  ]);

  const byName = new Map(sponsors.map((sp) => [lower(sp.name), sp]));
  const byEmail = new Map(sponsors.filter((sp) => sp.contact_email).map((sp) => [lower(sp.contact_email), sp]));
  const meetingById = new Map(meetings.map((m) => [m.meeting_id, m]));

  const companies = new Map<string, { id: string; name: string; tier: string | null; slips: Map<string, SlipRow[]>; quota: Map<string, number> }>();
  const companyFor = (sp: { id: string; name: string; tier: string } | undefined, fallbackName: string) => {
    const id = sp ? sp.id : `name:${fallbackName}`;
    let c = companies.get(id);
    if (!c) {
      c = { id, name: sp?.name || fallbackName, tier: sp?.tier || null, slips: new Map(), quota: new Map() };
      companies.set(id, c);
    }
    return c;
  };

  for (const s of slips) {
    const name = companyOfSlip(s);
    if (!name || !meetingById.has(s.meeting_id)) continue;
    const sp = byName.get(lower(name)) || byEmail.get(lower(s.guest_email));
    const c = companyFor(sp, name);
    const list = c.slips.get(s.meeting_id) || [];
    list.push(s);
    c.slips.set(s.meeting_id, list);
  }

  // ผู้ที่ลงผ่านโควต้าบริษัทโดยไม่มีบิล (ไม่มียอดเงิน นับเฉพาะจำนวนคน)
  for (const r of registrationRows) {
    if (r.billStatus !== 'quota' || !r.sponsorId) continue;
    const sp = sponsors.find((x) => x.id === r.sponsorId);
    const c = companyFor(sp, r.company);
    c.quota.set(r.meetingId, (c.quota.get(r.meetingId) || 0) + 1);
  }

  const addOnIndex = buildGroupAddOnIndex(slips);
  const result: CompanyRevenue[] = [];
  for (const c of companies.values()) {
    const meetingIds = new Set([...c.slips.keys(), ...c.quota.keys()]);
    const list: CompanyMeetingRevenue[] = [];
    for (const meetingId of meetingIds) {
      const m = meetingById.get(meetingId);
      if (!m) continue;
      const agg = aggregateMeetingSlips(m, c.slips.get(meetingId) || [], addOnIndex);
      const items: CompanyRevenueItem[] = agg.rows
        .filter((r) => r.approvedRevenue + r.pendingRevenue !== 0 || r.approvedPeople + r.pendingPeople > 0)
        .map((r) => {
          const payLater = r.payLaterApprovedRevenue + r.payLaterPendingRevenue;
          const received = r.approvedRevenue - r.payLaterApprovedRevenue;
          const review = r.pendingRevenue - r.payLaterPendingRevenue;
          return {
            key: r.key,
            name: r.name,
            kind: r.kind,
            people: r.approvedPeople + r.pendingPeople,
            received,
            payLater,
            review,
            total: received + payLater + review,
          };
        });
      const quotaPeople = c.quota.get(meetingId) || 0;
      if (quotaPeople > 0) {
        items.push({ key: 'quota', name: 'ใช้โควต้าบริษัท', kind: 'quota', people: quotaPeople, received: 0, payLater: 0, review: 0, total: 0 });
      }
      const sum = (f: 'received' | 'payLater' | 'review' | 'total') => items.reduce((acc, i) => acc + i[f], 0);
      // นับคนไม่ซ้ำ: คนเดียวลงหลายหลักสูตรนับครั้งเดียว
      // ผู้ที่ลงเพิ่มต่อจากรายการเดิมในบิลของบริษัทเดียวกัน นับแล้วที่บิลเดิม
      const meetingSlips = c.slips.get(meetingId) || [];
      const slipIds = new Set(meetingSlips.map((s) => s.slip_id));
      const people =
        meetingSlips.reduce((acc, s) => {
          const list = groupPeople(parse(s.selected_activities));
          return acc + list.filter((a: any) => !(a?.isAddOn && slipIds.has(a.addOnOriginalSlipId))).length;
        }, 0) + quotaPeople;
      list.push({
        meetingId,
        meetingName: m.meeting_name,
        items,
        bills: agg.approvedBills + agg.pendingBills,
        people,
        received: sum('received'),
        payLater: sum('payLater'),
        review: sum('review'),
        total: sum('total'),
      });
    }
    if (list.length > 0) result.push({ id: c.id, name: c.name, tier: c.tier, meetings: list });
  }

  return result.sort(
    (a, b) => (TIER_WEIGHT[a.tier || ''] ?? 4) - (TIER_WEIGHT[b.tier || ''] ?? 4) || a.name.localeCompare(b.name, 'th')
  );
}
