import prisma from '@/lib/prisma';
import { attendeeBackdatedCharges, resolveAttendeeActivities } from '@/lib/services/sponsorCouponService';
import { ADD_ON_MERGED_STATUS } from '@/lib/services/registrationAddOnService';

// ประวัติการลงทะเบียนของบริษัท แตกทุกบิลเป็นรายผู้เข้าร่วม
// ใช้ร่วมกันระหว่างหน้าประวัติการลงทะเบียนของบริษัทและการส่งอีเมลประวัติ/แจ้งค้างชำระ

const NO_SLIP_URLS = new Set(['PAY_LATER', 'pay_later_pending', '/placeholder-slip.png', 'GROUP_REGISTRATION', 'GROUP_MEMBERSHIP']);

export interface SponsorRegistrationRow {
  key: string;
  billNo: string;
  slipId: string | null;
  billDate: Date;
  billAmount: number;
  billCount: number;
  billStatus: string;
  billStatusLabel: string;
  billType: string;
  company: string;
  /** อีเมลผู้ส่งบิล (ใช้จับคู่บิลกับบริษัทเหมือนหน้าพอร์ทัลบริษัท) */
  guestEmail: string;
  /** มีเฉพาะรายการที่ลงผ่านโควต้าบริษัท */
  sponsorId: string | null;
  /** บิลชำระภายหลังที่ยังไม่ได้แนบสลิป */
  isOutstanding: boolean;
  couponCode: string | null;
  meetingId: string;
  meetingName: string;
  seq: number;
  memberNo: string;
  name: string;
  email: string;
  phone: string;
  programs: string;
  format: string;
  isAddOn: boolean;
  isFellow: boolean;
  discount: number;
  netPrice: number;
  attendanceStatus: string | null;
  ticketCode?: string | null;
}

/** สถานะการชำระเงินของบิล (ใช้เกณฑ์เดียวกับหน้าบริษัทสปอนเซอร์)
 * outstanding: บิลชำระภายหลังที่ยังไม่แนบสลิป (ตรงกับรายการที่พอร์ทัลบริษัทขอให้แนบสลิป) */
function billStatus(s: any): { key: string; label: string; outstanding: boolean } {
  const url: string = s.slip_url || '';
  const hasActualSlip = Boolean(url) && !NO_SLIP_URLS.has(url) && !url.startsWith('TEMP_');
  const isPayLater =
    url === 'PAY_LATER' ||
    url === 'pay_later_pending' ||
    (typeof s.bank === 'string' && (s.bank.includes('ชำระเงินภายหลัง') || s.bank.toLowerCase().includes('pay later')));

  if (s.status === 'rejected') return { key: 'rejected', label: 'ถูกปฏิเสธ', outstanding: false };
  if (Number(s.amount) === 0) return { key: 'free', label: s.status === 'approved' ? 'ฟรี อนุมัติแล้ว' : 'ฟรี รออนุมัติ', outstanding: false };
  if (hasActualSlip) {
    return s.status === 'approved'
      ? { key: 'paid', label: 'ชำระเงินแล้ว', outstanding: false }
      : { key: 'review', label: 'รอตรวจสลิป', outstanding: false };
  }
  if (isPayLater) {
    return s.status === 'approved'
      ? { key: 'awaiting', label: 'อนุมัติแล้ว รอชำระเงิน', outstanding: true }
      : { key: 'pending', label: 'รออนุมัติสิทธิ์', outstanding: true };
  }
  return s.status === 'approved'
    ? { key: 'paid', label: 'อนุมัติแล้ว', outstanding: false }
    : { key: 'pending', label: 'รออนุมัติสิทธิ์', outstanding: false };
}

function parsePayload(raw: unknown): any {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw && typeof raw === 'object' ? raw : null;
}

const cleanNo = (v: unknown) => String(v ?? '').trim().replace(/^0+/, '');

export async function getSponsorRegistrationRows(): Promise<SponsorRegistrationRow[]> {
  const [slips, groupMembers, attendances] = await Promise.all([
    prisma.payment_slips.findMany({
      where: {
        status: { not: ADD_ON_MERGED_STATUS },
        OR: [
          { ticket_code: { startsWith: 'GRP' } },
          { ticket_code: { startsWith: 'MEMGRP' } },
          { slip_id: { startsWith: 'SLIP-GRP' } },
          { slip_id: { startsWith: 'SLIP-SPON' } },
          { guest_workplace: { not: null } },
        ],
      },
      include: { meetings: { select: { meeting_name: true, activities: true } } },
      orderBy: { created_at: 'desc' },
    }),
    prisma.sponsor_group_members.findMany({
      include: {
        sponsor: { select: { name: true } },
        meeting: { select: { meeting_name: true } },
      },
      orderBy: { created_at: 'desc' },
    }),
    prisma.meeting_attendances.findMany({
      where: { OR: [{ sponsor_id: { not: null } }, { sponsor_company_name: { not: null } }] },
      select: { meeting_id: true, member_no: true, attendee_email: true, attendance_status: true },
    }),
  ]);

  // สถานะเข้างานของแต่ละคน
  const attendanceByKey = new Map<string, string>();
  for (const a of attendances) {
    if (a.member_no) attendanceByKey.set(`${a.meeting_id}|m:${cleanNo(a.member_no)}`, a.attendance_status);
    if (a.attendee_email) attendanceByKey.set(`${a.meeting_id}|e:${a.attendee_email.trim().toLowerCase()}`, a.attendance_status);
  }
  const attendanceOf = (meetingId: string, memberNo: unknown, email: unknown) => {
    const no = cleanNo(memberNo);
    const mail = String(email ?? '').trim().toLowerCase();
    return (no && attendanceByKey.get(`${meetingId}|m:${no}`)) || (mail && attendanceByKey.get(`${meetingId}|e:${mail}`)) || null;
  };

  const rows: SponsorRegistrationRow[] = [];
  const coveredTickets = new Set<string>();
  const coveredPeople = new Set<string>();

  for (const s of slips) {
    const payload = parsePayload(s.selected_activities);
    // บันทึกแยกสำหรับผู้ดูแลระบบ (เช่น รายการ fellow ที่รวมอยู่ในบิลเดิมแล้ว) ไม่ใช่บิลจริงของบริษัท
    if (!payload || payload.adminOnly) continue;
    const isMembership = payload.type === 'membership_group_registration' || Array.isArray(payload.applicants) && !Array.isArray(payload.attendees);
    const people: any[] = Array.isArray(payload.attendees) ? payload.attendees : Array.isArray(payload.applicants) ? payload.applicants : [];
    if (!payload.isGroup && payload.type !== 'conference_group_registration' && !isMembership) continue;
    if (people.length === 0) continue;

    if (s.ticket_code) coveredTickets.add(s.ticket_code);
    const status = billStatus(s);
    const company = payload.companyName || s.guest_workplace || '-';
    const meetingActs = Array.isArray(s.meetings?.activities) ? (s.meetings!.activities as any[]) : [];

    people.forEach((att: any, idx: number) => {
      if (!att || typeof att !== 'object') return;
      const memberNo = att.memberNo || att.member_no || '';
      const email = String(att.email || att.attendee_email || '').trim().toLowerCase();
      const programs = isMembership
        ? []
        : [
            ...resolveAttendeeActivities(att, meetingActs).map((a: any) => String(a?.name || '')),
            ...attendeeBackdatedCharges(att).map((c) => c.label),
          ].filter(Boolean);
      const format = (att.selectedFormat || att.attendanceType || att.format) === 'online' ? 'ออนไลน์' : 'ออนไซต์';
      const no = cleanNo(memberNo);
      if (no) coveredPeople.add(`${s.meeting_id}|m:${no}`);
      if (email) coveredPeople.add(`${s.meeting_id}|e:${email}`);

      rows.push({
        key: `${s.slip_id}_${idx}`,
        billNo: s.ticket_code || s.slip_id,
        slipId: s.slip_id,
        billDate: s.created_at,
        billAmount: Number(s.amount) || 0,
        billCount: people.length,
        billStatus: status.key,
        billStatusLabel: status.label,
        billType: isMembership ? 'สมัครสมาชิก' : 'ลงทะเบียนประชุม',
        company,
        guestEmail: (s.guest_email || '').trim().toLowerCase(),
        sponsorId: null,
        isOutstanding: status.outstanding,
        couponCode: payload.couponCode || payload.couponData?.code || null,
        meetingId: s.meeting_id,
        meetingName: s.meetings?.meeting_name || s.meeting_id,
        seq: idx + 1,
        memberNo: memberNo || '',
        name: att.nameTh || att.fullNameTh || att.full_name_th || att.fullName || att.nameEn || att.fullNameEn || att.full_name_en || '-',
        email,
        phone: att.phone || att.mobile || '',
        programs: programs.join(', '),
        format: isMembership ? '' : format,
        isAddOn: Boolean(att.isAddOn),
        isFellow: !isMembership && Boolean(payload.isFellow || payload.priceTier === 'fellow' || att.priceTier === 'fellow'),
        discount: Number(att.discountTotal ?? att.discountAmount ?? 0) || 0,
        netPrice: Number(att.price ?? att.netPrice ?? 0) || 0,
        attendanceStatus: isMembership ? null : attendanceOf(s.meeting_id, memberNo, email),
      });
    });
  }

  // รายการที่ลงผ่านโควต้าบริษัทโดยไม่มีบิล
  const quotaBills = new Map<string, typeof groupMembers>();
  for (const gm of groupMembers) {
    if (gm.ticket_code && coveredTickets.has(gm.ticket_code)) continue;
    const no = cleanNo(gm.member_no);
    const mail = (gm.attendee_email || '').trim().toLowerCase();
    if ((no && coveredPeople.has(`${gm.meeting_id}|m:${no}`)) || (mail && coveredPeople.has(`${gm.meeting_id}|e:${mail}`))) continue;
    const day = new Date(gm.created_at).toISOString().slice(0, 10);
    const groupKey = `${gm.sponsor_id}|${gm.meeting_id}|${day}`;
    const list = quotaBills.get(groupKey) || [];
    list.push(gm);
    quotaBills.set(groupKey, list);
  }
  for (const [groupKey, list] of quotaBills) {
    list.forEach((gm, idx) => {
      rows.push({
        key: `sgm_${gm.id.toString()}`,
        billNo: `โควต้า-${groupKey.split('|')[2].replace(/-/g, '')}`,
        slipId: null,
        billDate: list[0].created_at,
        billAmount: 0,
        billCount: list.length,
        billStatus: 'quota',
        billStatusLabel: 'ใช้โควต้าบริษัท',
        billType: 'ลงทะเบียนประชุม',
        company: gm.sponsor?.name || '-',
        guestEmail: (gm.submitted_by_email || '').trim().toLowerCase(),
        sponsorId: gm.sponsor_id,
        isOutstanding: false,
        couponCode: gm.coupon_code,
        meetingId: gm.meeting_id,
        meetingName: gm.meeting?.meeting_name || gm.meeting_id,
        seq: idx + 1,
        memberNo: gm.member_no || '',
        name: gm.attendee_name || '-',
        email: (gm.attendee_email || '').toLowerCase(),
        phone: gm.attendee_phone || '',
        programs: '',
        format: 'ออนไซต์',
        isAddOn: false,
        isFellow: false,
        discount: gm.discount_amount || 0,
        netPrice: gm.net_price || 0,
        attendanceStatus: attendanceOf(gm.meeting_id, gm.member_no, gm.attendee_email),
        // ใช้เลขบัตรของแต่ละคนเป็นข้อมูลประกอบ
        ticketCode: gm.ticket_code,
      });
    });
  }

  rows.sort((a, b) => {
    const t = new Date(b.billDate).getTime() - new Date(a.billDate).getTime();
    if (t !== 0) return t;
    if (a.billNo !== b.billNo) return a.billNo < b.billNo ? -1 : 1;
    return a.seq - b.seq;
  });

  return rows;
}

/** รายการที่เป็นของบริษัทนี้ (จับคู่ด้วยโควต้า ชื่อบริษัท หรืออีเมลผู้ติดต่อ เหมือนหน้าพอร์ทัลบริษัท) */
export function rowsForSponsor(
  rows: SponsorRegistrationRow[],
  sponsor: { id: string; name: string; contact_email: string }
): SponsorRegistrationRow[] {
  const name = sponsor.name.trim().toLowerCase();
  const email = (sponsor.contact_email || '').trim().toLowerCase();
  return rows.filter((r) => {
    if (r.sponsorId) return r.sponsorId === sponsor.id;
    return r.company.trim().toLowerCase() === name || (!!email && r.guestEmail === email);
  });
}

export interface SponsorBillSummary {
  billNo: string;
  billDate: Date;
  billType: string;
  billStatus: string;
  billStatusLabel: string;
  billAmount: number;
  isOutstanding: boolean;
  couponCode: string | null;
  meetingId: string;
  meetingName: string;
  attendees: SponsorRegistrationRow[];
}

/** รวมรายการรายคนกลับเป็นบิล (คงลำดับเดิม) */
export function groupRowsByBill(rows: SponsorRegistrationRow[]): SponsorBillSummary[] {
  const bills = new Map<string, SponsorBillSummary>();
  for (const r of rows) {
    let bill = bills.get(r.billNo);
    if (!bill) {
      bill = {
        billNo: r.billNo,
        billDate: r.billDate,
        billType: r.billType,
        billStatus: r.billStatus,
        billStatusLabel: r.billStatusLabel,
        billAmount: r.billAmount,
        isOutstanding: r.isOutstanding,
        couponCode: r.couponCode,
        meetingId: r.meetingId,
        meetingName: r.meetingName,
        attendees: [],
      };
      bills.set(r.billNo, bill);
    }
    bill.attendees.push(r);
  }
  return [...bills.values()];
}
