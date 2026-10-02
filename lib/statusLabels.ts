import { normalizeRegistrationStatus, registrationStatusLabel } from '@/lib/registrationStatus';

// แปลงค่าสถานะ/ประเภทที่เก็บในฐานข้อมูล (ภาษาอังกฤษ) เป็นข้อความภาษาไทยสำหรับแสดงผลบนหน้าเว็บ
// สถานะการลงทะเบียน/การชำระเงินดึงจาก lib/registrationStatus.ts (แก้ชื่อสถานะที่นั่นที่เดียว)
const STATUS_LABELS_TH: Record<string, string> = {
  // สถานะสมาชิก
  active: 'ปกติ',
  inactive: 'หมดอายุ',
  expired: 'หมดอายุ',

  // ประเภทสมาชิก
  lifelong: 'สมาชิกตลอดชีพ',
  regular: 'สมาชิกสามัญ',

  // สถานะการชำระเงินที่ไม่ใช่สถานะการลงทะเบียน
  paid: 'ชำระแล้ว',
  unpaid: 'ยังไม่ชำระ',
  issued: 'ออกใบเสร็จแล้ว',
  free_quota: 'ใช้โควต้าฟรี',

  // สถานะงานประชุม
  upcoming: 'กำลังจะมาถึง',
  ongoing: 'กำลังดำเนินการ',
  completed: 'เสร็จสิ้น',
};

export function statusLabelTh(value: string | null | undefined, fallback = '-'): string {
  if (!value) return fallback;
  const key = value.trim().toLowerCase();
  if (STATUS_LABELS_TH[key]) return STATUS_LABELS_TH[key];
  const reg = normalizeRegistrationStatus(key);
  return reg ? registrationStatusLabel(reg) : value;
}
