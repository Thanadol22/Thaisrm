import prisma from '@/lib/prisma';

// รหัสทดสอบที่ใช้ซ้ำได้ ไม่ต้องหมุนรหัสใหม่
export const SPONSOR_TEST_COUPON_CODE = 'T34-TEST-111111';

const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

interface SponsorRef {
  id: string;
  name: string;
}

export interface SponsorCouponResult {
  coupon: any | null;
  remainingQuota: number;
  totalQuota: number;
  meetingName: string | null;
}

const MAIN_PROGRAM_LABELS = ['การประชุมหลัก', 'main program', 'main congress', 'main'];

const normalizeProgramName = (name: unknown) =>
  String(name || '').replace(/\s*\(Main Congress\)/gi, '').trim().toLowerCase();

const isMainActivity = (act: any) => act?.type === 'main' || act?.id === 'main';

/**
 * โปรแกรมที่คูปองครอบคลุม (เก็บใน remarks เป็น JSON จากหน้าจัดการคูปอง)
 * ไม่มีข้อมูล = ครอบคลุมเฉพาะการประชุมหลัก
 */
export function getCouponProgramScope(remarks: string | null | undefined): { all: boolean; programs: string[] } {
  if (remarks && remarks.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(remarks);
      if (parsed?.allPrograms === true) return { all: true, programs: [] };
      if (Array.isArray(parsed?.programs) && parsed.programs.length > 0) {
        return { all: false, programs: parsed.programs.map(normalizeProgramName).filter(Boolean) };
      }
    } catch {
      // remarks ไม่ใช่ JSON ใช้ค่าเริ่มต้น
    }
  }
  return { all: false, programs: [MAIN_PROGRAM_LABELS[0]] };
}

/**
 * ตรวจว่ารายการที่ลงทะเบียนมีโปรแกรมที่คูปองครอบคลุมหรือไม่
 * activities ว่าง = ลงเฉพาะการประชุมหลัก
 */
export function isCouponApplicableToActivities(
  coupon: { remarks?: string | null },
  activities: any[] | null | undefined
): boolean {
  const scope = getCouponProgramScope(coupon.remarks);
  if (scope.all) return true;

  const list = Array.isArray(activities) && activities.length > 0 ? activities : [{ id: 'main', type: 'main' }];
  const coversMain = scope.programs.some((p) => MAIN_PROGRAM_LABELS.includes(p));
  return list.some((act) => {
    if (isMainActivity(act) && coversMain) return true;
    const name = normalizeProgramName(act?.name);
    return Boolean(name) && scope.programs.includes(name);
  });
}

/**
 * รายการโปรแกรมของผู้ลงทะเบียนในกลุ่ม: ใช้ selectedActivities ก่อน หากไม่มีจึงแปลงจาก selectedProgramIds
 */
export function resolveAttendeeActivities(att: any, meetingActivities: unknown): any[] {
  const own = att?.activities || att?.selectedActivities;
  if (Array.isArray(own) && own.length > 0 && typeof own[0] === 'object') return own;

  const ids: string[] = att?.selectedProgramIds || att?.selectedPrograms || [];
  const acts = Array.isArray(meetingActivities) ? (meetingActivities as any[]) : [];
  if (ids.length > 0 && acts.length > 0) return acts.filter((a) => ids.includes(a?.id));
  return [];
}

function buildCouponPrefix(companyName: string): string {
  const words = (companyName || '').toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0].slice(0, 2) + words[1].slice(0, 1)).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return 'SPN';
}

async function generateUniqueCouponCode(companyName: string): Promise<string> {
  const prefix = buildCouponPrefix(companyName);
  for (let attempt = 0; attempt < 10; attempt++) {
    let token = '';
    for (let i = 0; i < 6; i++) {
      token += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
    const code = `T34-${prefix}-${token}`;
    const dup = await prisma.coupons.findUnique({ where: { code } });
    if (!dup) return code;
  }
  return `T34-${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

/**
 * คืนคูปองที่ใช้งานได้ปัจจุบันของบริษัท (ระบบ 1 คูปอง / 1 ครั้ง)
 * - คูปองล่าสุดยังไม่เคยถูกใช้ -> ใช้รหัสเดิม
 * - คูปองล่าสุดถูกใช้แล้ว หรือถูกปิดหลังใช้งาน -> ปิดรหัสเดิม (เก็บประวัติไว้) แล้วออกรหัสใหม่ตามสิทธิ์คงเหลือ
 * - สิทธิ์คงเหลือหมด -> ไม่มีคูปอง
 */
export async function ensureActiveSponsorCoupon(sponsor: SponsorRef): Promise<SponsorCouponResult> {
  const activeCoupon = await prisma.coupons.findFirst({
    where: { company_name: { equals: sponsor.name, mode: 'insensitive' }, is_active: true },
    include: { meetings: { select: { meeting_name: true } } },
    orderBy: { created_at: 'desc' },
  });

  // ไม่มีรหัสที่เปิดอยู่ ใช้รหัสล่าสุด (ที่ถูกปิดหลังใช้งาน) เป็นต้นแบบในการออกรหัสใหม่
  const template =
    activeCoupon ||
    (await prisma.coupons.findFirst({
      where: { company_name: { equals: sponsor.name, mode: 'insensitive' } },
      include: { meetings: { select: { meeting_name: true } } },
      orderBy: { created_at: 'desc' },
    }));

  if (!template) {
    return { coupon: null, remainingQuota: 0, totalQuota: 0, meetingName: null };
  }

  const quota =
    (await prisma.sponsor_quotas.findFirst({
      where: { sponsor_id: sponsor.id, meeting_id: template.meeting_id },
    })) ||
    (await prisma.sponsor_quotas.findFirst({
      where: { sponsor_id: sponsor.id },
      orderBy: { created_at: 'desc' },
    }));

  const totalQuota = quota?.quota_seats || template.max_uses || 0;
  const usedSeats = quota ? quota.used_seats : template.used_count || 0;
  const remainingQuota = Math.max(0, totalQuota - usedSeats);
  const meetingName = template.meetings?.meeting_name || null;

  if (remainingQuota <= 0) {
    return { coupon: null, remainingQuota: 0, totalQuota, meetingName };
  }

  if (activeCoupon && (activeCoupon.code === SPONSOR_TEST_COUPON_CODE || activeCoupon.used_count === 0)) {
    return { coupon: activeCoupon, remainingQuota, totalQuota, meetingName };
  }

  const newCode = await generateUniqueCouponCode(sponsor.name);
  const newCoupon = await prisma.$transaction(async (tx) => {
    if (activeCoupon) {
      // ปิดรหัสเดิม โดยคง max_uses / used_count ไว้เป็นประวัติการใช้สิทธิ์
      await tx.coupons.update({
        where: { id: activeCoupon.id },
        data: { is_active: false },
      });
    }
    return tx.coupons.create({
      data: {
        code: newCode,
        company_name: sponsor.name,
        meeting_id: template.meeting_id,
        discount_type: template.discount_type || 'free',
        discount_value: template.discount_value || 0,
        applicable_type: template.applicable_type || 'all',
        max_uses: remainingQuota,
        used_count: 0,
        expire_date: template.expire_date,
        is_active: true,
        remarks: template.remarks,
      },
      include: { meetings: { select: { meeting_name: true } } },
    });
  });

  return { coupon: newCoupon, remainingQuota, totalQuota, meetingName };
}

/**
 * เรียกหลังบันทึกการใช้คูปองสำเร็จ: หากเป็นคูปองของบริษัทสปอนเซอร์ ให้ปิดรหัสที่เพิ่งใช้
 * แล้วออกรหัสใหม่สำหรับสิทธิ์คงเหลือทันที (1 คูปอง / 1 ครั้ง)
 */
export async function retireUsedSponsorCoupon(
  couponCode: string | null | undefined,
  options: { deductQuotaSeats?: number; meetingId?: string } = {}
): Promise<void> {
  const code = (couponCode || '').trim().toUpperCase();
  if (!code) return;

  const coupon = await prisma.coupons.findUnique({ where: { code } });
  if (!coupon) return;

  const sponsor = await prisma.sponsors.findFirst({
    where: { name: { equals: coupon.company_name, mode: 'insensitive' } },
    select: { id: true, name: true },
  });
  // คูปองทั่วไปที่ไม่ได้ผูกกับบริษัทสปอนเซอร์ ใช้ตามโควต้า max_uses ตามเดิม
  if (!sponsor) return;

  // ตัดสิทธิ์จากโควต้าบริษัท (กรณีเส้นทางที่ยังไม่ได้หักโควต้าเอง)
  if (options.deductQuotaSeats && options.deductQuotaSeats > 0) {
    await prisma.sponsor_quotas.updateMany({
      where: { sponsor_id: sponsor.id, meeting_id: options.meetingId || coupon.meeting_id },
      data: { used_seats: { increment: options.deductQuotaSeats } },
    });
  }

  if (code === SPONSOR_TEST_COUPON_CODE) return;

  if (coupon.is_active) {
    await prisma.coupons.update({ where: { id: coupon.id }, data: { is_active: false } });
  }
  await ensureActiveSponsorCoupon(sponsor);
}
