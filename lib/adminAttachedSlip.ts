/**
 * สลิปที่แอดมินแนบไว้ล่วงหน้า (ยังไม่อนุมัติการชำระเงิน) เก็บใน payment_slips.slip_url
 * ด้วย prefix "TEMP_" ซึ่งทุกจุดที่ตรวจว่ามีสลิปจริงถือว่ายังไม่มีสลิป สถานะจึงคงเดิม
 * เมื่อกดอนุมัติ ระบบจะตัด prefix ออก ทำให้กลายเป็นสลิปจริง = ชำระเงินเรียบร้อย
 */
export const ADMIN_ATTACHED_SLIP_PREFIX = 'TEMP_ADMIN_SLIP:';

export function toAdminAttachedSlipUrl(url: string): string {
  return `${ADMIN_ATTACHED_SLIP_PREFIX}${url}`;
}

/** คืน URL สลิปที่แอดมินแนบไว้และยังรออนุมัติ หรือ null ถ้าไม่ใช่ */
export function getAdminAttachedSlipUrl(slipUrl?: string | null): string | null {
  if (!slipUrl || !slipUrl.startsWith(ADMIN_ATTACHED_SLIP_PREFIX)) return null;
  return slipUrl.slice(ADMIN_ATTACHED_SLIP_PREFIX.length) || null;
}
