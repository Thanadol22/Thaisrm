import prisma from '@/lib/prisma';
import { statusLabelTh } from '@/lib/statusLabels';
import { attendeeBackdatedCharges, resolveAttendeeActivities } from '@/lib/services/sponsorCouponService';

/**
 * ข้อมูลหน้าบริษัท (ตรวจสอบสถานะและสลิปการชำระเงินบริษัท)
 *
 * สถานะของแต่ละคนคำนวณจากรายการลงทะเบียนจริงในขณะนั้น (payment_slips) เป็นหลัก
 * ไม่ใช้สถานะที่บันทึกซ้ำไว้ในตารางอื่น เพื่อให้ตรงกับที่เจ้าหน้าที่แก้ไขล่าสุดเสมอ
 * - รายการที่ลงผ่านโควต้าบริษัท (ไม่มีรายการชำระเงิน) ใช้ sponsor_group_members
 * - สิทธิ์ที่เจ้าหน้าที่บันทึกให้โดยตรง ใช้ meeting_attendances
 */

/** สถานะที่แสดงให้บริษัท (เรียงตามลำดับความคืบหน้า) */
export type PortalStatusKey =
  | 'confirmed'                  // ยืนยันสิทธิ์แล้ว
  | 'approved_awaiting_payment'  // อนุมัติสิทธิ์แล้ว รอชำระเงิน
  | 'pending_payment_review'     // แนบสลิปแล้ว รอตรวจสอบยอดเงิน
  | 'awaiting_payment'           // รออนุมัติสิทธิ์ (ชำระเงินภายหลัง)
  | 'pending_review'             // รอตรวจสอบ
  | 'rejected';                  // ต้องแก้ไข

const STATUS_PRIORITY: PortalStatusKey[] = [
  'confirmed',
  'approved_awaiting_payment',
  'pending_payment_review',
  'awaiting_payment',
  'pending_review',
  'rejected',
];

export const PORTAL_STATUS_LABEL_TH: Record<PortalStatusKey, string> = {
  confirmed: 'ยืนยันสิทธิ์แล้ว',
  approved_awaiting_payment: 'อนุมัติสิทธิ์แล้ว รอชำระเงิน',
  pending_payment_review: 'แนบสลิปแล้ว รอตรวจสอบยอดเงิน',
  awaiting_payment: 'รออนุมัติสิทธิ์',
  pending_review: 'รอตรวจสอบ',
  rejected: 'ต้องแก้ไข',
};

type ItemStatus =
  | 'approved'
  | 'approved_awaiting_payment'
  | 'pending_review'
  | 'pending_payment_review'
  | 'rejected'
  | 'awaiting_payment';

const NO_SLIP_URLS = new Set(['PAY_LATER', 'pay_later_pending', '/placeholder-slip.png', 'GROUP_REGISTRATION', 'GROUP_MEMBERSHIP']);

const itemToPortalStatus = (s: ItemStatus): PortalStatusKey => (s === 'approved' ? 'confirmed' : s);

function bestStatus(keys: PortalStatusKey[]): PortalStatusKey {
  for (const k of STATUS_PRIORITY) if (keys.includes(k)) return k;
  return 'pending_review';
}

function attendanceToPortalStatus(status: string | null | undefined): PortalStatusKey | null {
  const s = String(status || '').toLowerCase();
  if (['registered', 'attended', 'checked_in', 'checked-in', 'non-member'].includes(s)) return 'confirmed';
  if (['pending_payment', 'non-member-pending', 'pending'].includes(s)) return 'pending_review';
  if (s === 'rejected') return 'rejected';
  return null;
}

function sgmToPortalStatus(status: string | null | undefined): PortalStatusKey {
  const s = String(status || '').toLowerCase();
  if (s === 'rejected') return 'rejected';
  if (s === 'pending') return 'pending_review';
  return 'confirmed';
}

const thaiDateTime = (value: unknown): string => {
  const d = value ? new Date(value as any) : null;
  if (!d || isNaN(d.getTime())) return '';
  return d.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const cleanNo = (v: unknown) => String(v ?? '').trim().replace(/^0+/, '');
const cleanMail = (v: unknown) => String(v ?? '').trim().toLowerCase();

export interface PortalProgram {
  name: string;
  type: string;
  format: 'onsite' | 'online';
  price?: number;
  isFellow?: boolean;
}

export interface PortalRegistration {
  ticketCode: string;
  slipId: string | null;
  source: 'slip' | 'quota' | 'staff';
  statusKey: PortalStatusKey;
  price: number | null;
  isAddOn: boolean;
  rejectionReason: string | null;
}

export async function buildSponsorPortalData(email: string) {
  const sponsor: any = await prisma.sponsors.findFirst({
    where: { contact_email: { equals: email, mode: 'insensitive' }, is_active: true },
    include: {
      quotas: { include: { meeting: { select: { meeting_id: true, meeting_name: true, meeting_date: true } } } },
      group_members: {
        include: { meeting: { select: { meeting_id: true, meeting_name: true } } },
        orderBy: { created_at: 'desc' },
      },
    },
  });
  if (!sponsor) return null;

  // ── รายการชำระเงินของบริษัท ──
  let sponsorSlipsRaw: any[] = await prisma.payment_slips.findMany({
    where: {
      OR: [
        { guest_email: { equals: email, mode: 'insensitive' } },
        { guest_email: { equals: sponsor.contact_email, mode: 'insensitive' } },
        { guest_workplace: { equals: sponsor.name, mode: 'insensitive' } },
      ],
    },
    include: { meetings: { select: { meeting_id: true, meeting_name: true, activities: true } } },
    orderBy: { created_at: 'desc' },
  });
  // บันทึกแยกสำหรับผู้ดูแลระบบ รายการที่รวมเข้ารายการเดิมแล้ว และรายการที่แอดมินยกเลิกแล้ว ไม่แสดงให้บริษัท
  sponsorSlipsRaw = sponsorSlipsRaw.filter(
    (s: any) => !(s.selected_activities as any)?.adminOnly && s.status !== 'cancelled' && s.status !== 'merged'
  );

  const receipts = sponsorSlipsRaw.length
    ? await prisma.receipts.findMany({
        where: { slip_id: { in: sponsorSlipsRaw.map((s) => s.slip_id) } },
        select: { slip_id: true, receipt_no: true },
      })
    : [];
  const receiptBySlip = new Map(receipts.map((r) => [r.slip_id, r.receipt_no]));

  const sponsorSlips = sponsorSlipsRaw.map((s: any) => {
    const url: string = s.slip_url || '';
    const isPayLater =
      url === 'PAY_LATER' ||
      url === 'pay_later_pending' ||
      (typeof s.bank === 'string' && (s.bank.includes('ชำระเงินภายหลัง') || s.bank.toLowerCase().includes('pay later'))) ||
      !url ||
      url === '/placeholder-slip.png';
    const hasActualSlip = Boolean(url) && !NO_SLIP_URLS.has(url) && !url.startsWith('TEMP_');

    let itemStatus: ItemStatus = 'approved';
    if (s.status === 'rejected') itemStatus = 'rejected';
    else if (hasActualSlip && s.status === 'pending') itemStatus = 'pending_payment_review';
    else if (hasActualSlip && s.status === 'approved') itemStatus = 'approved';
    else if (isPayLater) itemStatus = s.status === 'approved' ? 'approved_awaiting_payment' : 'awaiting_payment';
    else if (s.amount > 0 && s.status === 'pending') itemStatus = 'pending_review';
    else if (s.amount === 0) itemStatus = s.status === 'approved' ? 'approved' : 'pending_review';

    // บริษัทต้องแนบสลิปเฉพาะรายการที่ยังไม่ได้ส่งสลิป หรือถูกส่งกลับให้แก้ไข
    const requiresSlipUpload =
      (itemStatus === 'approved_awaiting_payment' || itemStatus === 'awaiting_payment' || itemStatus === 'rejected') &&
      s.amount > 0;

    const payload = (s.selected_activities as any) || {};
    const people = Array.isArray(payload.attendees)
      ? payload.attendees
      : Array.isArray(payload.applicants)
        ? payload.applicants
        : [];
    const attendeesCount = people.length || 1;
    const isGroupMembership = Boolean(
      s.ticket_code?.startsWith('MEMGRP') || payload.isGroupMembership || payload.membershipType ||
        payload.type === 'membership_group_registration'
    );
    const isFellowSlip = Boolean(payload.isFellow || payload.priceTier === 'fellow');
    const title = isGroupMembership
      ? `ค่าสมัครสมาชิกแบบกลุ่ม ${sponsor.name} รวม ${attendeesCount} ท่าน`
      : `ลงทะเบียนประชุมแบบกลุ่ม${isFellowSlip ? ' ราคา fellow' : ''} ${sponsor.name} รวม ${attendeesCount} ท่าน`;

    return {
      id: s.id ? s.id.toString() : '',
      slip_id: s.slip_id,
      ticket_code: s.ticket_code || s.slip_id,
      meeting_id: s.meeting_id,
      meeting_name: s.meetings?.meeting_name || s.meeting_id,
      title,
      amount: Number(s.amount) || 0,
      bank: s.bank,
      transfer_date: s.transfer_date,
      transfer_time: s.transfer_time,
      slip_url: hasActualSlip ? s.slip_url : '',
      raw_slip_url: s.slip_url,
      status: s.status,
      itemStatus,
      statusKey: itemToPortalStatus(itemStatus),
      isPayLater,
      hasActualSlip,
      requiresSlipUpload,
      rejection_reason: s.rejection_reason,
      attendeesCount,
      attendeeNames: people
        .map((a: any) => a?.nameTh || a?.nameEn || a?.fullNameTh || a?.full_name_th || a?.fullName || '')
        .filter(Boolean),
      receipt_no: receiptBySlip.get(s.slip_id) || null,
      reviewed_at: s.reviewed_at,
      updated_at: s.updated_at,
      created_at: s.created_at,
    };
  });
  const slipStatusById = new Map(sponsorSlips.map((s) => [s.slip_id, s]));

  // ── รายชื่อผู้ลงทะเบียน: 1 คน / 1 งานประชุม = 1 แถว (เลขสมาชิกเป็นหลัก หากไม่มีจึงใช้อีเมล) ──
  const people = new Map<string, any>();
  const keyAliases = new Map<string, string>();
  const personKey = (meetingId: unknown, memberNo: unknown, email: unknown): string | null => {
    const no = cleanNo(memberNo);
    if (no && no !== '-' && no !== 'null') return `${meetingId}|m:${no}`;
    const mail = cleanMail(email);
    if (mail && mail !== '-') return `${meetingId}|e:${mail}`;
    return null;
  };
  const resolvePersonKey = (meetingId: unknown, memberNo: unknown, email: unknown): string | null => {
    const memberKey = personKey(meetingId, memberNo, '');
    const emailKey = personKey(meetingId, '', email);
    const byMember = memberKey ? keyAliases.get(memberKey) : undefined;
    let byEmail = emailKey ? keyAliases.get(emailKey) : undefined;
    // อีเมลเดียวกันแต่เป็นเลขสมาชิกคนละคน ไม่นับเป็นคนเดียวกัน
    if (byEmail && memberKey && byEmail.includes('|m:') && byEmail !== memberKey) byEmail = undefined;
    const key = byMember || byEmail || memberKey || emailKey;
    if (!key) return null;
    if (memberKey && !keyAliases.has(memberKey)) keyAliases.set(memberKey, key);
    if (emailKey && !keyAliases.has(emailKey)) keyAliases.set(emailKey, key);
    return key;
  };
  const getPerson = (key: string, init: () => any) => {
    if (!people.has(key)) {
      people.set(key, { ...init(), registrations: [] as PortalRegistration[], programs: [] as PortalProgram[], notes: [] as string[] });
    }
    return people.get(key);
  };
  const addNote = (p: any, note: string) => {
    if (note && !p.notes.includes(note)) p.notes.push(note);
  };
  const addPrograms = (p: any, programs: PortalProgram[]) => {
    for (const prog of programs) {
      if (!p.programs.some((x: PortalProgram) => x.name.trim().toLowerCase() === prog.name.trim().toLowerCase())) {
        p.programs.push(prog);
      }
    }
    p.programs.sort((a: PortalProgram, b: PortalProgram) => Number(b.type === 'main') - Number(a.type === 'main'));
  };
  const coveredTickets = new Set<string>();

  // 1) รายการชำระเงิน (ข้อมูลหลักและเป็นปัจจุบันที่สุด)
  for (const s of sponsorSlipsRaw) {
    const payload = (s.selected_activities as any) || {};
    const isMembership = payload.type === 'membership_group_registration';
    const list = Array.isArray(payload.attendees) ? payload.attendees : Array.isArray(payload.applicants) ? payload.applicants : [];
    if (list.length === 0) continue;
    const slipInfo = slipStatusById.get(s.slip_id)!;
    if (s.ticket_code) coveredTickets.add(s.ticket_code);
    const meetingActs = Array.isArray(s.meetings?.activities) ? (s.meetings.activities as any[]) : [];
    const isFellowSlip = Boolean(payload.isFellow || payload.priceTier === 'fellow');

    for (const att of list) {
      if (!att || typeof att !== 'object') continue;
      const memberNo = att.memberNo || att.member_no || '';
      const mail = cleanMail(att.email || att.attendee_email);
      const key = resolvePersonKey(s.meeting_id, memberNo, mail);
      if (!key) continue;
      const p = getPerson(key, () => ({
        id: `slip_${s.id}_${mail || cleanNo(memberNo)}`,
        member_no: memberNo || '-',
        attendee_name: att.nameTh || att.nameEn || att.fullNameTh || att.full_name_th || att.fullNameEn || att.fullName || '-',
        attendee_email: mail || '-',
        meeting_id: s.meeting_id,
        meeting_name: s.meetings?.meeting_name || s.meeting_id,
        created_at: s.created_at,
      }));
      if (p.member_no === '-' && memberNo) p.member_no = memberNo;

      const price = isMembership ? null : Number(att.price ?? att.netPrice ?? 0);
      p.registrations.push({
        ticketCode: s.ticket_code || s.slip_id,
        slipId: s.slip_id,
        source: 'slip',
        statusKey: slipInfo.statusKey,
        price,
        isAddOn: Boolean(att.isAddOn),
        rejectionReason: s.status === 'rejected' ? s.rejection_reason || null : null,
      } satisfies PortalRegistration);

      if (isMembership) {
        p.isMembershipOnly = true;
        continue;
      }

      // หลักสูตรและรูปแบบการเข้าร่วม: หลักสูตรที่งานกำหนดรูปแบบตายตัวคงตามนั้น ที่เหลือตามรูปแบบที่ผู้เข้าร่วมเลือก
      const attFormat: 'onsite' | 'online' = (att.selectedFormat || att.attendanceType || att.format) === 'online' ? 'online' : 'onsite';
      let acts = resolveAttendeeActivities(att, meetingActs);
      if (acts.length === 0) acts = meetingActs.filter((a: any) => a?.type === 'main').slice(0, 1);
      let discountLeft = Math.max(0, Number(att.discountTotal ?? att.discountAmount ?? 0) || 0);
      const isFellowAttendee = Boolean(isFellowSlip || att.priceTier === 'fellow');
      const programs: PortalProgram[] = acts.map((a: any) => {
        const isMain = a?.type === 'main' || a?.id === 'main';
        const def = meetingActs.find((m: any) => String(m?.id) === String(a?.id)) || a;
        const fixed = isMain ? 'both' : def?.format || (def?.type === 'workshop' ? 'onsite' : 'both');
        const listPrice = Number(a?.price);
        let progPrice: number | undefined;
        if (Number.isFinite(listPrice)) {
          const discount = isMain ? Math.min(discountLeft, listPrice) : 0;
          discountLeft -= discount;
          progPrice = Math.max(0, listPrice - discount);
        }
        return {
          name: String(a?.name || 'Main Program'),
          type: String(a?.type || 'main'),
          format: fixed === 'onsite' || fixed === 'online' ? fixed : attFormat,
          price: progPrice,
          isFellow: isFellowAttendee && (isMain || a?.priceTier === 'fellow'),
        };
      });
      for (const c of attendeeBackdatedCharges(att)) {
        programs.push({ name: c.label, type: 'main', format: attFormat, price: c.amount });
      }
      // ราคาแยกหลักสูตรต้องรวมได้เท่ายอดสุทธิของผู้ลงทะเบียน ไม่เช่นนั้นไม่แสดงราคาแยก (ข้อมูลเก่าที่คำนวณต่างกัน)
      const sumPrograms = programs.reduce((sum, x) => sum + (x.price ?? NaN), 0);
      if (!Number.isFinite(price ?? NaN) || sumPrograms !== price) programs.forEach((x) => delete x.price);
      addPrograms(p, programs);

      // หมายเหตุให้บริษัทเข้าใจตรงกันกับเจ้าหน้าที่
      const discount = Number(att.discountTotal ?? att.discountAmount ?? 0) || 0;
      if (discount > 0) addNote(p, `ใช้สิทธิ์คูปองบริษัท ส่วนลด ฿${discount.toLocaleString()}`);
      if (att.isAddOn) addNote(p, `ลงทะเบียนกิจกรรมเพิ่มเติมในรายการ ${s.ticket_code || s.slip_id}`);
      if (att.addedByAdmin) addNote(p, `เจ้าหน้าที่เพิ่มรายชื่อนี้ในรายการ ${s.ticket_code || s.slip_id}`);
      if (att.formatUpdatedAt) {
        addNote(p, `เจ้าหน้าที่เปลี่ยนรูปแบบการเข้าร่วมเป็น${attFormat === 'online' ? 'ออนไลน์' : 'ออนไซต์'} เมื่อ ${thaiDateTime(att.formatUpdatedAt)}`);
      }
      if (att.adminEditedAt) addNote(p, `เจ้าหน้าที่แก้ไขข้อมูลล่าสุดเมื่อ ${thaiDateTime(att.adminEditedAt)}`);
    }
  }

  // 2) ลงทะเบียนผ่านโควต้าบริษัท (ไม่มีรายการชำระเงิน)
  for (const m of sponsor.group_members || []) {
    if (m.ticket_code && coveredTickets.has(m.ticket_code)) continue;
    const key = resolvePersonKey(m.meeting_id, m.member_no, m.attendee_email);
    if (!key) continue;
    const p = getPerson(key, () => ({
      id: m.id ? m.id.toString() : '',
      member_no: m.member_no || '-',
      attendee_name: m.attendee_name || '-',
      attendee_email: cleanMail(m.attendee_email) || '-',
      meeting_id: m.meeting_id,
      meeting_name: m.meeting?.meeting_name || m.meeting_id,
      created_at: m.created_at,
    }));
    p.registrations.push({
      ticketCode: m.ticket_code || '-',
      slipId: null,
      source: 'quota',
      statusKey: sgmToPortalStatus(m.status),
      price: Number(m.net_price) || 0,
      isAddOn: false,
      rejectionReason: null,
    } satisfies PortalRegistration);
    addNote(p, 'ลงทะเบียนด้วยโควต้าบริษัท');
  }

  // 3) สิทธิ์เข้าร่วมที่ผูกกับบริษัท + ข้อมูลเช็กอินของทุกคน
  const meetingIds = Array.from(new Set(Array.from(people.values()).map((p) => p.meeting_id)));
  const attendances = await prisma.meeting_attendances.findMany({
    where: {
      attendance_status: { not: 'Cancelled' },
      OR: [
        { sponsor_id: sponsor.id },
        { sponsor_company_name: { equals: sponsor.name, mode: 'insensitive' } },
        ...(meetingIds.length ? [{ meeting_id: { in: meetingIds } }] : []),
      ],
    },
    include: { members: { select: { member_no: true, fullNameTh: true, fullNameEn: true, email: true } } },
  });
  for (const att of attendances) {
    const mail = cleanMail(att.attendee_email || att.members?.email);
    const linkedToSponsor =
      att.sponsor_id === sponsor.id || cleanMail(att.sponsor_company_name) === cleanMail(sponsor.name);
    const memberKey = personKey(att.meeting_id, att.member_no, '');
    const emailKey = personKey(att.meeting_id, '', mail);
    const existingKey = (memberKey && keyAliases.get(memberKey)) || (emailKey && keyAliases.get(emailKey));
    let p = existingKey ? people.get(existingKey) : null;

    if (!p) {
      // คนที่ไม่ได้อยู่ในรายการของบริษัท แต่เจ้าหน้าที่บันทึกสิทธิ์ในนามบริษัทให้โดยตรง
      if (!linkedToSponsor) continue;
      const portalStatus = attendanceToPortalStatus(att.attendance_status);
      if (!portalStatus) continue;
      const key = resolvePersonKey(att.meeting_id, att.member_no, mail);
      if (!key) continue;
      p = getPerson(key, () => ({
        id: att.attendance_id.toString(),
        member_no: att.member_no || '-',
        attendee_name: att.attendee_name || att.members?.fullNameTh || att.members?.fullNameEn || '-',
        attendee_email: mail || '-',
        meeting_id: att.meeting_id,
        meeting_name: att.meeting_id,
        created_at: null,
      }));
      p.registrations.push({
        ticketCode: '-',
        slipId: null,
        source: 'staff',
        statusKey: portalStatus,
        price: null,
        isAddOn: false,
        rejectionReason: null,
      } satisfies PortalRegistration);
      addNote(p, 'เจ้าหน้าที่บันทึกสิทธิ์เข้าร่วมให้โดยตรง');
    }

    if (att.checkin_time || String(att.attendance_status || '').toLowerCase() === 'attended') {
      p.checkedIn = true;
      p.checkinTime = att.checkin_time ? thaiDateTime(att.checkin_time) : null;
    }
  }

  const meetingNames = new Map<string, string>();
  sponsorSlipsRaw.forEach((s) => s.meetings?.meeting_name && meetingNames.set(s.meeting_id, s.meetings.meeting_name));
  (sponsor.quotas || []).forEach((q: any) => q.meeting?.meeting_name && meetingNames.set(q.meeting_id, q.meeting.meeting_name));

  const groupMembers = Array.from(people.values()).map((p) => {
    // รายการเพิ่มเติมไม่ใช่สิทธิ์หลัก: ใช้สถานะของรายการหลักก่อน
    const mainRegs = p.registrations.filter((r: PortalRegistration) => !r.isAddOn);
    const statusKey = bestStatus((mainRegs.length ? mainRegs : p.registrations).map((r: PortalRegistration) => r.statusKey));
    const activeRegs = p.registrations.filter((r: PortalRegistration) => r.statusKey !== 'rejected');
    if (activeRegs.length > 1) addNote(p, `มีรายการลงทะเบียน ${activeRegs.length} รายการ`);
    const prices = p.registrations
      .filter((r: PortalRegistration) => r.statusKey !== 'rejected' && r.price !== null)
      .map((r: PortalRegistration) => r.price as number);
    const primary = mainRegs[0] || p.registrations[0];
    return {
      ...p,
      meeting_name: meetingNames.get(p.meeting_id) || p.meeting_name,
      ticket_code: primary?.ticketCode || '-',
      net_price: prices.reduce((a: number, b: number) => a + b, 0),
      hasPrice: prices.length > 0,
      statusKey,
      status: PORTAL_STATUS_LABEL_TH[statusKey],
      checkedIn: Boolean(p.checkedIn),
      checkinTime: p.checkinTime || null,
      isMembershipOnly: Boolean(p.isMembershipOnly) && p.programs.length === 0,
    };
  });
  // ต้องดำเนินการก่อน แล้วจึงเรียงตามชื่อ
  groupMembers.sort((a, b) => {
    const pa = STATUS_PRIORITY.indexOf(a.statusKey);
    const pb = STATUS_PRIORITY.indexOf(b.statusKey);
    const needsAction = (k: PortalStatusKey) => (k === 'rejected' ? 0 : k === 'approved_awaiting_payment' ? 1 : 2);
    return needsAction(a.statusKey) - needsAction(b.statusKey) || pa - pb || String(a.attendee_name).localeCompare(String(b.attendee_name), 'th');
  });

  // ── สรุปสถานะภาพรวม ──
  const awaitingPaymentSlips = sponsorSlips.filter((s) => s.requiresSlipUpload);
  const pendingPaymentReviewSlips = sponsorSlips.filter((s) => s.itemStatus === 'pending_payment_review');
  const awaitingAccessSlips = sponsorSlips.filter((s) => s.itemStatus === 'awaiting_payment' || s.itemStatus === 'pending_review');
  const rejectedSlips = sponsorSlips.filter((s) => s.itemStatus === 'rejected');

  let paymentStatus: 'approved' | 'approved_awaiting_payment' | 'pending_review' | 'pending_payment_review' | 'rejected' | 'unpaid' | 'free_quota' = 'approved';
  if (rejectedSlips.length > 0) paymentStatus = 'rejected';
  else if (awaitingPaymentSlips.length > 0) {
    paymentStatus = awaitingPaymentSlips.some((s) => s.itemStatus === 'approved_awaiting_payment') ? 'approved_awaiting_payment' : 'unpaid';
  } else if (pendingPaymentReviewSlips.length > 0) paymentStatus = 'pending_payment_review';
  else if (awaitingAccessSlips.length > 0) paymentStatus = 'pending_review';
  else if (sponsorSlips.length === 0 && groupMembers.length === 0) paymentStatus = 'free_quota';

  const peopleCounts = STATUS_PRIORITY.reduce(
    (acc, k) => ({ ...acc, [k]: groupMembers.filter((m) => m.statusKey === k).length }),
    {} as Record<PortalStatusKey, number>
  );

  return {
    sponsorId: sponsor.id,
    sponsorName: sponsor.name,
    tier: sponsor.tier,
    contactName: sponsor.contact_name || '',
    contactEmail: sponsor.contact_email,
    quotas: (sponsor.quotas || []).map((q: any) => ({
      meeting_id: q.meeting_id,
      meeting_name: q.meeting?.meeting_name || '',
      quota_seats: q.quota_seats || 0,
      used_seats: q.used_seats || 0,
      remaining_seats: Math.max(0, (q.quota_seats || 0) - (q.used_seats || 0)),
    })),
    groupMembers,
    peopleCounts,
    checkedInCount: groupMembers.filter((m) => m.checkedIn).length,
    slips: sponsorSlips,
    awaitingPaymentSlips,
    totalAmount: sponsorSlips.reduce((sum, s) => sum + s.amount, 0),
    outstandingAmount: awaitingPaymentSlips.reduce((sum, s) => sum + s.amount, 0),
    hasOutstanding: awaitingPaymentSlips.length > 0,
    paymentStatus,
    paymentStatusLabel: statusLabelTh(paymentStatus),
    generatedAt: new Date().toISOString(),
  };
}

export type SponsorPortalData = NonNullable<Awaited<ReturnType<typeof buildSponsorPortalData>>>;
