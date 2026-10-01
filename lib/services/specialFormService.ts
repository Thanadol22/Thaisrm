import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { resolveAttendeeActivities } from '@/lib/services/sponsorCouponService';

/**
 * ฟอร์มเฉพาะ (เช่น ราคา fellow)
 * - แอดมินเลือกกิจกรรมของงานประชุมที่จะเปิดในฟอร์ม ตั้งชื่อรายการและราคาเอง (3 ราคา แบบเดียวกับ pricing_tiers)
 * - ที่นั่งใช้จำนวนที่นั่งของกิจกรรมเดิม
 * - การลงทะเบียนบันทึกเป็นรายการกลุ่มใน payment_slips (selected_activities.specialFormId)
 */

export interface SpecialFormItem {
  /** id ของกิจกรรมใน meetings.activities */
  activityId: string;
  /** ชื่อรายการที่แสดงในฟอร์ม */
  label: string;
  onsiteMember: number;
  onsiteNonMember: number;
  /** ราคาออนไลน์ (เฉพาะสมาชิก เหมือนการลงทะเบียนปกติ) */
  online: number;
}

export const SPECIAL_FORM_TYPES: Record<string, string> = {
  fellow: 'ราคา fellow',
  special: 'ราคาพิเศษ',
};

const toPrice = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));

export function parseSpecialFormItems(raw: unknown): SpecialFormItem[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((i: any) => i && typeof i === 'object' && String(i.activityId || '').trim())
    .map((i: any) => ({
      activityId: String(i.activityId).trim(),
      label: String(i.label || '').trim().slice(0, 255),
      onsiteMember: toPrice(i.onsiteMember),
      onsiteNonMember: toPrice(i.onsiteNonMember),
      online: toPrice(i.online),
    }));
}

export function newSpecialFormSlug(): string {
  return crypto.randomBytes(9).toString('base64url');
}

export function isSpecialFormOpen(form: { is_open: boolean; close_at: Date | null }): boolean {
  return form.is_open && (!form.close_at || form.close_at.getTime() > Date.now());
}

const isMainActivity = (a: any) => a?.type === 'main' || a?.id === 'main';

/**
 * งานประชุมในมุมมองของฟอร์มเฉพาะ: เหลือเฉพาะกิจกรรมที่เปิดในฟอร์ม ชื่อและราคาตามที่แอดมินตั้ง
 * ฟอร์มลงทะเบียนและหน้าชำระเงินเดิมคำนวณราคาจากข้อมูลชุดนี้ได้ทันที
 * (การประชุมหลักใช้ pricing_tiers.participant / เวิร์กช็อปใช้ memberPrice, nonMemberPrice)
 */
export function buildSpecialFormMeeting(meeting: any, items: SpecialFormItem[]) {
  const acts: any[] = Array.isArray(meeting?.activities) ? meeting.activities : [];
  const byId = new Map(items.map((i) => [i.activityId, i]));
  const activities = acts
    .filter((a) => byId.has(String(a?.id)))
    .map((a) => {
      const item = byId.get(String(a.id))!;
      return {
        ...a,
        name: item.label || a.name,
        originalName: a.name,
        memberPrice: item.onsiteMember,
        nonMemberPrice: item.onsiteNonMember,
        priceTier: 'special',
      };
    });
  const mainItem = acts.filter(isMainActivity).map((a) => byId.get(String(a.id))).find(Boolean);
  const tiers = (meeting?.pricing_tiers && typeof meeting.pricing_tiers === 'object' ? meeting.pricing_tiers : {}) as any;
  return {
    ...meeting,
    activities,
    pricing_tiers: {
      ...tiers,
      participant: mainItem
        ? {
            onsiteMember: mainItem.onsiteMember,
            onsiteNonMember: mainItem.onsiteNonMember,
            onlineMember: mainItem.online,
            onlineNonMember: mainItem.online,
          }
        : tiers.participant,
    },
  };
}

export async function getSpecialFormBySlug(slug: string) {
  if (!slug || slug.length > 50) return null;
  return prisma.special_forms.findUnique({ where: { slug } });
}

export async function isSponsorAllowedForForm(formId: string, sponsorId: string): Promise<boolean> {
  const row = await prisma.special_form_sponsors.findUnique({
    where: { form_id_sponsor_id: { form_id: formId, sponsor_id: sponsorId } },
    select: { id: true },
  });
  return Boolean(row);
}

/** บริษัทตามอีเมลตัวแทน ที่มีสิทธิ์เข้าฟอร์มนี้ (ไม่พบ = ไม่มีสิทธิ์) */
export async function findAllowedSponsorByEmail(formId: string, email: string) {
  const sponsor = await prisma.sponsors.findFirst({
    where: { contact_email: { equals: email, mode: 'insensitive' }, is_active: true },
  });
  if (!sponsor) return null;
  return (await isSponsorAllowedForForm(formId, sponsor.id)) ? sponsor : null;
}

export interface PricedAttendee {
  index: number;
  price: number;
  originalTotal: number;
  discountTotal: number;
  attendanceType: 'onsite' | 'online';
}

export class SpecialFormPricingError extends Error {}

/**
 * คำนวณราคาผู้ลงทะเบียนตามฟอร์มเฉพาะฝั่งเซิร์ฟเวอร์ (ไม่เชื่อราคาจากหน้าเว็บ)
 * เกณฑ์เดียวกับหน้าชำระเงินแบบกลุ่ม: ออนไลน์ได้เฉพาะสมาชิก, คูปองฟรีให้สมาชิกตามลำดับการกรอกข้อมูล
 * และครอบคลุมเฉพาะการประชุมหลัก
 */
export async function priceSpecialFormAttendees(params: {
  meeting: any;
  items: SpecialFormItem[];
  attendees: any[];
  coupon: { discount_type: string; max_uses: number; used_count: number; remarks?: string | null } | null;
  freeSeatsLimit: number | null;
}): Promise<PricedAttendee[]> {
  const { meeting, items, attendees, coupon } = params;
  const byId = new Map(items.map((i) => [i.activityId, i]));
  const meetingActs: any[] = Array.isArray(meeting?.activities) ? meeting.activities : [];
  const isFreeCoupon = coupon && String(coupon.discount_type).toLowerCase() === 'free';
  let freeLeft = isFreeCoupon ? Math.max(0, coupon!.max_uses - coupon!.used_count) : 0;
  if (params.freeSeatsLimit !== null) freeLeft = Math.min(freeLeft, Math.max(0, params.freeSeatsLimit));

  const result: PricedAttendee[] = [];
  for (let idx = 0; idx < attendees.length; idx++) {
    const att = attendees[idx];
    const label = `ผู้ลงทะเบียนลำดับที่ ${idx + 1}`;
    const requested = resolveAttendeeActivities(att, meetingActs);
    if (requested.length === 0) throw new SpecialFormPricingError(`${label}: กรุณาเลือกรายการอย่างน้อย 1 รายการ`);
    for (const a of requested) {
      if (!byId.has(String(a?.id))) throw new SpecialFormPricingError(`${label}: รายการ ${a?.name || a?.id} ไม่ได้เปิดในฟอร์มนี้`);
    }

    // สถานะสมาชิกตรวจจากฐานข้อมูลเท่านั้น
    const rawNo = String(att.memberNo || '').trim();
    const member = rawNo
      ? await prisma.member.findFirst({
          where: { OR: [{ member_no: rawNo }, { member_no: rawNo.padStart(4, '0') }] },
          select: { membership_status: true },
        })
      : null;
    const status = String(member?.membership_status || '').toLowerCase().trim();
    const isMem = Boolean(member) && !att.isExpiredMember && (status === '' || status === 'active');

    const acts = requested.map((a: any) => meetingActs.find((m) => String(m.id) === String(a.id)) || a);
    const hasOnlineCapableMain = acts.some((a: any) => isMainActivity(a) && (a.format || 'both') !== 'onsite');
    const hasOnsiteOnly = acts.some((a: any) => (a.format || (a.type === 'workshop' ? 'onsite' : 'both')) === 'onsite');
    const onlineEligible = isMem && (!hasOnsiteOnly || hasOnlineCapableMain);
    const attendanceType: 'onsite' | 'online' = att.attendanceType === 'online' && onlineEligible ? 'online' : 'onsite';

    let originalTotal = 0;
    let mainPrice = 0;
    for (const a of acts) {
      const item = byId.get(String(a.id))!;
      const main = isMainActivity(a);
      const price = main && attendanceType === 'online' ? item.online : isMem ? item.onsiteMember : item.onsiteNonMember;
      originalTotal += price;
      if (main) mainPrice += price;
    }

    let discountTotal = 0;
    // เหมือนหน้าชำระเงิน: สมาชิกที่ถึงลำดับใช้สิทธิ์ 1 สิทธิ์ ได้ฟรีเฉพาะค่าการประชุมหลัก
    if (!att.isAddOn && isMem && freeLeft > 0) {
      discountTotal = mainPrice;
      freeLeft -= 1;
    }
    result.push({ index: idx, price: Math.max(0, originalTotal - discountTotal), originalTotal, discountTotal, attendanceType });
  }
  return result;
}
