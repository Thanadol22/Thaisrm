import prisma from '@/lib/prisma';
import { collectOtherActiveRegistrants, parseSlipPayload } from '@/lib/services/registrationAddOnService';
import {
  ensureActiveSponsorCoupon,
  isCouponApplicableToActivities,
  resolveAttendeeActivities,
  SPONSOR_TEST_COUPON_CODE,
} from '@/lib/services/sponsorCouponService';

/**
 * ยกเลิกรายการลงทะเบียนที่ถูกปฏิเสธ (แจ้งแก้ไขแล้วแต่ไม่มีการอัปเดตกลับมา)
 *
 * ระหว่างที่ถูกปฏิเสธ รายการยังถือสิทธิ์ไว้ทั้งหมด (ที่นั่งเวิร์กช็อปของรายการกลุ่ม สิทธิ์คูปอง โควต้าบริษัท)
 * เพื่อไม่ให้รายการใหม่แทรกเข้ามาใช้สิทธิ์ของรายการเดิม เมื่อแอดมินยกเลิกจึงคืนสิทธิ์ทั้งหมด:
 * - สถานะรายการเป็น cancelled และปิดลิงก์แก้ไขสลิป
 * - ที่นั่งเวิร์กช็อป: ไม่ถูกนับอีก (cancelled ไม่อยู่ในสถานะที่ถือที่นั่ง)
 * - สิทธิ์คูปองและโควต้าบริษัท: ลบประวัติการใช้คูปองของรายการ ลดจำนวนที่ใช้ และคืนโควต้าให้บริษัท
 * - สิทธิ์เข้าร่วม: เปลี่ยนเป็น Cancelled (ยกเว้นผู้ที่ยังมีรายการอื่นที่ใช้สิทธิ์อยู่)
 * - รายชื่อในหน้าบริษัท: ลบรายชื่อของรายการนี้ และล้างการเชื่อมโยงบริษัทของสมาชิกที่ไม่มีรายการอื่นกับบริษัทนี้
 */

export const SLIP_CANCELLED_STATUS = 'cancelled';

export class SlipCancelError extends Error {}

const normalizeMemberNo = (value: unknown) => String(value ?? '').trim().replace(/^0+/, '');
const toInt = (value: unknown) => Math.max(0, Math.round(Number(value) || 0));

function isGroupSlip(payload: any, ticketCode: string | null): boolean {
  return Boolean(
    payload && !Array.isArray(payload) && Array.isArray(payload.attendees) &&
      (payload.isGroup || ticketCode?.startsWith('GRP'))
  );
}

export interface SlipCancelResult {
  slipId: string;
  ticketCode: string | null;
  returnedCouponRights: number;
  cancelledAttendances: number;
  keptAttendances: number;
}

export async function cancelRejectedSlip(slipId: string, reviewer: string, reason?: string | null): Promise<SlipCancelResult> {
  const slip = await prisma.payment_slips.findUnique({ where: { slip_id: slipId } });
  if (!slip) throw new SlipCancelError('ไม่พบรายการลงทะเบียน');
  if (slip.status === SLIP_CANCELLED_STATUS) throw new SlipCancelError('รายการนี้ถูกยกเลิกไปแล้ว');
  if (slip.status !== 'rejected') {
    throw new SlipCancelError('ยกเลิกได้เฉพาะรายการที่ถูกปฏิเสธและรอการแก้ไข กรุณาปฏิเสธรายการก่อน');
  }

  const payload = parseSlipPayload(slip.selected_activities);
  const isGroup = isGroupSlip(payload, slip.ticket_code);
  const meeting = await prisma.meetings.findUnique({ where: { meeting_id: slip.meeting_id }, select: { activities: true } });
  const otherRegistrants = await collectOtherActiveRegistrants(slip.meeting_id, slipId);

  // ผู้ลงทะเบียนในรายการนี้ (ไม่นับผู้ที่ลงกิจกรรมเพิ่มเติม ซึ่งสิทธิ์หลักอยู่ที่รายการเดิม)
  const people: Array<{ memberNo: string; email: string }> = isGroup
    ? payload.attendees
        .filter((att: any) => att && typeof att === 'object' && !att.isAddOn)
        .map((att: any) => ({
          memberNo: String(att.memberNo || att.member_no || '').trim(),
          email: String(att.email || '').trim().toLowerCase(),
        }))
    : [{ memberNo: String(slip.member_no || '').trim(), email: String(slip.guest_email || '').trim().toLowerCase() }];

  const couponCode = String(payload?.couponCode || payload?.couponData?.code || '').trim().toUpperCase();

  let sponsorForCoupon: { id: string; name: string } | null = null;
  let returnedCouponRights = 0;
  let cancelledAttendances = 0;
  let keptAttendances = 0;

  await prisma.$transaction(async (tx) => {
    // ── สิทธิ์คูปองและโควต้าบริษัท ──
    const usages = await tx.coupon_usages.findMany({
      where: {
        OR: [
          { slip_id: slipId },
          ...(slip.ticket_code ? [{ slip_id: null, ticket_code: slip.ticket_code, meeting_id: slip.meeting_id }] : []),
        ],
      },
      select: { id: true, coupon_id: true },
    });
    const usageCountByCoupon = new Map<string, number>();
    usages.forEach((u) => usageCountByCoupon.set(String(u.coupon_id), (usageCountByCoupon.get(String(u.coupon_id)) || 0) + 1));
    if (usages.length > 0) {
      await tx.coupon_usages.deleteMany({ where: { id: { in: usages.map((u) => u.id) } } });
    }

    const couponIds = new Set<string>(usageCountByCoupon.keys());
    let coupon = couponCode ? await tx.coupons.findUnique({ where: { code: couponCode } }) : null;
    if (!coupon && usages.length > 0) {
      coupon = await tx.coupons.findUnique({ where: { id: usages[0].coupon_id } });
    }
    if (coupon) couponIds.add(String(coupon.id));

    for (const id of couponIds) {
      const used = usageCountByCoupon.get(id) || 0;
      if (used === 0) continue;
      const rec = await tx.coupons.findUnique({ where: { id }, select: { id: true, used_count: true } });
      if (rec) {
        await tx.coupons.update({ where: { id: rec.id }, data: { used_count: Math.max(0, rec.used_count - used) } });
      }
    }

    // จำนวนสิทธิ์ที่รายการนี้ใช้จากโควต้าบริษัท (เกณฑ์เดียวกับตอนลงทะเบียน: ได้ส่วนลดจริง และลงโปรแกรมที่คูปองครอบคลุม)
    if (coupon) {
      returnedCouponRights = isGroup
        ? payload.attendees.filter(
            (att: any) =>
              att && !att.isAddOn &&
              toInt(att.discountTotal ?? att.discountAmount) > 0 &&
              isCouponApplicableToActivities(coupon!, resolveAttendeeActivities(att, meeting?.activities))
          ).length
        : usages.length > 0 ? 1 : 0;

      sponsorForCoupon = await tx.sponsors.findFirst({
        where: { name: { equals: coupon.company_name, mode: 'insensitive' } },
        select: { id: true, name: true },
      });
      if (sponsorForCoupon && returnedCouponRights > 0) {
        const quota = await tx.sponsor_quotas.findFirst({
          where: { sponsor_id: sponsorForCoupon.id, meeting_id: slip.meeting_id },
        });
        if (quota) {
          const usedSeats = Math.max(0, quota.used_seats - returnedCouponRights);
          await tx.sponsor_quotas.update({ where: { id: quota.id }, data: { used_seats: usedSeats } });
          // คูปองที่เปิดใช้อยู่ออกตามสิทธิ์คงเหลือตอนออกรหัส: ปรับให้ตรงกับสิทธิ์คงเหลือใหม่
          const remaining = Math.max(0, quota.quota_seats - usedSeats);
          const active = await tx.coupons.findFirst({
            where: { company_name: { equals: coupon.company_name, mode: 'insensitive' }, is_active: true },
            orderBy: { created_at: 'desc' },
          });
          if (active && active.code !== SPONSOR_TEST_COUPON_CODE && active.used_count === 0 && remaining > 0) {
            await tx.coupons.update({ where: { id: active.id }, data: { max_uses: remaining } });
          }
        }
      }
    }

    // ── สิทธิ์เข้าร่วม ──
    for (const person of people) {
      if (otherRegistrants.has(person)) {
        keptAttendances++;
        continue;
      }
      const rawNo = person.memberNo.trim();
      const no = normalizeMemberNo(rawNo);
      const where = rawNo
        ? { meeting_id: slip.meeting_id, member_no: { in: [rawNo, no, no.padStart(4, '0')] } }
        : person.email
          ? { meeting_id: slip.meeting_id, member_no: null, attendee_email: { equals: person.email, mode: 'insensitive' as const } }
          : null;
      if (!where) continue;
      const res = await tx.meeting_attendances.updateMany({ where, data: { attendance_status: 'Cancelled' } });
      cancelledAttendances += res.count;
    }

    // ── รายชื่อในหน้าบริษัท ──
    if (slip.ticket_code) {
      const rows = await tx.sponsor_group_members.findMany({
        where: { ticket_code: slip.ticket_code, meeting_id: slip.meeting_id },
        select: { id: true, member_no: true, sponsor_id: true },
      });
      if (rows.length > 0) {
        await tx.sponsor_group_members.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
        for (const row of rows) {
          if (!row.member_no || !row.sponsor_id) continue;
          const remaining = await tx.sponsor_group_members.count({
            where: { member_no: row.member_no, sponsor_id: row.sponsor_id },
          });
          if (remaining === 0) {
            await tx.member.updateMany({
              where: { member_no: row.member_no, sponsor_id: row.sponsor_id },
              data: { sponsor_id: null, sponsored_by_company: null },
            });
          }
        }
      }
    }

    // ── สถานะรายการ ──
    const basePayload = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : { activities: Array.isArray(payload) ? payload : [] };
    await tx.payment_slips.update({
      where: { slip_id: slipId },
      data: {
        status: SLIP_CANCELLED_STATUS,
        resubmit_token: null,
        reviewed_by: reviewer,
        reviewed_at: new Date(),
        selected_activities: {
          ...basePayload,
          cancelledAt: new Date().toISOString(),
          cancelledBy: reviewer,
          cancelReason: reason || null,
          returnedCouponRights,
        },
      },
    });
  }, { timeout: 30000 });

  // ไม่มีคูปองที่เปิดใช้อยู่แต่มีสิทธิ์คงเหลือแล้ว: ออกรหัสใหม่ให้บริษัท
  if (sponsorForCoupon && returnedCouponRights > 0) {
    try {
      await ensureActiveSponsorCoupon(sponsorForCoupon);
    } catch (err) {
      console.error('[CancelSlip] Failed to ensure active sponsor coupon:', err);
    }
  }

  return { slipId, ticketCode: slip.ticket_code, returnedCouponRights, cancelledAttendances, keptAttendances };
}
