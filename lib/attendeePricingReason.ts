/**
 * อธิบายว่าทำไมผู้ลงทะเบียนในรายการกลุ่มได้ราคานี้ (สมาชิกหมดอายุ / ไม่ใช่สมาชิก / ใช้คูปอง ฯลฯ)
 * ใช้ข้อมูลที่บันทึกไว้ตอนลงทะเบียนใน selected_activities.attendees[] เพื่อให้ผู้ตรวจเห็นเหตุผลตรงกับระบบ
 */
export type AttendeePricingKind = 'coupon' | 'member' | 'expired' | 'non_member' | 'add_on';

export interface AttendeePricingReason {
  kind: AttendeePricingKind;
  /** ป้ายสั้นสำหรับแสดงแทนสถานะสมาชิก */
  badge: string;
  /** ประโยคอธิบายเหตุผลของราคา */
  reason: string;
  tone: 'emerald' | 'blue' | 'rose' | 'amber' | 'slate';
}

export function isExpiredAttendee(att: any): boolean {
  if (!att) return false;
  return Boolean(att.isExpiredMember) || String(att.memberStatus || '').toLowerCase() === 'expired';
}

export function isActiveMemberAttendee(att: any): boolean {
  if (!att || isExpiredAttendee(att)) return false;
  const status = String(att.memberStatus || '').toLowerCase();
  if (status === 'non_member') return false;
  return Boolean(att.isMember || String(att.memberNo || att.member_no || '').trim());
}

export function getAttendeePricingReason(
  att: any,
  opts: { discount?: number; couponCode?: string | null; lang?: 'th' | 'en'; audience?: 'admin' | 'sponsor' } = {}
): AttendeePricingReason {
  const th = (opts.lang || 'th') === 'th';
  const forAdmin = (opts.audience || 'admin') === 'admin';
  const memberNo = String(att?.memberNo || att?.member_no || '').trim();
  const discount = Number(opts.discount) || 0;
  const hasCoupon = Boolean(opts.couponCode);
  const noCouponTh = hasCoupon ? ' และไม่ได้รับสิทธิ์คูปองบริษัท' : '';
  const noCouponEn = hasCoupon ? ', not eligible for the company coupon' : '';

  if (att?.isAddOn) {
    return {
      kind: 'add_on',
      badge: th ? 'ลงเพิ่ม' : 'Add-on',
      reason: discount > 0
        ? (th
          ? `ลงทะเบียนเพิ่มจากรายการเดิม คิดราคาเฉพาะรายการที่เพิ่ม และใช้สิทธิ์คูปองบริษัทกับการประชุมหลัก ลด ${discount.toLocaleString()} บาท`
          : `Add-on to an existing registration; only the added items are charged, with the company coupon applied to the Main Program (-${discount.toLocaleString()} THB)`)
        : (th
          ? 'ลงทะเบียนเพิ่มจากรายการเดิม คิดราคาเฉพาะรายการที่เพิ่ม และไม่ใช้สิทธิ์คูปองบริษัท'
          : 'Add-on to an existing registration; only the added items are charged and the company coupon does not apply'),
      tone: 'slate',
    };
  }

  if (isExpiredAttendee(att)) {
    return {
      kind: 'expired',
      badge: th ? `สมาชิกหมดอายุ${memberNo ? ` #${memberNo}` : ''}` : `Expired member${memberNo ? ` #${memberNo}` : ''}`,
      reason: th
        ? `ณ วันที่ลงทะเบียน สถานะสมาชิกไม่ใช่ปกติ จึงคิดราคาบุคคลทั่วไป${noCouponTh}${forAdmin ? ' หากต่ออายุแล้วให้แก้สถานะสมาชิกก่อน แล้วแก้ราคาในรายการนี้' : ' หากต่ออายุสมาชิกแล้ว กรุณาติดต่อสมาคมเพื่อปรับราคา'}`
        : `Membership was not active at registration, so the non-member rate applies${noCouponEn}. ${forAdmin ? "If renewed, update the member status first, then edit this attendee's price." : 'If the membership has been renewed, please contact the association to adjust the price.'}`,
      tone: 'rose',
    };
  }

  if (!isActiveMemberAttendee(att)) {
    return {
      kind: 'non_member',
      badge: th ? 'บุคคลทั่วไป' : 'Non-member',
      reason: th
        ? `ไม่ได้ระบุเลขสมาชิก จึงคิดราคาบุคคลทั่วไป${noCouponTh}`
        : `No member number given, so the non-member rate applies${noCouponEn}`,
      tone: 'amber',
    };
  }

  if (discount > 0) {
    return {
      kind: 'coupon',
      badge: th ? `สมาชิก #${memberNo}` : `Member #${memberNo}`,
      reason: th
        ? `สมาชิกสถานะปกติ ได้รับส่วนลดจากคูปองบริษัท ฿${discount.toLocaleString()}`
        : `Active member, company coupon discount ฿${discount.toLocaleString()}`,
      tone: 'emerald',
    };
  }

  return {
    kind: 'member',
    badge: th ? `สมาชิก #${memberNo}` : `Member #${memberNo}`,
    reason: th
      ? `สมาชิกสถานะปกติ คิดราคาสมาชิก${hasCoupon ? ' ไม่มีส่วนลดคูปองสำหรับรายการที่เลือก' : ''}`
      : `Active member rate${hasCoupon ? '; the coupon does not cover the selected items' : ''}`,
    tone: 'blue',
  };
}

const PRICING_KIND_TONE: Record<AttendeePricingKind, AttendeePricingReason['tone']> = {
  coupon: 'emerald',
  member: 'blue',
  expired: 'rose',
  non_member: 'amber',
  add_on: 'slate',
};

export function getPricingTone(kind: AttendeePricingKind): AttendeePricingReason['tone'] {
  return PRICING_KIND_TONE[kind];
}

/** ป้ายสั้นของเหตุผลราคา สำหรับตาราง สรุป และไฟล์ Excel */
export const PRICING_KIND_LABEL_TH: Record<AttendeePricingKind, string> = {
  coupon: 'ใช้คูปองบริษัท',
  member: 'ราคาสมาชิก',
  expired: 'สมาชิกหมดอายุ คิดราคาบุคคลทั่วไป',
  non_member: 'ไม่ใช่สมาชิก คิดราคาบุคคลทั่วไป',
  add_on: 'ลงเพิ่ม',
};

export const PRICING_TONE_CLASSES: Record<AttendeePricingReason['tone'], { badge: string; note: string }> = {
  emerald: { badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', note: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  blue: { badge: 'bg-blue-50 text-[#0026b3] border-blue-200', note: 'bg-blue-50/70 text-blue-900 border-blue-100' },
  rose: { badge: 'bg-rose-50 text-rose-700 border-rose-200', note: 'bg-rose-50 text-rose-800 border-rose-200' },
  amber: { badge: 'bg-amber-50 text-amber-800 border-amber-200', note: 'bg-amber-50 text-amber-900 border-amber-200' },
  slate: { badge: 'bg-slate-100 text-slate-700 border-slate-200', note: 'bg-slate-50 text-slate-700 border-slate-200' },
};
