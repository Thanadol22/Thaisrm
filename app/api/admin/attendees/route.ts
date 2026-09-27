import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // 3. Format attendee items
    const formattedAttendees = attendances.map((att: any) => {
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
      const workplace = isMember ? mem?.workplace || '' : att.workplace || '';
      const id4Digits = isMember ? mem?.idLast4 || phone.slice(-4) : phone.slice(-4);
      const code = isMember ? mem?.member_no || '' : `G-${att.attendance_id.toString().padStart(4, '0')}`;

      // Ticket and Payment details
      let paymentStatus: 'paid' | 'pending' | 'rejected' | 'unpaid' = 'unpaid';
      if (matchingSlip) {
        if (matchingSlip.status === 'approved') paymentStatus = 'paid';
        else if (matchingSlip.status === 'pending') paymentStatus = 'pending';
        else if (matchingSlip.status === 'rejected') paymentStatus = 'rejected';
      } else if (att.attendance_status === 'Registered' || att.attendance_status === 'Attended') {
        paymentStatus = 'paid';
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

      return {
        id: att.attendance_id.toString(),
        code,
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
    } = body;

    if (!meetingId || !nameTh || !phone) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน: กรุณาระบุรหัสการประชุม, ชื่อ-นามสกุล และเบอร์โทรศัพท์' },
        { status: 400 }
      );
    }

    // 1. Create meeting_attendances record
    const attendance = await (prisma as any).meeting_attendances.create({
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

    const ticketCode = `TSRM-WALKIN-${attendance.attendance_id}`;

    // 2. Create payment slip record if paid
    if (paymentStatus === 'paid' && (prisma as any).payment_slips) {
      await (prisma as any).payment_slips.create({
        data: {
          meeting_id: meetingId,
          guest_name: nameTh,
          guest_email: email || `${phone}@walkin.tsrm.org`,
          guest_phone: phone,
          guest_workplace: workplace || 'โรงพยาบาล/คลินิก',
          is_member: false,
          ticket_code: ticketCode,
          amount: Number(amount) || 3500,
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

    return NextResponse.json({
      success: true,
      data: {
        id: attendance.attendance_id.toString(),
        ticketCode,
        message: 'บันทึกผู้เข้าร่วม Walk-in สำเร็จ',
      },
    });
  } catch (error: any) {
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

      // Update or find corresponding payment slip
      const slipWhereOr: any[] = [];
      if (existing.member_no) slipWhereOr.push({ member_no: existing.member_no });
      if (existing.attendee_email) slipWhereOr.push({ guest_email: existing.attendee_email });
      if (existing.attendee_phone) slipWhereOr.push({ guest_phone: existing.attendee_phone });

      if (slipWhereOr.length > 0 && (prisma as any).payment_slips) {
        const slip = await (prisma as any).payment_slips.findFirst({
          where: {
            meeting_id: existing.meeting_id,
            OR: slipWhereOr,
          },
          orderBy: { created_at: 'desc' },
        });

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
