import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { parseSlipPayload } from '@/lib/services/registrationAddOnService';
import {
  countSlipSeatClaims,
  lockAndAssertSeats,
  SeatUnavailableError,
  seatLimitedActivities,
} from '@/lib/services/activitySeatService';
import {
  ensureActiveSponsorCoupon,
  isCouponApplicableToActivities,
  resolveAttendeeActivities,
  SPONSOR_TEST_COUPON_CODE,
} from '@/lib/services/sponsorCouponService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Action = 'create' | 'update' | 'delete';
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

interface AttendeeInput {
  memberNo?: string;
  nameTh?: string;
  nameEn?: string;
  email?: string;
  phone?: string;
  workplace?: string;
  position?: string;
  dietaryPreference?: string;
  attendanceType?: string;
  programIds?: string[];
  originalTotal?: number;
  discountTotal?: number;
}

class EditError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

const clean = (v: unknown) => String(v ?? '').trim();
const lower = (v: unknown) => clean(v).toLowerCase();
const normalizeMemberNo = (v: unknown) => clean(v).replace(/^0+/, '');
const toInt = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));

function isGroupConferencePayload(p: any): boolean {
  return Boolean(
    p &&
      !Array.isArray(p) &&
      (p.isGroup || p.type === 'conference_group_registration') &&
      Array.isArray(p.attendees)
  );
}

function attendeeNet(att: any): number {
  if (!att) return 0;
  if (att.price !== undefined && att.price !== null && att.price !== '') return toInt(att.price);
  return Math.max(0, toInt(att.originalTotal || att.subtotal) - toInt(att.discountTotal ?? att.discountAmount));
}

function attendeeDiscount(att: any): number {
  return toInt(att?.discountTotal ?? att?.discountAmount);
}

function attendeeName(att: any): string {
  return clean(att?.nameTh || att?.nameEn || att?.fullNameTh || att?.fullNameEn) || 'ผู้เข้าร่วมประชุม';
}

function sameMember(a: unknown, b: unknown): boolean {
  const x = normalizeMemberNo(a);
  return Boolean(x) && x === normalizeMemberNo(b);
}

async function findMember(db: Tx | typeof prisma, rawNo: string) {
  const no = clean(rawNo);
  if (!no) return null;
  return db.member.findFirst({
    where: {
      OR: [{ member_no: no }, { member_no: no.padStart(4, '0') }, { member_no: no.replace(/^0+/, '') }],
    },
  });
}

/** ราคาตั้งต้นของกิจกรรมตามสถานะสมาชิกและรูปแบบการเข้าร่วม (ตรงกับหน้าชำระเงิน) */
function activityPrice(act: any, isMember: boolean, format: 'onsite' | 'online', meeting: any): number {
  if (act?.type === 'main' || act?.id === 'main') {
    const tiers = (meeting?.pricing_tiers as any)?.participant;
    const base = Number(meeting?.base_price) || 0;
    if (format === 'online') {
      return isMember ? tiers?.onlineMember ?? (base || 3500) : tiers?.onlineNonMember ?? (base ? base + 1000 : 4500);
    }
    return isMember ? tiers?.onsiteMember ?? (base || 3500) : tiers?.onsiteNonMember ?? (base ? base + 1000 : 4500);
  }
  const m = typeof act?.memberPrice === 'number' ? act.memberPrice : Number(act?.price) || 0;
  const nm = typeof act?.nonMemberPrice === 'number' ? act.nonMemberPrice : m;
  return isMember ? m : nm;
}

/** หาว่าผู้ลงทะเบียนรายนี้มีรายการอื่นในงานประชุมเดียวกันอยู่แล้วหรือไม่ (ไม่นับรายการกลุ่มนี้) */
async function findDuplicateRegistration(
  tx: Tx,
  meetingId: string,
  slipId: string,
  memberNo: string | null,
  email: string | null
): Promise<string | null> {
  const otherSlips = await tx.payment_slips.findMany({
    where: { meeting_id: meetingId, status: { in: ['pending', 'approved'] }, slip_id: { not: slipId } },
    select: { slip_id: true, ticket_code: true, member_no: true, guest_email: true, selected_activities: true },
  });
  for (const s of otherSlips) {
    const p = parseSlipPayload(s.selected_activities);
    if (p && !Array.isArray(p) && (p.isFormatChange || p.type === 'format_change' || p.isAddOn)) continue;
    if (isGroupConferencePayload(p)) {
      const hit = p.attendees.some(
        (a: any) => (memberNo && sameMember(a?.memberNo, memberNo)) || (!memberNo && email && lower(a?.email) === email)
      );
      if (hit) return s.ticket_code || s.slip_id;
      continue;
    }
    if (p && !Array.isArray(p) && (p.type === 'membership_registration' || p.type === 'membership_group_registration'))
      continue;
    if (memberNo && sameMember(s.member_no, memberNo)) return s.ticket_code || s.slip_id;
    if (!memberNo && email && lower(s.guest_email) === email) return s.ticket_code || s.slip_id;
  }
  return null;
}

/** แถว meeting_attendances ของผู้ลงทะเบียนในรายการนี้ */
async function findAttendanceRow(tx: Tx, meetingId: string, att: any) {
  const memberNo = clean(att?.memberNo);
  if (memberNo) {
    const member = await findMember(tx, memberNo);
    const no = member?.member_no || memberNo;
    return tx.meeting_attendances.findFirst({ where: { meeting_id: meetingId, member_no: no } });
  }
  const email = lower(att?.email);
  if (!email) return null;
  return tx.meeting_attendances.findFirst({
    where: { meeting_id: meetingId, member_no: null, attendee_email: { equals: email, mode: 'insensitive' } },
  });
}

async function hasCheckedIn(tx: Tx, row: { attendance_id: bigint; checkin_time: Date | null } | null) {
  if (!row) return false;
  if (row.checkin_time) return true;
  const daily = await tx.meeting_daily_checkins.count({
    where: { attendance_id: row.attendance_id, checkin_time: { not: null } },
  });
  return daily > 0;
}

interface SlipContext {
  meetingId: string;
  slipId: string;
  ticketCode: string | null;
  sponsorId: string | null;
  sponsorName: string | null;
  couponCode: string | null;
  companyName: string | null;
  coordinatorEmail: string | null;
}

/** สร้าง/อัปเดตสิทธิ์เข้าร่วมของผู้ลงทะเบียน (ใช้เมื่อรายการอนุมัติแล้วเท่านั้น) — ลำดับเดียวกับตอนอนุมัติสลิป */
async function upsertAttendance(tx: Tx, ctx: SlipContext, att: any) {
  const name = attendeeName(att);
  const email = lower(att.email) || null;
  const phone = clean(att.phone || att.mobile) || null;
  const workplace = clean(att.workplace) || ctx.companyName || null;
  const memberNo = clean(att.memberNo) || null;

  if (memberNo) {
    const existing = await tx.meeting_attendances.findFirst({ where: { meeting_id: ctx.meetingId, member_no: memberNo } });
    const data = {
      attendee_name: name,
      attendee_email: email,
      attendee_phone: phone,
      workplace,
      attendance_status: 'Registered',
      sponsor_id: ctx.sponsorId || existing?.sponsor_id || null,
      sponsor_company_name: ctx.sponsorName || existing?.sponsor_company_name || null,
      coupon_code: ctx.couponCode || existing?.coupon_code || null,
    };
    const row = existing
      ? await tx.meeting_attendances.update({ where: { attendance_id: existing.attendance_id }, data })
      : await tx.meeting_attendances.create({ data: { meeting_id: ctx.meetingId, member_no: memberNo, ...data } });

    if (email) {
      await tx.meeting_attendances.deleteMany({
        where: { meeting_id: ctx.meetingId, member_no: null, attendee_email: { equals: email, mode: 'insensitive' } },
      });
    }

    if (ctx.sponsorId) {
      await tx.member.update({
        where: { member_no: memberNo },
        data: { sponsor_id: ctx.sponsorId, sponsored_by_company: ctx.sponsorName },
      });
      const sgmData = {
        sponsor_id: ctx.sponsorId,
        attendee_name: name,
        attendee_email: email || '',
        attendee_phone: phone,
        workplace,
        ticket_code: ctx.ticketCode,
        attendance_id: row.attendance_id,
        coupon_code: ctx.couponCode,
        discount_amount: attendeeDiscount(att),
        net_price: attendeeNet(att),
        submitted_by_email: ctx.coordinatorEmail,
        status: 'confirmed',
      };
      await tx.sponsor_group_members.upsert({
        where: { meeting_id_member_no: { meeting_id: ctx.meetingId, member_no: memberNo } },
        create: { meeting_id: ctx.meetingId, member_no: memberNo, ...sgmData },
        update: sgmData,
      });
    }
    return;
  }

  if (!email) return;
  const existing = await tx.meeting_attendances.findFirst({
    where: { meeting_id: ctx.meetingId, member_no: null, attendee_email: { equals: email, mode: 'insensitive' } },
  });
  const data = {
    attendee_name: name,
    attendee_phone: phone,
    workplace,
    attendance_status: 'Non-Member',
    sponsor_id: ctx.sponsorId || existing?.sponsor_id || null,
    sponsor_company_name: ctx.sponsorName || existing?.sponsor_company_name || null,
    coupon_code: ctx.couponCode || existing?.coupon_code || null,
  };
  if (existing) {
    await tx.meeting_attendances.update({ where: { attendance_id: existing.attendance_id }, data });
  } else {
    await tx.meeting_attendances.create({
      data: { meeting_id: ctx.meetingId, member_no: null, attendee_email: email, ...data },
    });
  }
}

/** ยกเลิกสิทธิ์เข้าร่วมของผู้ลงทะเบียนที่ถูกนำออกหรือเปลี่ยนตัว */
async function removeAttendance(tx: Tx, ctx: SlipContext, att: any) {
  const row = await findAttendanceRow(tx, ctx.meetingId, att);
  if (row?.member_no) {
    await tx.sponsor_group_members.deleteMany({
      where: { meeting_id: ctx.meetingId, member_no: row.member_no, ...(ctx.ticketCode ? { ticket_code: ctx.ticketCode } : {}) },
    });
  }
  if (row) {
    await tx.meeting_daily_checkins.deleteMany({ where: { attendance_id: row.attendance_id } });
    await tx.meeting_attendances.delete({ where: { attendance_id: row.attendance_id } });
  }
  // ไม่มีรายการอื่นที่บริษัทนี้ส่งลงทะเบียนให้แล้ว: ล้างการเชื่อมโยงบริษัทผู้สนับสนุนของสมาชิก
  if (row?.member_no && ctx.sponsorId) {
    const remaining = await tx.sponsor_group_members.count({
      where: { member_no: row.member_no, sponsor_id: ctx.sponsorId },
    });
    if (remaining === 0) {
      await tx.member.updateMany({
        where: { member_no: row.member_no, sponsor_id: ctx.sponsorId },
        data: { sponsor_id: null, sponsored_by_company: null },
      });
    }
  }
}

interface CouponSyncResult {
  /** +1 = ใช้สิทธิ์เพิ่ม, -1 = คืนสิทธิ์ให้บริษัท */
  rightsDelta: number;
  remainingRights: number | null;
  /** ไม่มีคูปองที่เปิดใช้อยู่ แต่มีสิทธิ์คงเหลือ: ต้องออกรหัสใหม่หลังบันทึก */
  needsNewCoupon: boolean;
}

/** ผู้ลงทะเบียนใช้สิทธิ์คูปองบริษัทหรือไม่ (เกณฑ์เดียวกับตอนลงทะเบียน: ได้ส่วนลดจริง และลงโปรแกรมที่คูปองครอบคลุม) */
function claimsCouponRight(att: any | null, coupon: { remarks?: string | null }, meetingActivities: unknown): boolean {
  if (!att || att.isAddOn || attendeeDiscount(att) <= 0) return false;
  return isCouponApplicableToActivities(coupon, resolveAttendeeActivities(att, meetingActivities));
}

/**
 * สิทธิ์คูปองบริษัทของผู้ลงทะเบียน: ปรับประวัติการใช้คูปองและโควต้าให้ตรงกับส่วนลดที่ได้รับจริง
 * - ลบรายชื่อ / ตั้งส่วนลดเป็น 0: คืนสิทธิ์ 1 สิทธิ์ (sponsor_quotas.used_seats ลดลง)
 * - ปรับคูปองที่เปิดใช้อยู่ของบริษัทให้ใช้ได้ตามสิทธิ์คงเหลือใหม่ (ระบบ 1 คูปอง / 1 ครั้ง)
 */
async function syncCouponUsage(
  tx: Tx,
  ctx: SlipContext,
  before: any | null,
  after: any | null,
  meetingActivities: unknown
): Promise<CouponSyncResult> {
  const none: CouponSyncResult = { rightsDelta: 0, remainingRights: null, needsNewCoupon: false };
  if (!ctx.couponCode) return none;
  const coupon = await tx.coupons.findFirst({ where: { code: { equals: ctx.couponCode, mode: 'insensitive' } } });
  if (!coupon) return none;

  let usage: { id: bigint } | null = null;
  if (before) {
    const or: any[] = [];
    if (clean(before.memberNo)) or.push({ member_no: clean(before.memberNo) });
    if (lower(before.email)) or.push({ attendee_email: { equals: lower(before.email), mode: 'insensitive' } });
    if (or.length > 0) {
      usage = await tx.coupon_usages.findFirst({
        where: {
          coupon_id: coupon.id,
          meeting_id: ctx.meetingId,
          OR: or,
          AND: [{ OR: [{ slip_id: ctx.slipId }, ...(ctx.ticketCode ? [{ ticket_code: ctx.ticketCode }] : [])] }],
        },
        select: { id: true },
      });
    }
  }

  const claimedBefore = claimsCouponRight(before, coupon, meetingActivities);
  const claimNow = claimsCouponRight(after, coupon, meetingActivities);

  // ประวัติการใช้คูปองรายคน
  if (usage && !claimNow) {
    await tx.coupon_usages.delete({ where: { id: usage.id } });
  } else if (usage && claimNow) {
    await tx.coupon_usages.update({
      where: { id: usage.id },
      data: {
        member_no: clean(after.memberNo) || null,
        attendee_name: attendeeName(after),
        attendee_email: lower(after.email),
        attendee_phone: clean(after.phone) || null,
        workplace: clean(after.workplace) || ctx.companyName || null,
        discount_applied: attendeeDiscount(after),
        final_amount: attendeeNet(after),
      },
    });
  } else if (!usage && claimNow) {
    await tx.coupon_usages.create({
      data: {
        coupon_id: coupon.id,
        meeting_id: ctx.meetingId,
        member_no: clean(after.memberNo) || null,
        attendee_name: attendeeName(after),
        attendee_email: lower(after.email),
        attendee_phone: clean(after.phone) || null,
        workplace: clean(after.workplace) || ctx.companyName || null,
        discount_applied: attendeeDiscount(after),
        final_amount: attendeeNet(after),
        ticket_code: ctx.ticketCode,
        slip_id: ctx.slipId,
      },
    });
  }

  const rightsDelta = (claimNow ? 1 : 0) - (claimedBefore ? 1 : 0);
  if (rightsDelta === 0) return none;

  await tx.coupons.update({
    where: { id: coupon.id },
    data: { used_count: Math.max(0, coupon.used_count + rightsDelta) },
  });

  const quota = ctx.sponsorId
    ? await tx.sponsor_quotas.findFirst({ where: { sponsor_id: ctx.sponsorId, meeting_id: ctx.meetingId } })
    : null;
  if (!quota) return { rightsDelta, remainingRights: null, needsNewCoupon: false };

  const usedSeats = Math.max(0, quota.used_seats + rightsDelta);
  if (rightsDelta > 0 && usedSeats > quota.quota_seats) {
    throw new EditError('สิทธิ์คูปองของบริษัทเต็มแล้ว ไม่สามารถให้ส่วนลดคูปองเพิ่มได้ กรุณาตั้งส่วนลดเป็น 0');
  }
  await tx.sponsor_quotas.update({ where: { id: quota.id }, data: { used_seats: usedSeats } });
  const remainingRights = Math.max(0, quota.quota_seats - usedSeats);

  // คูปองที่เปิดใช้อยู่ออกตามสิทธิ์คงเหลือตอนออกรหัส: ปรับให้ตรงกับสิทธิ์คงเหลือใหม่
  const active = await tx.coupons.findFirst({
    where: { company_name: { equals: coupon.company_name, mode: 'insensitive' }, is_active: true },
    orderBy: { created_at: 'desc' },
  });
  if (active && active.code !== SPONSOR_TEST_COUPON_CODE && active.used_count === 0) {
    await tx.coupons.update({
      where: { id: active.id },
      data: remainingRights > 0 ? { max_uses: remainingRights } : { is_active: false },
    });
  }
  return { rightsDelta, remainingRights, needsNewCoupon: !active && remainingRights > 0 };
}

function formatThaiDateTime(d: Date): string {
  return d.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * GET /api/admin/slips/attendees?slipId=...
 * ข้อมูลกิจกรรมและราคาของงานประชุม สำหรับฟอร์มเพิ่ม/แก้ไขผู้ลงทะเบียนในรายการกลุ่ม
 */
export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // ค้นหาสมาชิกด้วยเลขสมาชิก เพื่อเติมชื่อในฟอร์มให้ตรงกับทะเบียน
  const lookupNo = clean(req.nextUrl.searchParams.get('memberNo'));
  if (lookupNo) {
    const member = await findMember(prisma, lookupNo);
    if (!member) {
      return NextResponse.json({ success: false, error: `ไม่พบเลขสมาชิก "${lookupNo}" ในระบบ` }, { status: 404 });
    }
    const status = lower(member.membership_status);
    return NextResponse.json({
      success: true,
      data: {
        memberNo: member.member_no,
        nameTh: member.fullNameTh || '',
        nameEn: member.fullNameEn || '',
        email: member.email || '',
        phone: member.mobile || '',
        workplace: member.workplace || '',
        position: member.position || '',
        isActive: status === '' || status === 'active',
        membershipStatus: member.membership_status || '',
      },
    });
  }

  const slipId = clean(req.nextUrl.searchParams.get('slipId'));
  if (!slipId) {
    return NextResponse.json({ success: false, error: 'กรุณาระบุรายการ' }, { status: 400 });
  }
  const slip = await prisma.payment_slips.findUnique({
    where: { slip_id: slipId },
    select: { meeting_id: true },
  });
  if (!slip) {
    return NextResponse.json({ success: false, error: 'ไม่พบรายการลงทะเบียน' }, { status: 404 });
  }
  const meeting = await prisma.meetings.findUnique({
    where: { meeting_id: slip.meeting_id },
    select: { meeting_id: true, meeting_name: true, activities: true, pricing_tiers: true, base_price: true },
  });
  const activities = (Array.isArray(meeting?.activities) ? (meeting!.activities as any[]) : []).map((a) => ({
    id: String(a?.id ?? ''),
    name: a?.name || String(a?.id ?? ''),
    type: a?.type || (a?.id === 'main' ? 'main' : 'workshop'),
    format: a?.format || null,
    maxSeats: Number(a?.maxSeats) || 0,
    prices: {
      onsiteMember: activityPrice(a, true, 'onsite', meeting),
      onsiteNonMember: activityPrice(a, false, 'onsite', meeting),
      onlineMember: activityPrice(a, true, 'online', meeting),
      onlineNonMember: activityPrice(a, false, 'online', meeting),
    },
  }));
  return NextResponse.json({
    success: true,
    data: { meetingId: meeting?.meeting_id, meetingName: meeting?.meeting_name, activities },
  });
}

/**
 * POST /api/admin/slips/attendees
 * ผู้ดูแลระบบเพิ่ม / แก้ไข / นำออก ผู้ลงทะเบียนในรายการลงทะเบียนประชุมแบบกลุ่ม (กรณีบริษัทลงผิด)
 * body: { slipId, action: 'create' | 'update' | 'delete', attendeeIndex?, attendee?, reason? }
 * - ยอดรวมของรายการปรับตามส่วนต่างราคาสุทธิของผู้ลงทะเบียนที่เปลี่ยน
 * - รายการที่อนุมัติแล้ว: ปรับสิทธิ์เข้าร่วม (meeting_attendances) และรายชื่อในพอร์ทัลบริษัทให้ตรงกัน
 * - บันทึกประวัติทุกครั้งใน adminNote และ removedAttendees ของรายการ
 * ไม่ส่งอีเมลแจ้งผู้ลงทะเบียนอัตโนมัติ
 */
export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const slipId = clean(body.slipId);
    const action = body.action as Action;
    const attendeeIndex = Number(body.attendeeIndex);
    const input: AttendeeInput = body.attendee || {};
    const reason = clean(body.reason).slice(0, 300);

    if (!slipId || !['create', 'update', 'delete'].includes(action)) {
      return NextResponse.json({ success: false, error: 'คำขอไม่ถูกต้อง' }, { status: 400 });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const slip = await tx.payment_slips.findUnique({ where: { slip_id: slipId } });
        if (!slip) throw new EditError('ไม่พบรายการลงทะเบียน', 404);
        if (slip.status !== 'pending' && slip.status !== 'approved') {
          throw new EditError('แก้ไขรายชื่อได้เฉพาะรายการที่รอตรวจสอบหรืออนุมัติสิทธิ์แล้ว');
        }
        const payload = parseSlipPayload(slip.selected_activities);
        if (!isGroupConferencePayload(payload)) {
          throw new EditError('รายการนี้ไม่ใช่การลงทะเบียนประชุมแบบกลุ่ม');
        }

        const attendees: any[] = [...payload.attendees];
        const hasIndex = Number.isInteger(attendeeIndex) && attendeeIndex >= 0 && attendeeIndex < attendees.length;
        if (action !== 'create' && !hasIndex) throw new EditError('ไม่พบผู้ลงทะเบียนที่ต้องการแก้ไข');
        const before = action === 'create' ? null : attendees[attendeeIndex];
        if (before?.isAddOn) {
          throw new EditError('ผู้ลงทะเบียนเพิ่มเติมรวมเข้ากับรายการเดิมแล้ว กรุณาแก้ไขที่รายการเดิมของผู้ลงทะเบียน');
        }
        if (action === 'delete' && attendees.length <= 1) {
          throw new EditError('รายการต้องมีผู้ลงทะเบียนอย่างน้อย 1 ท่าน หากต้องการยกเลิกทั้งหมดให้ปฏิเสธรายการแทน');
        }

        const meeting = await tx.meetings.findUnique({
          where: { meeting_id: slip.meeting_id },
          select: { activities: true, pricing_tiers: true, base_price: true },
        });
        const meetingActivities: any[] = Array.isArray(meeting?.activities) ? (meeting!.activities as any[]) : [];
        const isApproved = slip.status === 'approved';

        const sponsorRecord = await (async () => {
          const id = payload.sponsorId || payload.groupContact?.sponsorId || payload.sponsorSession?.sponsorId;
          if (id) {
            const s = await tx.sponsors.findUnique({ where: { id: String(id) } });
            if (s) return s;
          }
          if (payload.companyName) {
            return tx.sponsors.findFirst({ where: { name: { equals: clean(payload.companyName), mode: 'insensitive' } } });
          }
          return null;
        })();

        const ctx: SlipContext = {
          meetingId: slip.meeting_id,
          slipId: slip.slip_id,
          ticketCode: slip.ticket_code,
          sponsorId: sponsorRecord?.id || null,
          sponsorName: sponsorRecord?.name || clean(payload.companyName) || null,
          couponCode: clean(payload.couponCode || payload.couponData?.code) || null,
          companyName: clean(payload.companyName) || slip.guest_workplace || null,
          coordinatorEmail: clean(payload.groupContact?.coordinatorEmail) || slip.guest_email || null,
        };

        // ── สร้างข้อมูลผู้ลงทะเบียนใหม่จากฟอร์ม ──────────────────────────────
        let after: any = null;
        if (action !== 'delete') {
          const rawNo = clean(input.memberNo);
          let memberNo: string | null = null;
          let nameTh = clean(input.nameTh);
          let nameEn = clean(input.nameEn);
          let email = lower(input.email);
          let phone = clean(input.phone);
          let workplace = clean(input.workplace);
          let position = clean(input.position);
          let isActiveMember = false;

          if (rawNo) {
            const member = await findMember(tx, rawNo);
            if (!member) throw new EditError(`ไม่พบเลขสมาชิก "${rawNo}" ในระบบ`);
            memberNo = member.member_no;
            // ใช้ชื่อตามทะเบียนสมาชิก เพื่อให้เลขสมาชิกกับชื่อตรงกันเสมอ
            nameTh = clean(member.fullNameTh) || nameTh;
            nameEn = clean(member.fullNameEn) || nameEn;
            email = email || lower(member.email);
            phone = phone || clean(member.mobile);
            workplace = workplace || clean(member.workplace);
            position = position || clean(member.position);
            const status = lower(member.membership_status);
            isActiveMember = status === '' || status === 'active';
          }
          if (!nameTh && !nameEn) throw new EditError('กรุณากรอกชื่อผู้ลงทะเบียน');
          if (!email) throw new EditError('กรุณากรอกอีเมลผู้ลงทะเบียน');
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new EditError('รูปแบบอีเมลไม่ถูกต้อง');

          const programIds = Array.from(new Set((input.programIds || []).map(String)));
          if (programIds.length === 0) throw new EditError('กรุณาเลือกหลักสูตรหรือกิจกรรมอย่างน้อย 1 รายการ');
          const chosen = programIds.map((id) => meetingActivities.find((a) => String(a?.id) === id));
          if (chosen.some((a) => !a)) throw new EditError('พบหลักสูตรที่ไม่มีในงานประชุมนี้');

          const requestedFormat: 'onsite' | 'online' = input.attendanceType === 'online' ? 'online' : 'onsite';
          const selectedActivities = chosen.map((a: any) => {
            const isMain = a.type === 'main' || a.id === 'main';
            const fmt = isMain || a.format === 'both' || !a.format ? requestedFormat : a.format;
            return {
              id: a.id,
              name: a.name,
              type: a.type || (isMain ? 'main' : 'workshop'),
              format: fmt,
              price: activityPrice(a, Boolean(memberNo), fmt, meeting),
              ...(a.date ? { date: a.date } : {}),
            };
          });

          const originalTotal = toInt(input.originalTotal);
          const discountTotal = Math.min(toInt(input.discountTotal), originalTotal);
          if (discountTotal > 0 && (!memberNo || !isActiveMember)) {
            throw new EditError('คูปองบริษัทใช้ได้เฉพาะสมาชิกสถานะปกติเท่านั้น กรุณาตั้งส่วนลดเป็น 0');
          }

          // ล้างฟิลด์กิจกรรมรุ่นเก่า เพื่อให้ทุกหน้าอ่านจาก selectedActivities ชุดใหม่
          const { selectedActivityObjects, activities, selectedPrograms, programNameTh, programNameEn, selectedPackage, ...rest } =
            before || {};
          void selectedActivityObjects; void activities; void selectedPrograms;
          void programNameTh; void programNameEn; void selectedPackage;

          after = {
            ...rest,
            memberNo: memberNo || '',
            isMember: Boolean(memberNo),
            isExpiredMember: Boolean(memberNo) && !isActiveMember,
            nameTh,
            nameEn,
            email,
            phone,
            ...(rest.mobile !== undefined ? { mobile: phone } : {}),
            workplace,
            position,
            dietaryPreference: clean(input.dietaryPreference),
            attendanceType: requestedFormat,
            ...(rest.selectedFormat !== undefined ? { selectedFormat: requestedFormat } : {}),
            ...(rest.format !== undefined ? { format: requestedFormat } : {}),
            selectedActivities,
            selectedProgramIds: programIds,
            originalTotal,
            subtotal: originalTotal,
            discountTotal,
            price: originalTotal - discountTotal,
            adminEditedAt: new Date().toISOString(),
            adminEditedBy: session.username,
            ...(action === 'create' ? { addedByAdmin: true } : {}),
          };
          delete after.discountAmount;
          delete after.netPrice;
          delete after.discountAppliedNotice;

          // ── ตรวจการลงทะเบียนซ้ำ (นับเฉพาะรายชื่อที่ยังอยู่ในรายการ ผู้ที่ถูกลบรายชื่อออกแล้วลงใหม่ได้) ──
          const identityChanged =
            !before ||
            !sameMember(before.memberNo, memberNo) ||
            (!memberNo && lower(before.email) !== email);
          if (identityChanged) {
            const dupInSlip = attendees.some(
              (a, i) =>
                i !== attendeeIndex &&
                ((memberNo && sameMember(a?.memberNo, memberNo)) || (!memberNo && !a?.memberNo && lower(a?.email) === email))
            );
            if (dupInSlip) throw new EditError('ผู้ลงทะเบียนท่านนี้มีอยู่ในรายการกลุ่มนี้แล้ว');

            const dupTicket = await findDuplicateRegistration(tx, slip.meeting_id, slip.slip_id, memberNo, email);
            if (dupTicket) throw new EditError(`ผู้ลงทะเบียนท่านนี้มีรายการลงทะเบียนงานนี้อยู่แล้ว ${dupTicket}`);

            const existingRow = await findAttendanceRow(tx, slip.meeting_id, after);
            if (existingRow && !['Cancelled', 'Rejected'].includes(existingRow.attendance_status)) {
              throw new EditError('ผู้ลงทะเบียนท่านนี้ได้รับสิทธิ์เข้าร่วมงานนี้อยู่แล้ว');
            }
          }
        }

        // ── ห้ามนำออก/เปลี่ยนตัวผู้ที่เช็กอินแล้ว ─────────────────────────────
        const identityReplaced =
          before &&
          (action === 'delete' ||
            !sameMember(before.memberNo, after?.memberNo) ||
            (!clean(before.memberNo) && lower(before.email) !== lower(after?.email)));
        // ผู้ที่ถูกนำออกยังมีรายการอื่นในงานนี้: คงสิทธิ์เข้าร่วมไว้ ไม่ลบแถวเข้าร่วมงานที่ใช้ร่วมกัน
        const keptByOtherSlip =
          isApproved && identityReplaced
            ? Boolean(
                await findDuplicateRegistration(
                  tx,
                  slip.meeting_id,
                  slip.slip_id,
                  clean(before.memberNo) || null,
                  lower(before.email) || null
                )
              )
            : false;
        if (isApproved && identityReplaced && !keptByOtherSlip) {
          const row = await findAttendanceRow(tx, slip.meeting_id, before);
          if (await hasCheckedIn(tx, row)) {
            throw new EditError('ผู้ลงทะเบียนท่านนี้เช็กอินเข้างานแล้ว ไม่สามารถนำออกหรือเปลี่ยนตัวได้');
          }
        }

        // ── ยอดเงิน ─────────────────────────────────────────────────────────
        const amountBefore = Number(slip.amount) || 0;
        const netDelta = attendeeNet(after) - attendeeNet(before);
        const originalDelta = toInt(after?.originalTotal ?? after?.subtotal) - toInt(before?.originalTotal ?? before?.subtotal);
        const discountDelta = attendeeDiscount(after) - attendeeDiscount(before);
        const newAmount = Math.max(0, amountBefore + netDelta);

        // ── ประกอบรายชื่อใหม่ ────────────────────────────────────────────────
        const removed: any[] = Array.isArray(payload.removedAttendees) ? [...payload.removedAttendees] : [];
        if (action === 'create') attendees.push(after);
        else if (action === 'update') attendees[attendeeIndex] = after;
        else {
          attendees.splice(attendeeIndex, 1);
          removed.push({
            ...before,
            price: attendeeNet(before),
            amountBefore,
            amountAfter: newAmount,
            removedAt: new Date().toISOString(),
            removedBy: session.username,
            ...(reason ? { removedReason: reason } : {}),
          });
        }

        // ── ที่นั่งกิจกรรม: ตรวจเฉพาะกิจกรรมที่จำนวนที่นั่งของรายการนี้เพิ่มขึ้น ──
        const newPayloadBase = { ...payload, attendees };
        const oldClaims = countSlipSeatClaims(slip, meetingActivities);
        const newClaims = countSlipSeatClaims({ ...slip, selected_activities: newPayloadBase }, meetingActivities);
        const increased = new Map<string, number>();
        newClaims.forEach((n, id) => {
          if (n > (oldClaims.get(id) || 0)) increased.set(id, n);
        });
        await lockAndAssertSeats(tx, slip.meeting_id, increased, {
          excludeSlipId: slip.slip_id,
          meetingActivities,
        });

        // ── สิทธิ์คูปองบริษัท และที่นั่งเวิร์กช็อปที่คืน (ที่นั่งนับจากรายชื่อปัจจุบัน จึงคืนทันทีเมื่อบันทึก) ──
        const couponResult = await syncCouponUsage(tx, ctx, before, after, meetingActivities);
        const seatsReturned = seatLimitedActivities(meetingActivities)
          .map((a) => {
            const id = String(a.id);
            return { id, name: a.name || id, count: (oldClaims.get(id) || 0) - (newClaims.get(id) || 0) };
          })
          .filter((x) => x.count > 0);
        if (action === 'delete') {
          Object.assign(removed[removed.length - 1], {
            couponRightsReturned: Math.max(0, -couponResult.rightsDelta),
            couponRightsRemaining: couponResult.remainingRights,
            seatsReturned,
          });
        }

        const label = attendeeName(after || before);
        const actionText =
          action === 'create'
            ? `เพิ่มผู้ลงทะเบียน ${label}`
            : action === 'update'
              ? before && attendeeName(before) !== label
                ? `แก้ไขผู้ลงทะเบียน ${attendeeName(before)} เป็น ${label}`
                : `แก้ไขข้อมูลผู้ลงทะเบียน ${label}`
              : `ลบรายชื่อ ${label} ออก`;
        const amountText =
          action === 'delete'
            ? ` ยอดเดิม ฿${amountBefore.toLocaleString()} ยอดหลังลบรายชื่อ ฿${newAmount.toLocaleString()}`
            : netDelta !== 0
              ? ` ยอดรวม ฿${amountBefore.toLocaleString()} → ฿${newAmount.toLocaleString()}`
              : '';
        const remainingText =
          couponResult.remainingRights !== null ? ` คงเหลือ ${couponResult.remainingRights} สิทธิ์` : '';
        const couponText =
          couponResult.rightsDelta < 0
            ? ` คืนสิทธิ์คูปองบริษัท 1 สิทธิ์${remainingText}`
            : couponResult.rightsDelta > 0
              ? ` ใช้สิทธิ์คูปองบริษัทเพิ่ม 1 สิทธิ์${remainingText}`
              : '';
        const seatText = seatsReturned.length
          ? ` คืนที่นั่ง ${seatsReturned.map((x) => `${x.name} ${x.count} ที่นั่ง`).join(', ')}`
          : '';
        const noteLine = `${formatThaiDateTime(new Date())} ${session.username}: ${actionText}${amountText}${couponText}${seatText}${reason ? ` (${reason})` : ''}`;

        const newPayload = {
          ...newPayloadBase,
          removedAttendees: removed,
          totalAmount: Math.max(0, toInt(payload.totalAmount ?? slip.amount) + netDelta),
          originalAmount: Math.max(0, toInt(payload.originalAmount) + originalDelta),
          discountAmount: Math.max(0, toInt(payload.discountAmount) + discountDelta),
          adminNote: [clean(payload.adminNote), noteLine].filter(Boolean).join('\n'),
        };
        if (newPayload.removedAttendees.length === 0) delete (newPayload as any).removedAttendees;

        const primary = attendees.find((a) => clean(a?.memberNo) && !a?.isAddOn);
        const companyLabel = clean(payload.companyName) || 'Corporate Group';

        await tx.payment_slips.update({
          where: { id: slip.id },
          data: {
            selected_activities: newPayload as any,
            amount: newAmount,
            guest_name: `${companyLabel} (${attendees.length} ท่าน)`,
            is_member: attendees.some((a) => a?.isMember || clean(a?.memberNo)),
            member_no: primary ? clean(primary.memberNo) : null,
          },
        });

        // ── สิทธิ์เข้าร่วมและคูปอง (รายการที่อนุมัติแล้ว) ─────────────────────
        if (isApproved) {
          if (before && identityReplaced && !keptByOtherSlip) await removeAttendance(tx, ctx, before);
          if (after) await upsertAttendance(tx, ctx, after);
        }

        return {
          attendeeCount: attendees.length,
          amount: newAmount,
          note: noteLine,
          couponRightsDelta: couponResult.rightsDelta,
          couponRightsRemaining: couponResult.remainingRights,
          seatsReturned,
          newCouponForSponsorId: couponResult.needsNewCoupon ? ctx.sponsorId : null,
        };
      },
      { timeout: 30000 }
    );

    // บริษัทไม่มีคูปองที่เปิดใช้อยู่ (สิทธิ์เคยหมด) แต่ได้สิทธิ์คืน: ออกรหัสคูปองใหม่ตามสิทธิ์คงเหลือ
    const { newCouponForSponsorId, ...data } = result;
    if (newCouponForSponsorId) {
      try {
        const sponsor = await prisma.sponsors.findUnique({
          where: { id: newCouponForSponsorId },
          select: { id: true, name: true },
        });
        if (sponsor) await ensureActiveSponsorCoupon(sponsor);
      } catch (couponErr) {
        console.error('[AdminGroupAttendee] Failed to issue sponsor coupon for returned rights:', couponErr);
      }
    }

    console.info(`[AdminGroupAttendee] admin="${session.username}" slip="${slipId}" action=${action} ${result.note}`);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    if (error instanceof EditError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    if (error instanceof SeatUnavailableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    console.error('API /api/admin/slips/attendees POST error:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถบันทึกการแก้ไขรายชื่อได้ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
