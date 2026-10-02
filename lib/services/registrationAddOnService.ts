import prisma from '@/lib/prisma';

/**
 * การลงทะเบียนเพิ่มเติม (Add-on) สำหรับผู้ที่ลงทะเบียนและได้รับการอนุมัติแล้ว
 *
 * - ผู้ลงทะเบียนส่งรายการโอนเงินใหม่ได้ (payment_slips แถวใหม่ที่มี selected_activities.isAddOn = true)
 * - เมื่อแอดมินอนุมัติ ระบบจะรวมกิจกรรมและยอดเงินเข้ากับรายการลงทะเบียนเดิม
 *   แล้วเปลี่ยนสถานะรายการเพิ่มเติมเป็น 'merged' (เก็บไว้เป็นหลักฐานการโอน ไม่นับซ้ำในรายงาน)
 */

export const ADD_ON_MERGED_STATUS = 'merged';

export function parseSlipPayload(raw: unknown): any {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw ?? null;
}

export function isAddOnPayload(raw: unknown): boolean {
  const payload = parseSlipPayload(raw);
  return Boolean(payload && typeof payload === 'object' && !Array.isArray(payload) && payload.isAddOn === true);
}

/** รายการกิจกรรมจาก selected_activities (รองรับทั้งแบบ array เดิมและแบบ object) */
export function slipActivityList(raw: unknown): any[] {
  const payload = parseSlipPayload(raw);
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.activities)) return payload.activities;
    if (Array.isArray(payload.selectedActivities)) return payload.selectedActivities;
  }
  return [];
}

function isGroupOrSpecialSlip(slip: { ticket_code: string | null; selected_activities: unknown }): boolean {
  const payload = parseSlipPayload(slip.selected_activities);
  if (slip.ticket_code?.startsWith('GRP') || slip.ticket_code?.startsWith('MEM')) return true;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return Boolean(
      payload.isGroup ||
        payload.isFormatChange ||
        payload.type === 'conference_group_registration' ||
        payload.type === 'membership_registration' ||
        payload.type === 'membership_group_registration'
    );
  }
  return false;
}

/** กิจกรรมที่ลงทะเบียนไว้แล้ว — pending = อยู่ในรายการที่ยังรอเจ้าหน้าที่ตรวจสอบ */
export interface RegisteredActivity {
  id: string;
  name: string;
  type?: string;
  pending: boolean;
}

export type AddOnEligibility =
  | { state: 'none' }
  | { state: 'unsupported' }
  | {
      state: 'eligible';
      originalSlip: any;
      pendingAddOnSlips: any[];
      registeredActivities: RegisteredActivity[];
    };

/**
 * ตรวจสอบว่าผู้ลงทะเบียน (สมาชิกหรือบุคคลทั่วไป) สามารถลงทะเบียนเพิ่มเติมได้หรือไม่
 * - รายการเดิมอนุมัติแล้วหรือยังรอตรวจสอบก็ได้ และมีรายการเพิ่มเติมรอตรวจสอบได้หลายรายการ
 * - กิจกรรมที่อยู่ในรายการเดิมหรือรายการเพิ่มเติมที่รอตรวจสอบ ถือว่าลงทะเบียนแล้ว (ห้ามซ้ำ)
 * รองรับเฉพาะรายการลงทะเบียนรายบุคคล — การลงทะเบียนแบบกลุ่มต้องให้เจ้าหน้าที่ดำเนินการ
 */
export async function getAddOnEligibility(
  meetingId: string,
  identity: { memberNo?: string | null; email?: string | null }
): Promise<AddOnEligibility> {
  const memberNo = identity.memberNo?.trim() || null;
  const email = identity.email?.trim().toLowerCase() || null;
  if (!memberNo && !email) return { state: 'none' };

  const slips = await prisma.payment_slips.findMany({
    where: {
      meeting_id: meetingId,
      status: { in: ['pending', 'approved'] },
      OR: [
        ...(memberNo ? [{ member_no: memberNo }] : []),
        ...(email && !memberNo ? [{ is_member: false, guest_email: { equals: email, mode: 'insensitive' as const } }] : []),
      ],
    },
    orderBy: { created_at: 'asc' },
  });

  const addOns = slips.filter((s) => isAddOnPayload(s.selected_activities));
  const registrations = slips.filter(
    (s) => !isAddOnPayload(s.selected_activities) && !parseSlipPayload(s.selected_activities)?.isFormatChange
  );

  const originalSlip = registrations.find((s) => s.status === 'approved') || registrations[0];
  if (!originalSlip) {
    // ลงทะเบียนผ่านช่องทางอื่น (เช่น กลุ่มบริษัท / แอดมินเพิ่มโดยตรง) ที่ไม่มีสลิปรายบุคคลให้รวม
    const attendance = await prisma.meeting_attendances.findFirst({
      where: {
        meeting_id: meetingId,
        attendance_status: { notIn: ['Cancelled', 'Rejected'] },
        OR: [
          ...(memberNo ? [{ member_no: memberNo }] : []),
          ...(email ? [{ attendee_email: { equals: email, mode: 'insensitive' as const } }] : []),
        ],
      },
      select: { attendance_id: true },
    });
    return attendance ? { state: 'unsupported' } : { state: 'none' };
  }

  if (isGroupOrSpecialSlip(originalSlip)) return { state: 'unsupported' };

  const pendingAddOnSlips = addOns.filter(
    (s) => s.status === 'pending' && parseSlipPayload(s.selected_activities)?.originalSlipId === originalSlip.slip_id
  );

  const registeredActivities: RegisteredActivity[] = [];
  const seen = new Set<string>();
  const collect = (slip: any, pending: boolean) => {
    for (const a of slipActivityList(slip.selected_activities)) {
      const id = String(a?.id ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      registeredActivities.push({ id, name: a?.name || id, type: a?.type, pending });
    }
  };
  collect(originalSlip, originalSlip.status !== 'approved');
  pendingAddOnSlips.forEach((s) => collect(s, true));

  return { state: 'eligible', originalSlip, pendingAddOnSlips, registeredActivities };
}

export class AddOnMergeError extends Error {}

/**
 * รวมรายการลงทะเบียนเพิ่มเติมที่อนุมัติแล้วเข้ากับรายการลงทะเบียนเดิม
 * - เพิ่มกิจกรรมใหม่ (ไม่ซ้ำ id เดิม) และบวกยอดเงินเข้ารายการเดิม
 * - เพิ่มบรรทัดในใบเสร็จของรายการเดิม (ถ้าออกใบเสร็จไว้แล้ว)
 * - เปลี่ยนสถานะรายการเพิ่มเติมเป็น 'merged'
 * allowPendingOriginal: ใช้กับกิจกรรมเพิ่มเติมที่ไม่มีค่าใช้จ่าย ซึ่งรวมเข้ารายการเดิมที่ยังรอตรวจสอบได้เลย
 */
export async function mergeAddOnSlip(
  addOnSlipId: string,
  reviewer: string,
  options: { allowPendingOriginal?: boolean } = {}
) {
  return prisma.$transaction(async (tx) => {
    const addOn = await tx.payment_slips.findUnique({ where: { slip_id: addOnSlipId } });
    if (!addOn) throw new AddOnMergeError('ไม่พบรายการลงทะเบียนเพิ่มเติม');

    const addOnPayload = parseSlipPayload(addOn.selected_activities);
    if (!isAddOnPayload(addOnPayload)) throw new AddOnMergeError('รายการนี้ไม่ใช่การลงทะเบียนเพิ่มเติม');
    if (addOn.status !== 'pending') throw new AddOnMergeError('รายการลงทะเบียนเพิ่มเติมนี้ถูกดำเนินการไปแล้ว');

    const original = await tx.payment_slips.findUnique({ where: { slip_id: addOnPayload.originalSlipId } });
    if (!original) throw new AddOnMergeError('ไม่พบรายการลงทะเบียนเดิมที่ต้องการรวม');
    if (original.status === 'rejected' || original.status === 'cancelled' || (original.status !== 'approved' && !options.allowPendingOriginal)) {
      throw new AddOnMergeError(
        `รายการลงทะเบียนเดิม ${original.ticket_code || original.slip_id} ยังไม่ได้รับการอนุมัติ กรุณาตรวจสอบและอนุมัติรายการเดิมก่อน แล้วจึงอนุมัติรายการเพิ่มเติมนี้`
      );
    }

    const origPayload = parseSlipPayload(original.selected_activities);
    const origActivities = slipActivityList(origPayload);
    const existingIds = new Set(origActivities.map((a: any) => String(a?.id)));
    const newActivities = slipActivityList(addOnPayload).filter((a: any) => !existingIds.has(String(a?.id)));
    const mergedActivities = [...origActivities, ...newActivities];

    let mergedPayload: any;
    if (Array.isArray(origPayload)) {
      mergedPayload = mergedActivities;
    } else {
      const listKey = !Array.isArray(origPayload?.activities) && Array.isArray(origPayload?.selectedActivities)
        ? 'selectedActivities'
        : 'activities';
      mergedPayload = {
        ...(origPayload || {}),
        [listKey]: mergedActivities,
        addOnSlipIds: [...(Array.isArray(origPayload?.addOnSlipIds) ? origPayload.addOnSlipIds : []), addOn.slip_id],
      };
    }

    const addOnAmount = Number(addOn.amount) || 0;
    const now = new Date();

    const updatedOriginal = await tx.payment_slips.update({
      where: { slip_id: original.slip_id },
      data: {
        amount: (Number(original.amount) || 0) + addOnAmount,
        selected_activities: mergedPayload,
      },
    });

    await tx.payment_slips.update({
      where: { slip_id: addOn.slip_id },
      data: {
        status: ADD_ON_MERGED_STATUS,
        rejection_reason: null,
        resubmit_token: null,
        reviewed_by: reviewer,
        reviewed_at: now,
      },
    });

    if (addOnAmount > 0) {
      const receipt = await tx.receipts.findFirst({ where: { slip_id: original.slip_id } });
      if (receipt) {
        const items = Array.isArray(receipt.items) ? (receipt.items as any[]) : [];
        const nextNumber = items.length + 1;
        await tx.receipts.update({
          where: { id: receipt.id },
          data: {
            items: [
              ...items,
              {
                id: `item-${receipt.id}-${nextNumber}`,
                itemNumber: nextNumber,
                title: 'ค่าลงทะเบียนเพิ่มเติม',
                subDetails: newActivities.map((a: any) => a?.name).filter(Boolean),
                amount: addOnAmount,
              },
            ],
            total_amount: (Number(receipt.total_amount) || 0) + addOnAmount,
            // ให้ระบบคำนวณจำนวนเงินตัวอักษรใหม่จากยอดรวม
            thai_baht_text_override: null,
          },
        });
      }
    }

    return { original: updatedOriginal, addOn, newActivities };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ลงทะเบียนเพิ่มเติมแบบกลุ่ม (บริษัท)
// บริษัทเป็นผู้ชำระเงินในรายการกลุ่มใหม่ (ออกใบเสร็จในนามบริษัทตามปกติ ไม่ย้ายยอดเงินข้ามผู้จ่าย)
// เมื่ออนุมัติ กิจกรรมที่เพิ่มของผู้เข้าร่วมแต่ละคนจะถูกรวมเข้ารายการลงทะเบียนเดิมของคนนั้น
// ─────────────────────────────────────────────────────────────────────────────

const normalizeMemberNo = (value: unknown) => String(value ?? '').trim().replace(/^0+/, '');

/** กิจกรรมของผู้เข้าร่วมในรายการกลุ่ม (เก็บเป็น object หรือเป็นรหัสโปรแกรม) */
function groupAttendeeActivities(att: any, meetingActivities: unknown): any[] {
  const own = att?.selectedActivities || att?.activities;
  if (Array.isArray(own) && own.length > 0 && typeof own[0] === 'object') return own;
  const ids: string[] = att?.selectedProgramIds || att?.selectedPrograms || [];
  const acts = Array.isArray(meetingActivities) ? (meetingActivities as any[]) : [];
  return ids.length > 0 ? acts.filter((a) => ids.includes(a?.id)) : [];
}

function mainActivityOf(meeting: { activities: unknown; meeting_name: string } | null) {
  const acts = Array.isArray(meeting?.activities) ? (meeting!.activities as any[]) : [];
  const main = acts.find((a) => a?.type === 'main') || acts[0];
  return main
    ? { id: String(main.id), name: main.name, type: main.type }
    : { id: 'main', name: meeting?.meeting_name || 'Main Program', type: 'main' };
}

export interface MemberRegistrationSummary {
  registered: boolean;
  /** รายการที่เก็บข้อมูลลงทะเบียนหลักของสมาชิก (null = ลงทะเบียนโดยไม่มีรายการชำระเงิน เช่น โควต้าบริษัท) */
  originalSlipId: string | null;
  originalTicketCode: string | null;
  originalKind: 'individual' | 'group' | 'attendance' | null;
  originalStatus: string | null;
  registeredActivities: RegisteredActivity[];
}

/** สรุปการลงทะเบียนของสมาชิกในงานประชุม จากทุกช่องทาง (รายบุคคล, กลุ่ม, รายการเพิ่มเติม, โควต้าบริษัท) */
export async function getMemberRegistrationSummary(
  meetingId: string,
  memberNo: string
): Promise<MemberRegistrationSummary> {
  const key = normalizeMemberNo(memberNo);
  const summary: MemberRegistrationSummary = {
    registered: false,
    originalSlipId: null,
    originalTicketCode: null,
    originalKind: null,
    originalStatus: null,
    registeredActivities: [],
  };
  if (!key) return summary;

  const [meeting, slips] = await Promise.all([
    prisma.meetings.findUnique({ where: { meeting_id: meetingId }, select: { activities: true, meeting_name: true } }),
    prisma.payment_slips.findMany({
      where: { meeting_id: meetingId, status: { in: ['pending', 'approved'] } },
      orderBy: { created_at: 'asc' },
    }),
  ]);

  const seen = new Set<string>();
  const collect = (acts: any[], pending: boolean) => {
    for (const a of acts) {
      const id = String(a?.id ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      summary.registeredActivities.push({ id, name: a?.name || id, type: a?.type, pending });
    }
  };
  const setOriginal = (slip: any, kind: 'individual' | 'group') => {
    if (summary.originalSlipId) return;
    summary.originalSlipId = slip.slip_id;
    summary.originalTicketCode = slip.ticket_code;
    summary.originalKind = kind;
    summary.originalStatus = slip.status;
  };

  for (const slip of slips) {
    const payload = parseSlipPayload(slip.selected_activities);
    if (
      payload?.isFormatChange ||
      payload?.type === 'membership_registration' ||
      payload?.type === 'membership_group_registration'
    ) {
      continue;
    }
    const pending = slip.status !== 'approved';

    if (
      payload &&
      !Array.isArray(payload) &&
      Array.isArray(payload.attendees) &&
      (payload.isGroup || slip.ticket_code?.startsWith('GRP'))
    ) {
      const att = payload.attendees.find((a: any) => normalizeMemberNo(a?.memberNo || a?.member_no) === key);
      if (!att) continue;
      // รายการเพิ่มเติมที่รวมเข้ารายการเดิมแล้วจะซ้ำกับรายการเดิม (collect ข้ามกิจกรรมซ้ำให้)
      if (!att.isAddOn) setOriginal(slip, 'group');
      collect(groupAttendeeActivities(att, meeting?.activities), pending);
      continue;
    }

    if (normalizeMemberNo(slip.member_no) !== key) continue;
    if (!isAddOnPayload(payload)) setOriginal(slip, 'individual');
    collect(slipActivityList(payload), pending);
  }

  if (!summary.originalSlipId && summary.registeredActivities.length === 0) {
    const attendance = await prisma.meeting_attendances.findFirst({
      where: {
        meeting_id: meetingId,
        attendance_status: { notIn: ['Cancelled', 'Rejected'] },
        member_no: { in: [memberNo.trim(), key, key.padStart(4, '0')] },
      },
      select: { attendance_id: true },
    });
    if (attendance) {
      // ลงทะเบียนผ่านโควต้าบริษัทหรือแอดมินเพิ่มโดยตรง: ถือว่าลงการประชุมหลักแล้ว
      summary.originalKind = 'attendance';
      summary.originalStatus = 'approved';
      collect([mainActivityOf(meeting)], false);
    }
  }

  summary.registered = Boolean(summary.originalSlipId) || summary.registeredActivities.length > 0;
  return summary;
}

/**
 * รายชื่อผู้ที่ยังมีรายการลงทะเบียนอื่นที่รอตรวจสอบ/อนุมัติแล้วในงานประชุม (ไม่นับรายการ excludeSlipId)
 * ใช้ก่อนเปลี่ยนสถานะสิทธิ์เข้าร่วมตอนปฏิเสธ/ย้อนสถานะรายการหนึ่ง
 * เพื่อไม่ให้กระทบผู้ที่มีสิทธิ์จากรายการอื่น (เช่น ลงซ้ำ หรือลงกิจกรรมเพิ่มเติมผ่านรายการกลุ่ม)
 */
export async function collectOtherActiveRegistrants(meetingId: string, excludeSlipId: string) {
  const memberNos = new Set<string>();
  const emails = new Set<string>();
  const slips = await prisma.payment_slips.findMany({
    where: { meeting_id: meetingId, status: { in: ['pending', 'approved'] }, slip_id: { not: excludeSlipId } },
    select: { member_no: true, guest_email: true, ticket_code: true, selected_activities: true },
  });
  const addEmail = (value: unknown) => {
    const mail = String(value ?? '').trim().toLowerCase();
    if (mail) emails.add(mail);
  };
  for (const slip of slips) {
    const payload = parseSlipPayload(slip.selected_activities);
    if (
      payload?.isFormatChange ||
      payload?.type === 'membership_registration' ||
      payload?.type === 'membership_group_registration'
    ) {
      continue;
    }
    const isGroup =
      payload && !Array.isArray(payload) && Array.isArray(payload.attendees) &&
      (payload.isGroup || slip.ticket_code?.startsWith('GRP'));
    if (isGroup) {
      // รายการกลุ่ม: guest_email เป็นอีเมลผู้ประสานงาน ใช้เฉพาะรายชื่อผู้เข้าร่วม
      for (const att of payload.attendees) {
        const no = normalizeMemberNo(att?.memberNo || att?.member_no);
        if (no) memberNos.add(no);
        addEmail(att?.email);
      }
      continue;
    }
    const no = normalizeMemberNo(slip.member_no);
    if (no) memberNos.add(no);
    addEmail(slip.guest_email);
  }
  return {
    has: (person: { memberNo?: unknown; email?: unknown }) => {
      const no = normalizeMemberNo(person.memberNo);
      const mail = String(person.email ?? '').trim().toLowerCase();
      return Boolean((no && memberNos.has(no)) || (mail && emails.has(mail)));
    },
  };
}

export interface GuestRegistrationMatch {
  ticketCode: string | null;
  approved: boolean;
}

/**
 * หาการลงทะเบียนของบุคคลทั่วไปในงานประชุมจากอีเมล จากทุกช่องทาง
 * (รายบุคคล, รายชื่อในรายการกลุ่มที่ยังรอตรวจสอบ/อนุมัติแล้ว, สิทธิ์เข้าร่วมที่บันทึกแล้ว)
 * รายการกลุ่มเก็บอีเมลผู้เข้าร่วมไว้ใน selected_activities ส่วน guest_email เป็นอีเมลผู้ประสานงาน
 */
export async function findGuestRegistration(
  meetingId: string,
  email: string,
  options: { excludeSlipId?: string } = {}
): Promise<GuestRegistrationMatch | null> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) return null;

  const slips = await prisma.payment_slips.findMany({
    where: {
      meeting_id: meetingId,
      status: { in: ['pending', 'approved'] },
      ...(options.excludeSlipId ? { slip_id: { not: options.excludeSlipId } } : {}),
    },
    select: { slip_id: true, status: true, ticket_code: true, is_member: true, guest_email: true, selected_activities: true },
    orderBy: { created_at: 'asc' },
  });

  for (const slip of slips) {
    const payload = parseSlipPayload(slip.selected_activities);
    if (
      payload?.isFormatChange ||
      payload?.type === 'membership_registration' ||
      payload?.type === 'membership_group_registration'
    ) {
      continue;
    }
    const isGroup =
      payload && !Array.isArray(payload) && Array.isArray(payload.attendees) &&
      (payload.isGroup || slip.ticket_code?.startsWith('GRP'));

    const matched = isGroup
      ? payload.attendees.some(
          (a: any) =>
            !normalizeMemberNo(a?.memberNo || a?.member_no) &&
            String(a?.email || '').trim().toLowerCase() === cleanEmail
        )
      : slip.is_member === false && String(slip.guest_email || '').trim().toLowerCase() === cleanEmail;

    if (matched) return { ticketCode: slip.ticket_code, approved: slip.status === 'approved' };
  }

  const attendance = await prisma.meeting_attendances.findFirst({
    where: {
      meeting_id: meetingId,
      attendee_email: { equals: cleanEmail, mode: 'insensitive' },
      attendance_status: { notIn: ['Cancelled', 'Rejected'] },
    },
    select: { attendance_status: true },
  });
  if (attendance) {
    return { ticketCode: null, approved: ['Registered', 'Attended'].includes(attendance.attendance_status || '') };
  }

  return null;
}

/**
 * รวมกิจกรรมของผู้เข้าร่วมที่ลงทะเบียนเพิ่มเติมในรายการกลุ่ม (อนุมัติแล้ว) เข้ากับรายการลงทะเบียนเดิมของแต่ละคน
 * ไม่ย้ายยอดเงิน เพราะผู้จ่ายคือบริษัท — รายการกลุ่มยังเป็นหลักฐานการชำระและใบเสร็จของบริษัท
 * เรียกซ้ำได้อย่างปลอดภัย (ข้ามรายการเดิมที่รวมรายการกลุ่มนี้ไปแล้ว)
 */
export async function mergeGroupAddOnAttendees(groupSlipId: string): Promise<number> {
  const groupSlip = await prisma.payment_slips.findUnique({ where: { slip_id: groupSlipId } });
  const payload = parseSlipPayload(groupSlip?.selected_activities);
  if (!groupSlip || groupSlip.status !== 'approved' || !Array.isArray(payload?.attendees)) return 0;

  const meeting = await prisma.meetings.findUnique({
    where: { meeting_id: groupSlip.meeting_id },
    select: { activities: true },
  });

  let mergedCount = 0;
  for (const att of payload.attendees) {
    if (!att?.isAddOn || !att.addOnOriginalSlipId) continue;
    const newActs = groupAttendeeActivities(att, meeting?.activities);
    if (newActs.length === 0) continue;
    const memberKey = normalizeMemberNo(att.memberNo || att.member_no);

    await prisma.$transaction(async (tx) => {
      const original = await tx.payment_slips.findUnique({ where: { slip_id: att.addOnOriginalSlipId } });
      if (!original || original.status === 'rejected' || original.status === 'cancelled') return;
      const origPayload = parseSlipPayload(original.selected_activities);
      const addOnSlipIds: string[] = Array.isArray(origPayload?.addOnSlipIds) ? origPayload.addOnSlipIds : [];
      const marker = `${groupSlipId}:${memberKey}`;
      if (addOnSlipIds.includes(marker)) return;

      const appendNew = (list: any[]) => {
        const ids = new Set(list.map((a: any) => String(a?.id)));
        return [...list, ...newActs.filter((a: any) => !ids.has(String(a?.id)))];
      };

      let nextPayload: any;
      if (Array.isArray(origPayload?.attendees) && (origPayload.isGroup || original.ticket_code?.startsWith('GRP'))) {
        nextPayload = {
          ...origPayload,
          attendees: origPayload.attendees.map((o: any) => {
            if (o?.isAddOn || normalizeMemberNo(o?.memberNo || o?.member_no) !== memberKey) return o;
            const merged = appendNew(groupAttendeeActivities(o, meeting?.activities));
            const label = merged.map((a: any) => a.name).join(' + ');
            return {
              ...o,
              selectedActivities: merged,
              selectedProgramIds: merged.map((a: any) => a.id),
              programNameTh: label,
              programNameEn: label,
            };
          }),
        };
      } else if (Array.isArray(origPayload)) {
        nextPayload = appendNew(origPayload);
      } else {
        const listKey =
          !Array.isArray(origPayload?.activities) && Array.isArray(origPayload?.selectedActivities)
            ? 'selectedActivities'
            : 'activities';
        nextPayload = { ...(origPayload || {}), [listKey]: appendNew(slipActivityList(origPayload)) };
      }
      if (!Array.isArray(nextPayload)) nextPayload.addOnSlipIds = [...addOnSlipIds, marker];

      await tx.payment_slips.update({
        where: { slip_id: original.slip_id },
        data: { selected_activities: nextPayload },
      });
      mergedCount += 1;
    });
  }
  return mergedCount;
}
