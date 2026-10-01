import prisma from '@/lib/prisma';
import { parseSlipPayload, slipActivityList } from '@/lib/services/registrationAddOnService';
import { resolveAttendeeActivities } from '@/lib/services/sponsorCouponService';

/**
 * ระบบตัดที่นั่งรายกิจกรรม (เวิร์กช็อปที่กำหนด maxSeats ไว้)
 *
 * - นับที่นั่งจาก payment_slips สถานะ pending และ approved (ตัดที่นั่งตั้งแต่ส่งรายการ ยังไม่ต้องรออนุมัติ)
 * - รายการที่ถูกปฏิเสธ (rejected) ไม่ถูกนับ = คืนที่นั่งอัตโนมัติ
 * - รายการเพิ่มเติมที่รวมเข้ารายการเดิมแล้ว (merged) นับผ่านรายการเดิมแทน
 * - การประชุมหลักไม่จำกัดที่นั่ง
 */

type Db = Pick<typeof prisma, 'payment_slips' | 'meetings' | '$queryRaw'>;

export const SEAT_COUNTED_STATUSES = ['pending', 'approved'];

export interface ActivitySeatUsage {
  id: string;
  name: string;
  maxSeats: number;
  used: number;
  remaining: number;
}

export class SeatUnavailableError extends Error {
  constructor(message: string, public readonly shortages: ActivitySeatUsage[]) {
    super(message);
  }
}

const normalizeMemberNo = (value: unknown) => String(value ?? '').trim().replace(/^0+/, '');
const normalizeName = (value: unknown) => String(value ?? '').trim().toLowerCase();

/** กิจกรรมที่จำกัดที่นั่ง (ไม่รวมการประชุมหลัก) */
export function seatLimitedActivities(meetingActivities: unknown): any[] {
  const acts = Array.isArray(meetingActivities) ? (meetingActivities as any[]) : [];
  return acts.filter((a) => a && a.type !== 'main' && a.id !== 'main' && Number(a.maxSeats) > 0);
}

/** จับคู่กิจกรรมในรายการลงทะเบียนกับกิจกรรมที่จำกัดที่นั่ง (ใช้ id ก่อน หากไม่ตรงจึงเทียบชื่อ) */
function matchLimitedId(act: any, limited: any[]): string | null {
  const id = String(act?.id ?? '');
  if (id && limited.some((l) => String(l.id) === id)) return id;
  const name = normalizeName(act?.name);
  const byName = name ? limited.find((l) => normalizeName(l.name) === name) : null;
  return byName ? String(byName.id) : null;
}

/** นับที่นั่งที่ผู้ลงทะเบียน 1 คนใช้ (กิจกรรมซ้ำในคนเดียวนับครั้งเดียว) */
function addPersonClaims(acts: any[], limited: any[], counts: Map<string, number>) {
  const seen = new Set<string>();
  for (const act of acts) {
    const id = matchLimitedId(act, limited);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    counts.set(id, (counts.get(id) || 0) + 1);
  }
}

function isGroupPayload(payload: any, ticketCode: string | null | undefined): boolean {
  return Boolean(
    payload &&
      !Array.isArray(payload) &&
      Array.isArray(payload.attendees) &&
      (payload.isGroup || payload.type === 'conference_group_registration' || ticketCode?.startsWith('GRP'))
  );
}

function isNonSeatPayload(payload: any): boolean {
  return Boolean(
    payload &&
      !Array.isArray(payload) &&
      (payload.isFormatChange ||
        // บันทึกแยกสำหรับผู้ดูแลระบบ (เช่น รายการ fellow) ที่รวมอยู่ในบิลอื่นแล้ว ไม่นับที่นั่งซ้ำ
        payload.adminOnly ||
        payload.type === 'membership_registration' ||
        payload.type === 'membership_group_registration')
  );
}

/**
 * จำนวนที่นั่งที่ payload หนึ่งรายการใช้ ต่อกิจกรรม
 * mergedMarkers: ผู้เข้าร่วมแบบลงเพิ่มในรายการกลุ่มที่รวมเข้ารายการเดิมแล้ว (`slipId:memberNo`) ไม่นับซ้ำ
 */
export function countSlipSeatClaims(
  slip: { slip_id?: string | null; ticket_code?: string | null; selected_activities: unknown },
  meetingActivities: unknown,
  mergedMarkers: Set<string> = new Set()
): Map<string, number> {
  const counts = new Map<string, number>();
  const limited = seatLimitedActivities(meetingActivities);
  if (limited.length === 0) return counts;

  const payload = parseSlipPayload(slip.selected_activities);
  if (isNonSeatPayload(payload)) return counts;

  if (isGroupPayload(payload, slip.ticket_code)) {
    for (const att of payload.attendees) {
      if (att?.isAddOn && slip.slip_id) {
        const marker = `${slip.slip_id}:${normalizeMemberNo(att.memberNo || att.member_no)}`;
        if (mergedMarkers.has(marker)) continue;
      }
      addPersonClaims(resolveAttendeeActivities(att, meetingActivities), limited, counts);
    }
    return counts;
  }

  addPersonClaims(slipActivityList(payload), limited, counts);
  return counts;
}

/** สรุปที่นั่งของทุกกิจกรรมที่จำกัดที่นั่งในงานประชุม */
export async function getActivitySeatUsage(
  meetingId: string,
  options: { db?: Db; excludeSlipId?: string; meetingActivities?: unknown } = {}
): Promise<ActivitySeatUsage[]> {
  const db = options.db || prisma;
  let meetingActivities = options.meetingActivities;
  if (meetingActivities === undefined) {
    const meeting = await db.meetings.findUnique({ where: { meeting_id: meetingId }, select: { activities: true } });
    meetingActivities = meeting?.activities;
  }
  const limited = seatLimitedActivities(meetingActivities);
  if (limited.length === 0) return [];

  const slips = await db.payment_slips.findMany({
    where: {
      meeting_id: meetingId,
      status: { in: SEAT_COUNTED_STATUSES },
      ...(options.excludeSlipId ? { slip_id: { not: options.excludeSlipId } } : {}),
    },
    select: { slip_id: true, ticket_code: true, selected_activities: true },
  });

  return summarizeSeatUsage(slips, meetingActivities);
}

/** รวมที่นั่งจากรายการลงทะเบียนที่ดึงมาแล้ว (ใช้ร่วมกับการคำนวณหลายงานประชุมพร้อมกัน) */
export function summarizeSeatUsage(
  slips: Array<{ slip_id: string; ticket_code: string | null; selected_activities: unknown }>,
  meetingActivities: unknown
): ActivitySeatUsage[] {
  const limited = seatLimitedActivities(meetingActivities);
  if (limited.length === 0) return [];

  const mergedMarkers = new Set<string>();
  for (const slip of slips) {
    const payload = parseSlipPayload(slip.selected_activities);
    if (payload && !Array.isArray(payload) && Array.isArray(payload.addOnSlipIds)) {
      payload.addOnSlipIds.forEach((m: unknown) => mergedMarkers.add(String(m)));
    }
  }

  const used = new Map<string, number>();
  for (const slip of slips) {
    countSlipSeatClaims(slip, meetingActivities, mergedMarkers).forEach((n, id) => {
      used.set(id, (used.get(id) || 0) + n);
    });
  }

  return limited.map((a) => {
    const maxSeats = Number(a.maxSeats) || 0;
    const usedSeats = used.get(String(a.id)) || 0;
    return {
      id: String(a.id),
      name: a.name || String(a.id),
      maxSeats,
      used: usedSeats,
      remaining: Math.max(0, maxSeats - usedSeats),
    };
  });
}

/** กิจกรรมที่ที่นั่งไม่พอสำหรับจำนวนที่ขอ */
export function findSeatShortages(usage: ActivitySeatUsage[], requested: Map<string, number>): ActivitySeatUsage[] {
  return usage.filter((u) => (requested.get(u.id) || 0) > u.remaining);
}

export function seatShortageMessage(shortages: ActivitySeatUsage[]): string {
  const parts = shortages.map((s) =>
    s.remaining > 0 ? `${s.name} (เหลือ ${s.remaining} ที่นั่ง)` : `${s.name} (ที่นั่งเต็มแล้ว)`
  );
  return `ที่นั่งไม่เพียงพอสำหรับกิจกรรม: ${parts.join(', ')} กรุณาเลือกกิจกรรมอื่นหรือลดจำนวนผู้ลงทะเบียน`;
}

/**
 * ล็อกการตัดที่นั่งของงานประชุม (ภายใน Transaction) แล้วตรวจว่ายังมีที่นั่งพอ
 * ต้องเรียกภายใน prisma.$transaction ก่อนบันทึกรายการ เพื่อกันการลงทะเบียนพร้อมกันจนเกินจำนวนที่นั่ง
 */
export async function lockAndAssertSeats(
  tx: Db,
  meetingId: string,
  requested: Map<string, number>,
  options: { excludeSlipId?: string; meetingActivities?: unknown } = {}
): Promise<void> {
  if (![...requested.values()].some((n) => n > 0)) return;
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`activity-seats:${meetingId}`}))`;
  const usage = await getActivitySeatUsage(meetingId, { db: tx, ...options });
  const shortages = findSeatShortages(usage, requested);
  if (shortages.length > 0) {
    throw new SeatUnavailableError(seatShortageMessage(shortages), shortages);
  }
}

/** ตรวจที่นั่งก่อนเปลี่ยนรายการที่ถูกปฏิเสธกลับมาเป็นรอตรวจสอบหรืออนุมัติ (รายการนั้นกลับมาใช้ที่นั่งอีกครั้ง) */
export async function assertSeatsForReactivatedSlip(slip: {
  slip_id: string;
  meeting_id: string;
  ticket_code: string | null;
  selected_activities: unknown;
}): Promise<void> {
  const meeting = await prisma.meetings.findUnique({
    where: { meeting_id: slip.meeting_id },
    select: { activities: true },
  });
  const requested = countSlipSeatClaims(slip, meeting?.activities);
  if (requested.size === 0) return;
  await prisma.$transaction(async (tx) => {
    await lockAndAssertSeats(tx, slip.meeting_id, requested, {
      excludeSlipId: slip.slip_id,
      meetingActivities: meeting?.activities,
    });
  });
}

/** เพิ่มข้อมูลที่นั่งคงเหลือให้แต่ละกิจกรรม (usedSeats / remainingSeats) สำหรับแสดงผล */
export function withSeatUsage<T extends { activities?: unknown }>(meeting: T, usage: ActivitySeatUsage[]): T {
  if (!Array.isArray(meeting.activities) || usage.length === 0) return meeting;
  const byId = new Map(usage.map((u) => [u.id, u]));
  return {
    ...meeting,
    activities: (meeting.activities as any[]).map((a) => {
      const u = byId.get(String(a?.id));
      return u ? { ...a, usedSeats: u.used, remainingSeats: u.remaining } : a;
    }),
  };
}
