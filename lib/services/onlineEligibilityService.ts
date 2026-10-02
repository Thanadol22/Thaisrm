import prisma from '@/lib/prisma';

/**
 * การเข้าร่วมการประชุมหลักแบบออนไลน์สงวนสิทธิ์เฉพาะสมาชิกสถานะปกติ
 * ตรวจสถานะจากฐานข้อมูลเท่านั้น — ไม่เชื่อค่า isMember จากฝั่งผู้ใช้
 */
export const ONLINE_MEMBERS_ONLY_MESSAGE =
  'การเข้าร่วมการประชุมหลักแบบออนไลน์สงวนสิทธิ์เฉพาะสมาชิกสมาคมฯ ที่มีสถานะปกติ กรุณาเปลี่ยนเป็นเข้าร่วมที่งาน';

const isMainAct = (a: any) => a?.type === 'main' || a?.id === 'main';

/** ผู้ลงทะเบียนเลือกเข้าร่วมการประชุมหลักแบบออนไลน์หรือไม่ (ไม่มีรายการกิจกรรม = ถือว่าลงการประชุมหลัก) */
export function wantsOnlineMain(attendanceType: unknown, activities: any[]): boolean {
  if (activities.length === 0) return attendanceType === 'online';
  return activities.some(
    (a) => isMainAct(a) && (a?.format === 'online' || (attendanceType === 'online' && a?.format !== 'onsite'))
  );
}

export async function isActiveMemberNo(rawNo: unknown): Promise<boolean> {
  const no = String(rawNo || '').trim();
  if (!no) return false;
  const member = await prisma.member.findFirst({
    where: { OR: [{ member_no: no }, { member_no: no.padStart(4, '0') }, { member_no: no.replace(/^0+/, '') }] },
    select: { membership_status: true },
  });
  if (!member) return false;
  const status = String(member.membership_status || '').toLowerCase().trim();
  return status === '' || status === 'active';
}
