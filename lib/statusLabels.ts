// แปลงค่าสถานะ/ประเภทที่เก็บในฐานข้อมูล (ภาษาอังกฤษ) เป็นข้อความภาษาไทยสำหรับแสดงผลบนหน้าเว็บ
const STATUS_LABELS_TH: Record<string, string> = {
  // สถานะสมาชิก
  active: 'ปกติ',
  inactive: 'หมดอายุ',
  expired: 'หมดอายุ',
  'non-member': 'บุคคลทั่วไป',
  'non-member-pending': 'บุคคลทั่วไป (รอตรวจสอบ)',

  // ประเภทสมาชิก
  lifelong: 'สมาชิกตลอดชีพ',
  regular: 'สมาชิกสามัญ',

  // สถานะการเข้าร่วมประชุม
  registered: 'ลงทะเบียนแล้ว',
  attended: 'เข้าร่วมแล้ว',
  'checked-in': 'เช็คอินแล้ว',
  checked_in: 'เช็คอินแล้ว',
  confirmed: 'ยืนยันสิทธิ์แล้ว',
  cancelled: 'ยกเลิกแล้ว',

  // สถานะการชำระเงิน / สลิป
  pending: 'รอตรวจสอบ',
  pending_review: 'รอตรวจสอบ',
  pending_payment: 'รอชำระเงิน',
  pending_payment_review: 'รอตรวจสอบการชำระเงิน',
  awaiting_payment: 'รอชำระเงิน',
  approved_awaiting_payment: 'อนุมัติแล้ว รอชำระเงิน',
  pay_later: 'ชำระภายหลัง',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
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
  return STATUS_LABELS_TH[value.trim().toLowerCase()] ?? value;
}
