import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { isAddOnPayload } from '@/lib/services/registrationAddOnService';
import {
  assertSeatsForReactivatedSlip,
  countSlipSeatClaims,
  lockAndAssertSeats,
  SeatUnavailableError,
} from '@/lib/services/activitySeatService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type AttendeeProgram = { id: string; name: string };

type AttendeeMatch = { memberNo?: string | null; email?: string | null; phone?: string | null };

function parseActivities(rawActivities: any): any {
  if (typeof rawActivities !== 'string') return rawActivities || null;
  try {
    return JSON.parse(rawActivities);
  } catch {
    return null;
  }
}

function isGroupActivities(parsed: any): boolean {
  return Boolean(
    parsed &&
      !Array.isArray(parsed) &&
      (parsed.isGroup || parsed.type === 'conference_group_registration') &&
      Array.isArray(parsed.attendees)
  );
}

// หา attendee ในสลิปกลุ่มที่ตรงกับ member_no / email / phone
function findGroupPerson(parsed: any, match: AttendeeMatch): any | null {
  const cleanNo = match.memberNo ? String(match.memberNo).trim().replace(/^0+/, '') : '';
  const cleanEmail = match.email?.trim().toLowerCase() || '';
  const cleanPhone = match.phone?.trim() || '';
  return (
    parsed.attendees.find((g: any) => {
      const gNo = String(g?.memberNo || g?.member_no || '').trim().replace(/^0+/, '');
      const gEmail = String(g?.email || g?.attendee_email || '').trim().toLowerCase();
      const gPhone = String(g?.phone || g?.mobile || g?.attendee_phone || '').trim();
      return (cleanNo && gNo === cleanNo) || (cleanEmail && gEmail === cleanEmail) || (cleanPhone && gPhone === cleanPhone);
    }) || null
  );
}

/**
 * รูปแบบการเข้าร่วม (ออนไซต์ / ออนไลน์) จาก selected_activities ของสลิป
 * ไม่มีข้อมูลถือว่าเป็นออนไซต์ ตามค่าเริ่มต้นของฟอร์มลงทะเบียน
 */
function extractAttendanceType(rawActivities: any, match: AttendeeMatch): 'onsite' | 'online' {
  const parsed = parseActivities(rawActivities);
  if (!parsed) return 'onsite';
  const isOnline = (v: any) => String(v || '').toLowerCase() === 'online';

  if (Array.isArray(parsed)) return parsed.some((a: any) => isOnline(a?.format)) ? 'online' : 'onsite';
  if (typeof parsed !== 'object') return 'onsite';

  if (isGroupActivities(parsed)) {
    const person = findGroupPerson(parsed, match);
    return person && (isOnline(person.attendanceType) || isOnline(person.format)) ? 'online' : 'onsite';
  }

  return isOnline(parsed.attendanceType) ||
    isOnline(parsed.format) ||
    isOnline(parsed.targetFormat) ||
    isOnline(parsed.memberPayload?.attendanceType)
    ? 'online'
    : 'onsite';
}

/**
 * ดึงรายการโปรแกรมที่ผู้เข้าร่วมเลือกจาก selected_activities ของสลิป
 * - สลิปรายบุคคล: ใช้ activities ระดับบนสุด
 * - สลิปกลุ่ม: หา attendee ที่ตรงกับ member_no / email / phone แล้วใช้ activities ของคนนั้น
 */
function extractAttendeePrograms(rawActivities: any, match: AttendeeMatch): AttendeeProgram[] {
  const parsed = parseActivities(rawActivities);
  if (!parsed) return [];

  const toPrograms = (list: any[]): AttendeeProgram[] =>
    list
      .map((a: any) =>
        typeof a === 'string'
          ? { id: a, name: '' }
          : { id: String(a?.id ?? ''), name: String(a?.name ?? '') }
      )
      .filter((p) => p.id || p.name);

  if (Array.isArray(parsed)) return toPrograms(parsed);
  if (typeof parsed !== 'object') return [];

  if (isGroupActivities(parsed)) {
    const person = findGroupPerson(parsed, match);
    if (!person) return [];
    for (const list of [person.activities, person.selectedActivities, person.selectedProgramIds, person.selectedPrograms]) {
      if (Array.isArray(list) && list.length > 0) return toPrograms(list);
    }
    return [];
  }

  const list = Array.isArray(parsed.activities)
    ? parsed.activities
    : Array.isArray(parsed.selectedActivities)
      ? parsed.selectedActivities
      : [];
  return toPrograms(list);
}

/**
 * GET /api/admin/attendees
 * ดึงรายชื่อผู้ลงทะเบียน/ผู้เข้าร่วมประชุมทั้งหมดจากฐานข้อมูลจริง
 */
export async function GET(request: NextRequest) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');
    const search = searchParams.get('search');

    const whereClause: any = {};
    if (meetingId && meetingId !== 'all') {
      whereClause.meeting_id = meetingId;
    }

    // 1. Fetch attendances from database
    const attendances: any[] = await (prisma as any).meeting_attendances.findMany({
      where: whereClause,
      include: {
        members: {
          select: {
            member_no: true,
            fullNameTh: true,
            fullNameEn: true,
            idLast4: true,
            email: true,
            mobile: true,
            workplace: true,
            membership_type: true,
            membership_status: true,
          },
        },
        meetings: {
          select: {
            meeting_id: true,
            meeting_name: true,
            meeting_date: true,
            base_price: true,
          },
        },
      },
      orderBy: [
        { checkin_time: 'desc' },
        { attendance_id: 'desc' },
      ],
    });

    // 2. Fetch payment slips to map payment status & ticket info
    let slips: any[] = [];
    if ((prisma as any).payment_slips) {
      slips = await (prisma as any).payment_slips.findMany({
        where: meetingId && meetingId !== 'all' ? { meeting_id: meetingId } : {},
        orderBy: {
          created_at: 'desc',
        },
        select: {
          slip_id: true,
          meeting_id: true,
          member_no: true,
          guest_email: true,
          guest_phone: true,
          ticket_code: true,
          amount: true,
          status: true,
          rejection_reason: true,
          transfer_date: true,
          is_member: true,
          selected_activities: true,
        },
      });
      // รายการลงทะเบียนเพิ่มเติมไม่ใช่รายการหลักของผู้เข้าร่วม (อนุมัติแล้วจะรวมเข้ารายการเดิม)
      slips = slips.filter((s: any) => !isAddOnPayload(s.selected_activities));
    }

    // Fetch sponsor group members to enrich ticket_code & slip matching
    let sponsorGroupMembers: any[] = [];
    try {
      if ((prisma as any).sponsor_group_members) {
        sponsorGroupMembers = await (prisma as any).sponsor_group_members.findMany({
          where: meetingId && meetingId !== 'all' ? { meeting_id: meetingId } : {},
        });
      }
    } catch (e) {
      console.warn('Could not query sponsor_group_members:', e);
    }

    // Create a fast lookup map for slips by ticket_code, member_no, email, phone
    const slipMapByTicketCode = new Map<string, any>();
    const slipMapByMember = new Map<string, any>();
    const slipMapByEmail = new Map<string, any>();
    const slipMapByPhone = new Map<string, any>();

    slips.forEach((s: any) => {
      if (s.ticket_code && !slipMapByTicketCode.has(s.ticket_code)) {
        slipMapByTicketCode.set(s.ticket_code, s);
      }

      const registerMemberKey = (mNo: string) => {
        if (!mNo) return;
        const cleanNo = String(mNo).trim();
        const paddedNo = cleanNo.padStart(4, '0');
        if (!slipMapByMember.has(`${s.meeting_id}_${cleanNo}`)) {
          slipMapByMember.set(`${s.meeting_id}_${cleanNo}`, s);
        }
        if (!slipMapByMember.has(`${s.meeting_id}_${paddedNo}`)) {
          slipMapByMember.set(`${s.meeting_id}_${paddedNo}`, s);
        }
      };

      const registerEmailKey = (em: string) => {
        if (!em) return;
        const cleanEm = em.trim().toLowerCase();
        if (!slipMapByEmail.has(`${s.meeting_id}_${cleanEm}`)) {
          slipMapByEmail.set(`${s.meeting_id}_${cleanEm}`, s);
        }
      };

      const registerPhoneKey = (ph: string) => {
        if (!ph) return;
        const cleanPh = ph.trim();
        if (!slipMapByPhone.has(`${s.meeting_id}_${cleanPh}`)) {
          slipMapByPhone.set(`${s.meeting_id}_${cleanPh}`, s);
        }
      };

      // 1. Map top-level slip fields
      if (s.member_no) registerMemberKey(s.member_no);
      if (s.guest_email) registerEmailKey(s.guest_email);
      if (s.guest_phone) registerPhoneKey(s.guest_phone);

      // 2. Map all group attendees from selected_activities
      let actObj = s.selected_activities;
      if (typeof actObj === 'string') {
        try {
          actObj = JSON.parse(actObj);
        } catch {
          actObj = null;
        }
      }

      if (actObj && typeof actObj === 'object') {
        const attendees = actObj.attendees || actObj.applicants || [];
        if (Array.isArray(attendees)) {
          attendees.forEach((att: any) => {
            // ผู้ที่ลงเพิ่มซึ่งมีรายการเดิมอยู่แล้ว ใช้รายการเดิมเป็นรายการหลัก (กิจกรรมถูกรวมไว้ที่รายการเดิม)
            if (att.isAddOn && att.addOnOriginalSlipId) return;
            if (att.memberNo) registerMemberKey(att.memberNo);
            if (att.member_no) registerMemberKey(att.member_no);
            if (att.email) registerEmailKey(att.email);
            if (att.attendee_email) registerEmailKey(att.attendee_email);
            if (att.phone) registerPhoneKey(att.phone);
            if (att.mobile) registerPhoneKey(att.mobile);
            if (att.attendee_phone) registerPhoneKey(att.attendee_phone);
          });
        }
      }
    });

    // 3. Map from sponsor_group_members table
    sponsorGroupMembers.forEach((sgm: any) => {
      const s = sgm.ticket_code ? slipMapByTicketCode.get(sgm.ticket_code) : null;
      if (s) {
        if (sgm.member_no) {
          const cleanNo = String(sgm.member_no).trim();
          const paddedNo = cleanNo.padStart(4, '0');
          if (!slipMapByMember.has(`${s.meeting_id}_${cleanNo}`)) {
            slipMapByMember.set(`${s.meeting_id}_${cleanNo}`, s);
          }
          if (!slipMapByMember.has(`${s.meeting_id}_${paddedNo}`)) {
            slipMapByMember.set(`${s.meeting_id}_${paddedNo}`, s);
          }
        }
        if (sgm.attendee_email) {
          const cleanEm = sgm.attendee_email.trim().toLowerCase();
          if (!slipMapByEmail.has(`${s.meeting_id}_${cleanEm}`)) {
            slipMapByEmail.set(`${s.meeting_id}_${cleanEm}`, s);
          }
        }
      }
    });

    // 3. Deduplicate attendances (Filter out ghost non-member records if a member record already exists, or if duplicate non-member rows exist)
    const memberAttendanceKeys = new Set<string>();
    const seenNonMemberKeys = new Set<string>();
    const ghostAttendanceIdsToDelete: any[] = [];

    // Index all member attendances in this meeting
    attendances.forEach((att: any) => {
      if (att.member_no && att.members) {
        if (att.members.email) memberAttendanceKeys.add(`${att.meeting_id}_${att.members.email.trim().toLowerCase()}`);
        if (att.members.mobile) memberAttendanceKeys.add(`${att.meeting_id}_${att.members.mobile.trim()}`);
        if (att.members.fullNameTh) memberAttendanceKeys.add(`${att.meeting_id}_${att.members.fullNameTh.trim()}`);
      }
    });

    const cleanAttendances = attendances.filter((att: any) => {
      if (att.member_no && att.members) return true;

      // Non-member attendance check
      const attEmail = att.attendee_email?.trim()?.toLowerCase() || '';
      const attPhone = att.attendee_phone?.trim() || '';
      const attName = att.attendee_name?.trim() || '';

      // If matches an existing member attendance in the same meeting, this is a ghost duplicate
      if (
        (attEmail && memberAttendanceKeys.has(`${att.meeting_id}_${attEmail}`)) ||
        (attPhone && attName && memberAttendanceKeys.has(`${att.meeting_id}_${attPhone}`))
      ) {
        ghostAttendanceIdsToDelete.push(att.attendance_id);
        return false;
      }

      // Check duplicate non-member in same meeting
      const nonMemKey = `${att.meeting_id}_${attEmail || (attName + '_' + attPhone)}`;
      if (seenNonMemberKeys.has(nonMemKey)) {
        ghostAttendanceIdsToDelete.push(att.attendance_id);
        return false;
      }
      seenNonMemberKeys.add(nonMemKey);
      return true;
    });

    // Prune ghost attendance IDs if any found in background
    if (ghostAttendanceIdsToDelete.length > 0) {
      (prisma as any).meeting_attendances.deleteMany({
        where: {
          attendance_id: { in: ghostAttendanceIdsToDelete },
        },
      }).catch((e: any) => console.warn('Pruning ghost attendances:', e));
    }

    // 4. Format attendee items
    const formattedAttendees = cleanAttendances.map((att: any) => {
      const isMember = !!att.members;
      const mem = att.members;

      // Find matching payment slip
      let matchingSlip: any = null;
      if (att.member_no) {
        const cleanNo = String(att.member_no).trim();
        const paddedNo = cleanNo.padStart(4, '0');
        matchingSlip = slipMapByMember.get(`${att.meeting_id}_${cleanNo}`) || slipMapByMember.get(`${att.meeting_id}_${paddedNo}`);
      }
      if (!matchingSlip && att.attendee_email) {
        matchingSlip = slipMapByEmail.get(`${att.meeting_id}_${att.attendee_email.toLowerCase().trim()}`);
      }
      if (!matchingSlip && att.attendee_phone) {
        matchingSlip = slipMapByPhone.get(`${att.meeting_id}_${att.attendee_phone.trim()}`);
      }
      if (!matchingSlip && mem?.email) {
        matchingSlip = slipMapByEmail.get(`${att.meeting_id}_${mem.email.toLowerCase().trim()}`);
      }
      if (!matchingSlip && mem?.mobile) {
        matchingSlip = slipMapByPhone.get(`${att.meeting_id}_${mem.mobile.trim()}`);
      }

      // If matched via sponsor_group_members
      if (!matchingSlip) {
        const matchedSgm = sponsorGroupMembers.find((sg: any) =>
          (att.member_no && String(sg.member_no).trim() === String(att.member_no).trim()) ||
          (att.attendee_email && sg.attendee_email?.trim()?.toLowerCase() === att.attendee_email.trim().toLowerCase())
        );
        if (matchedSgm?.ticket_code) {
          matchingSlip = slipMapByTicketCode.get(matchedSgm.ticket_code);
        }
      }

      const nameTh = isMember ? mem?.fullNameTh || 'สมาชิก' : att.attendee_name || 'ผู้สมัครทั่วไป';
      const nameEn = isMember ? mem?.fullNameEn || '' : '';
      const email = isMember ? mem?.email || '' : att.attendee_email || '';
      const phone = isMember ? mem?.mobile || '' : att.attendee_phone || '';
      // สมาชิก: ใช้หน่วยงานที่กรอกในฟอร์มลงทะเบียนครั้งนี้ก่อน หากไม่มีจึงใช้ข้อมูลจากทะเบียนสมาชิก
      let slipWorkplace = '';
      if (isMember && matchingSlip?.selected_activities) {
        let slipAct = matchingSlip.selected_activities;
        if (typeof slipAct === 'string') {
          try {
            slipAct = JSON.parse(slipAct);
          } catch {
            slipAct = null;
          }
        }
        if (slipAct && typeof slipAct === 'object' && !Array.isArray(slipAct)) {
          slipWorkplace = slipAct.workplace || slipAct.memberPayload?.workplace || '';
        }
      }
      const workplace = isMember ? att.workplace || slipWorkplace || mem?.workplace || '' : att.workplace || '';
      const id4Digits = isMember ? mem?.idLast4 || phone.slice(-4) : phone.slice(-4);
      const code = isMember ? mem?.member_no || '' : `G-${att.attendance_id.toString().padStart(4, '0')}`;

      // Ticket and Payment details
      let paymentStatus: 'paid' | 'pending' | 'rejected' | 'unpaid' = 'unpaid';
      if (att.attendance_status === 'Registered' || att.attendance_status === 'Attended') {
        // หากได้รับการอนุมัติสิทธิ์แล้ว ให้คงสถานะชำระแล้ว (paid) ไว้เสมอ
        paymentStatus = 'paid';
      } else if (matchingSlip) {
        if (matchingSlip.status === 'approved') paymentStatus = 'paid';
        else if (matchingSlip.status === 'pending') paymentStatus = 'pending';
        else if (matchingSlip.status === 'rejected') paymentStatus = 'rejected';
      } else if (att.attendance_status === 'Rejected') {
        paymentStatus = 'rejected';
      } else if (att.attendance_status === 'Pending_Payment' || att.attendance_status === 'Non-Member-Pending') {
        paymentStatus = 'pending';
      }

      const ticketCode = matchingSlip?.ticket_code || `TSRM-${att.meeting_id}-${code || att.attendance_id}`;
      const ticketType = isMember
        ? `${mem?.membership_type === 'Lifelong' ? 'สมาชิกตลอดชีพ' : 'สมาชิกสามัญ'}`
        : 'บุคคลทั่วไป';

      const isCheckedIn = att.checkin_time !== null || att.attendance_status === 'Attended';
      const checkInTimeFormatted = att.checkin_time
        ? new Date(att.checkin_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) + ' น.'
        : undefined;

      const attendeeMatch = {
        memberNo: att.member_no,
        email: email || att.attendee_email,
        phone: phone || att.attendee_phone,
      };
      const programs = matchingSlip ? extractAttendeePrograms(matchingSlip.selected_activities, attendeeMatch) : [];
      const attendanceType = matchingSlip
        ? extractAttendanceType(matchingSlip.selected_activities, attendeeMatch)
        : 'onsite';

      return {
        id: att.attendance_id.toString(),
        code,
        programs,
        attendanceType,
        nameTh,
        nameEn,
        id4Digits,
        email,
        phone,
        workplace,
        memberType: isMember ? (mem?.membership_type === 'Lifelong' ? 'สมาชิกตลอดชีพ' : 'สมาชิกสามัญ') : 'บุคคลทั่วไป',
        ticketType,
        ticketCode,
        slipId: matchingSlip?.slip_id || null,
        rejectionReason: matchingSlip?.rejection_reason || null,
        meetingId: att.meeting_id,
        meetingTitle: att.meetings?.meeting_name || att.meeting_id,
        registeredDate: matchingSlip?.transfer_date || (att.meetings?.meeting_date ? new Date(att.meetings.meeting_date).toLocaleDateString('th-TH') : '10 มี.ค. 2569'),
        paymentStatus,
        checkInStatus: (isCheckedIn ? 'checked_in' : 'not_checked_in') as 'checked_in' | 'not_checked_in',
        checkInTime: checkInTimeFormatted,
      };
    });

    // Apply text search if requested
    let result = formattedAttendees;
    if (search) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.nameTh.toLowerCase().includes(q) ||
          a.nameEn.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q) ||
          a.phone.includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.workplace.toLowerCase().includes(q) ||
          a.ticketCode.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      total: result.length,
    });
  } catch (error: any) {
    console.error('Error fetching admin attendees:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้เข้าร่วม' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/attendees
 * บันทึกผู้เข้าร่วมประชุมแบบ Walk-in ลงฐานข้อมูลจริง
 */
export async function POST(request: NextRequest) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const {
      meetingId,
      nameTh,
      nameEn,
      phone,
      email,
      workplace,
      memberType,
      ticketType,
      paymentStatus = 'paid',
      checkInNow = true,
      amount = 3500,
      programs = [],
      position,
    } = body;

    if (!meetingId || !nameTh || !phone) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน: กรุณาระบุรหัสการประชุม, ชื่อ-นามสกุล และเบอร์โทรศัพท์' },
        { status: 400 }
      );
    }

    const activities = (Array.isArray(programs) ? programs : [])
      .map((p: any) => ({ id: String(p?.id ?? ''), name: String(p?.name ?? '') }))
      .filter((p: AttendeeProgram) => p.id || p.name);
    const selectedActivities =
      activities.length > 0 || position ? { activities, position: position || null, memberType, ticketType } : null;
    const parsedAmount = Number(amount);
    const slipAmount = Number.isFinite(parsedAmount) && parsedAmount >= 0 ? parsedAmount : 3500;
    const createSlip = paymentStatus === 'paid' && Boolean((prisma as any).payment_slips);

    const { attendance, ticketCode } = await prisma.$transaction(async (tx: any) => {
      // ตรวจที่นั่งเวิร์กช็อปที่จำกัดจำนวน (นับเฉพาะรายการที่มีสลิป)
      if (createSlip && selectedActivities) {
        const meeting = await tx.meetings.findUnique({ where: { meeting_id: meetingId }, select: { activities: true } });
        const requested = countSlipSeatClaims({ selected_activities: selectedActivities }, meeting?.activities);
        await lockAndAssertSeats(tx, meetingId, requested, { meetingActivities: meeting?.activities });
      }

      // 1. Create meeting_attendances record
      const created = await tx.meeting_attendances.create({
        data: {
          meeting_id: meetingId,
          attendee_name: nameTh,
          attendee_email: email || `${phone}@walkin.tsrm.org`,
          attendee_phone: phone,
          workplace: workplace || 'โรงพยาบาล/คลินิก',
          attendance_status: checkInNow ? 'Attended' : 'Registered',
          checkin_time: checkInNow ? new Date() : null,
        },
      });

      const code = `TSRM-WALKIN-${created.attendance_id}`;

      // 2. Create payment slip record if paid
      if (createSlip) {
        await tx.payment_slips.create({
          data: {
            meeting_id: meetingId,
            guest_name: nameTh,
            guest_email: email || `${phone}@walkin.tsrm.org`,
            guest_phone: phone,
            guest_workplace: workplace || 'โรงพยาบาล/คลินิก',
            is_member: false,
            ticket_code: code,
            amount: slipAmount,
            selected_activities: selectedActivities ?? undefined,
            bank: 'เงินสด / Walk-in Counter',
            transfer_date: new Date().toLocaleDateString('th-TH'),
            transfer_time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            slip_url: '/walkin-receipt.png',
            status: 'approved',
            reviewed_by: 'Admin Walk-in',
            reviewed_at: new Date(),
          },
        });
      }

      return { attendance: created, ticketCode: code };
    });

    return NextResponse.json({
      success: true,
      data: {
        id: attendance.attendance_id.toString(),
        ticketCode,
        message: 'บันทึกผู้เข้าร่วม Walk-in สำเร็จ',
      },
    });
  } catch (error: any) {
    if (error instanceof SeatUnavailableError) {
      return NextResponse.json(
        { success: false, error: error.message, code: 'SEATS_UNAVAILABLE' },
        { status: 409 }
      );
    }
    console.error('Error creating walk-in attendee:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/attendees
 * อัปเดตสถานะการเช็คอิน (Toggle Check-in / Check-out) หรือ ปรับปรุงสถานะการชำระเงิน (paid / pending / rejected)
 */
export async function PATCH(request: NextRequest) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { attendanceId, action, paymentStatus, rejectionReason } = body;

    if (!attendanceId) {
      return NextResponse.json(
        { success: false, error: 'attendanceId is required' },
        { status: 400 }
      );
    }

    const attId = BigInt(attendanceId);

    const existing = await (prisma as any).meeting_attendances.findUnique({
      where: { attendance_id: attId },
      include: {
        members: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรายการผู้เข้าร่วมประชุมนี้' },
        { status: 404 }
      );
    }

    // Handle Payment Status Update Action
    if (paymentStatus || action === 'update_payment_status') {
      const targetPaymentStatus = paymentStatus as 'paid' | 'pending' | 'rejected';

      // Find corresponding payment slip
      const slipWhereOr: any[] = [];
      if (existing.member_no) slipWhereOr.push({ member_no: existing.member_no });
      if (existing.attendee_email) slipWhereOr.push({ guest_email: existing.attendee_email });
      if (existing.attendee_phone) slipWhereOr.push({ guest_phone: existing.attendee_phone });

      const slip = slipWhereOr.length > 0 && (prisma as any).payment_slips
        ? await (prisma as any).payment_slips.findFirst({
            where: {
              meeting_id: existing.meeting_id,
              OR: slipWhereOr,
            },
            orderBy: { created_at: 'desc' },
          })
        : null;

      // รายการที่ถูกปฏิเสธคืนที่นั่งไปแล้ว: เปลี่ยนกลับได้เฉพาะเมื่อเวิร์กช็อปยังมีที่นั่งเหลือ
      if (slip?.status === 'rejected' && targetPaymentStatus !== 'rejected') {
        try {
          await assertSeatsForReactivatedSlip(slip);
        } catch (seatErr) {
          if (seatErr instanceof SeatUnavailableError) {
            return NextResponse.json(
              { success: false, error: seatErr.message, code: 'SEATS_UNAVAILABLE' },
              { status: 409 }
            );
          }
          throw seatErr;
        }
      }

      let nextAttendanceStatus = existing.attendance_status;
      if (targetPaymentStatus === 'paid') {
        nextAttendanceStatus = existing.checkin_time ? 'Attended' : 'Registered';
      } else if (targetPaymentStatus === 'rejected') {
        nextAttendanceStatus = 'Rejected';
      } else if (targetPaymentStatus === 'pending') {
        nextAttendanceStatus = 'Pending_Payment';
      }

      await (prisma as any).meeting_attendances.update({
        where: { attendance_id: attId },
        data: {
          attendance_status: nextAttendanceStatus,
        },
      });

      // Update corresponding payment slip
      if (slip) {
        const slipStatus = targetPaymentStatus === 'paid' ? 'approved' : targetPaymentStatus;
        await (prisma as any).payment_slips.update({
          where: { slip_id: slip.slip_id },
          data: {
            status: slipStatus,
            rejection_reason: targetPaymentStatus === 'rejected' ? (rejectionReason || 'ผู้ดูแลระบบปฏิเสธการชำระเงิน') : null,
            reviewed_by: session.username || 'Admin',
            reviewed_at: new Date(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          id: existing.attendance_id.toString(),
          paymentStatus: targetPaymentStatus,
          attendanceStatus: nextAttendanceStatus,
          message: `อัปเดตสถานะการชำระเงินเป็น "${targetPaymentStatus === 'paid' ? 'ชำระแล้ว' : targetPaymentStatus === 'rejected' ? 'สลิปถูกปฏิเสธ' : 'รอชำระ'}" สำเร็จ`,
        },
      });
    }

    // Handle Check-in / Check-out Action
    let isCheckIn = false;
    if (action === 'checkin') {
      isCheckIn = true;
    } else if (action === 'checkout') {
      isCheckIn = false;
    } else {
      // Toggle
      isCheckIn = existing.checkin_time === null;
    }

    const updated = await (prisma as any).meeting_attendances.update({
      where: { attendance_id: attId },
      data: {
        checkin_time: isCheckIn ? new Date() : null,
        attendance_status: isCheckIn ? 'Attended' : (existing.attendance_status === 'Rejected' ? 'Rejected' : 'Registered'),
      },
    });

    const checkInTimeFormatted = updated.checkin_time
      ? new Date(updated.checkin_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) + ' น.'
      : undefined;

    return NextResponse.json({
      success: true,
      data: {
        id: updated.attendance_id.toString(),
        checkInStatus: isCheckIn ? 'checked_in' : 'not_checked_in',
        checkInTime: checkInTimeFormatted,
        message: isCheckIn ? 'เช็คอินสำเร็จ' : 'ยกเลิกการเช็คอินสำเร็จ',
      },
    });
  } catch (error: any) {
    console.error('Error updating attendance:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' },
      { status: 500 }
    );
  }
}
