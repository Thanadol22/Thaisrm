/**
 * สถานะการลงทะเบียนกลางของทั้งระบบ (แก้ชื่อสถานะที่นี่ที่เดียว ทุกหน้าดึงไปใช้)
 *
 * หลักการ:
 * - ยังไม่อนุมัติ  → "รอตรวจสอบ"
 * - อนุมัติแล้ว    → "ลงทะเบียนสำเร็จ" (ใบสมัครสมาชิกใช้ "สมัครสมาชิกสำเร็จ" ผ่าน kind = 'membership')
 * - สถานะย่อยต่อท้ายคำหลักเสมอ เช่น "ลงทะเบียนสำเร็จ รอชำระเงิน"
 *
 * สถานะของสลิป (payment_slips.status) คือแหล่งความจริงของการอนุมัติ
 * ส่วน meeting_attendances.attendance_status ถูกบันทึกเป็น Registered ตั้งแต่ส่งรายการ
 * จึงต้องใช้ deriveRegistrationStatus() เมื่อมีสถานะสลิป เพื่อไม่ให้แสดง "ลงทะเบียนสำเร็จ" ก่อนอนุมัติ
 */

export type RegistrationStatusKey =
  | 'pending'                      // รอตรวจสอบ
  | 'pending_pay_later'            // รอตรวจสอบ ชำระเงินภายหลัง
  | 'pending_payment_review'       // รอตรวจสอบ แนบสลิปแล้ว
  | 'registered'                   // ลงทะเบียนสำเร็จ
  | 'registered_awaiting_payment'  // ลงทะเบียนสำเร็จ รอชำระเงิน
  | 'attended'                     // เข้าร่วมแล้ว
  | 'rejected'                     // ไม่อนุมัติ
  | 'cancelled';                   // ยกเลิกแล้ว

export type RegistrationStatusTone = 'amber' | 'sky' | 'emerald' | 'orange' | 'teal' | 'rose' | 'slate';

export const REGISTRATION_STATUS: Record<RegistrationStatusKey, { th: string; en: string; tone: RegistrationStatusTone }> = {
  pending: { th: 'รอตรวจสอบ', en: 'Pending review', tone: 'amber' },
  pending_pay_later: { th: 'รอตรวจสอบ ชำระเงินภายหลัง', en: 'Pending review, pay later', tone: 'amber' },
  pending_payment_review: { th: 'รอตรวจสอบ แนบสลิปแล้ว', en: 'Pending review, slip attached', tone: 'sky' },
  registered: { th: 'ลงทะเบียนสำเร็จ', en: 'Registered', tone: 'emerald' },
  registered_awaiting_payment: { th: 'ลงทะเบียนสำเร็จ รอชำระเงิน', en: 'Registered, awaiting payment', tone: 'orange' },
  attended: { th: 'เข้าร่วมแล้ว', en: 'Attended', tone: 'teal' },
  rejected: { th: 'ไม่อนุมัติ', en: 'Rejected', tone: 'rose' },
  cancelled: { th: 'ยกเลิกแล้ว', en: 'Cancelled', tone: 'slate' },
};

/** คลาสสีของป้ายสถานะ (พื้นสว่าง) */
export const REGISTRATION_STATUS_BADGE: Record<RegistrationStatusTone, string> = {
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  sky: 'bg-sky-50 text-sky-800 border-sky-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  orange: 'bg-orange-50 text-orange-800 border-orange-200',
  teal: 'bg-teal-50 text-teal-800 border-teal-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};

/** คลาสสีของป้ายสถานะ (พื้นเข้ม) */
export const REGISTRATION_STATUS_BADGE_DARK: Record<RegistrationStatusTone, string> = {
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  sky: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  orange: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  teal: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
  rose: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  slate: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
};

/** ประเภทรายการ: ลงทะเบียนประชุม หรือ สมัครสมาชิก (ใช้คำของสถานะอนุมัติแล้วต่างกัน) */
export type RegistrationStatusKind = 'registration' | 'membership';

/** คำแทนสำหรับใบสมัครสมาชิก (สถานะที่ไม่ได้ระบุใช้คำเดียวกับการลงทะเบียน) */
const MEMBERSHIP_STATUS_OVERRIDE: Partial<Record<RegistrationStatusKey, { th: string; en: string }>> = {
  registered: { th: 'สมัครสมาชิกสำเร็จ', en: 'Membership approved' },
  registered_awaiting_payment: { th: 'สมัครสมาชิกสำเร็จ รอชำระเงิน', en: 'Membership approved, awaiting payment' },
};

export function registrationStatusLabel(
  key: RegistrationStatusKey,
  lang: 'th' | 'en' = 'th',
  kind: RegistrationStatusKind = 'registration'
): string {
  const override = kind === 'membership' ? MEMBERSHIP_STATUS_OVERRIDE[key] : undefined;
  return (override || REGISTRATION_STATUS[key])[lang];
}

export function registrationStatusBadge(key: RegistrationStatusKey, dark = false): string {
  return (dark ? REGISTRATION_STATUS_BADGE_DARK : REGISTRATION_STATUS_BADGE)[REGISTRATION_STATUS[key].tone];
}

/** แปลงค่าสถานะดิบจากฐานข้อมูล (สลิปหรือการเข้าร่วม) เป็นสถานะกลาง */
export function normalizeRegistrationStatus(raw: string | null | undefined): RegistrationStatusKey | null {
  const s = String(raw || '').trim().toLowerCase();
  if (s in REGISTRATION_STATUS) return s as RegistrationStatusKey;
  switch (s) {
    case 'pending':
    case 'pending_review':
    case 'non-member-pending':
    case 'pending_payment':
    case 'รอตรวจสอบ':
    case 'รออนุมัติ':
      return 'pending';
    case 'awaiting_payment':
    case 'pay_later':
      return 'pending_pay_later';
    case 'pending_payment_review':
      return 'pending_payment_review';
    case 'approved':
    case 'confirmed':
    case 'registered':
    case 'non-member':
      return 'registered';
    case 'approved_awaiting_payment':
      return 'registered_awaiting_payment';
    case 'attended':
    case 'checked_in':
    case 'checked-in':
      return 'attended';
    case 'rejected':
      return 'rejected';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    default:
      return null;
  }
}

/**
 * สถานะของผู้ลงทะเบียน: ใช้สถานะสลิปเป็นหลัก (ยังไม่อนุมัติ = รอตรวจสอบ)
 * เมื่อสลิปอนุมัติแล้ว หรือไม่มีสลิป (เช่น ใช้โควต้าบริษัท) จึงใช้สถานะการเข้าร่วม
 */
export function deriveRegistrationStatus(input: {
  slipStatus?: string | null;
  attendanceStatus?: string | null;
}): RegistrationStatusKey {
  const slip = normalizeRegistrationStatus(input.slipStatus);
  const att = normalizeRegistrationStatus(input.attendanceStatus);
  if (slip && slip !== 'registered') return slip;
  if (att === 'attended' || att === 'cancelled' || att === 'rejected') return att;
  if (!slip && att === 'pending') return 'pending';
  return 'registered';
}
