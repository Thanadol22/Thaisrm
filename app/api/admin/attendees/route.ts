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
        select: {
          slip_id: true,
          meeting_id: true,
          member_no: true,
          guest_email: true,
          guest_phone: true,
          ticket_code: true,
          amount: true,
          status: true,
          transfer_date: true,
          is_member: true,
        },
      });
    }

    // Create a fast lookup map for slips
    const slipMapByMember = new Map<string, any>();
    const slipMapByEmail = new Map<string, any>();
    const slipMapByPhone = new Map<string, any>();

    slips.forEach((s: any) => {
      if (s.member_no) slipMapByMember.set(`${s.meeting_id}_${s.member_no}`, s);
      if (s.guest_email) slipMapByEmail.set(`${s.meeting_id}_${s.guest_email.toLowerCase()}`, s);
      if (s.guest_phone) slipMapByPhone.set(`${s.meeting_id}_${s.guest_phone}`, s);
    });

    // 3. Format attendee items
    const formattedAttendees = attendances.map((att: any) => {
      const isMember = !!att.members;
      const mem = att.members;

      // Find matching payment slip
      let matchingSlip: any = null;
      if (att.member_no) {
        matchingSlip = slipMapByMember.get(`${att.meeting_id}_${att.member_no}`);
      }
      if (!matchingSlip && att.attendee_email) {
        matchingSlip = slipMapByEmail.get(`${att.meeting_id}_${att.attendee_email.toLowerCase()}`);
      }
      if (!matchingSlip && att.attendee_phone) {
        matchingSlip = slipMapByPhone.get(`${att.meeting_id}_${att.attendee_phone}`);
      }

      const nameTh = isMember ? mem?.fullNameTh || 'สมาชิก' : att.attendee_name || 'ผู้สมัครทั่วไป';
      const nameEn = isMember ? mem?.fullNameEn || '' : '';
      const email = isMember ? mem?.email || '' : att.attendee_email || '';
      const phone = isMember ? mem?.mobile || '' : att.attendee_phone || '';
      const workplace = isMember ? mem?.workplace || '' : att.workplace || '';
      const id4Digits = isMember ? mem?.idLast4 || phone.slice(-4) : phone.slice(-4);
      const code = isMember ? mem?.member_no || '' : `G-${att.attendance_id.toString().padStart(4, '0')}`;

      // Ticket and Payment details
      let paymentStatus: 'paid' | 'pending' | 'unpaid' = 'unpaid';
      if (matchingSlip) {
        if (matchingSlip.status === 'approved') paymentStatus = 'paid';
        else if (matchingSlip.status === 'pending') paymentStatus = 'pending';
      } else if (att.attendance_status === 'Registered' || att.attendance_status === 'Attended') {
        paymentStatus = 'paid';
      }

      const ticketCode = matchingSlip?.ticket_code || `TSRM-${att.meeting_id}-${code || att.attendance_id}`;
      const ticketType = isMember
        ? `${mem?.membership_type === 'Lifelong' ? 'สมาชิกตลอดชีพ' : 'สมาชิกสามัญ'} Pass`
        : 'บุคคลทั่วไป (Walk-in / Non-Member Pass)';

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
        attendee_email: email || `${phone}@walkin.thaisrm.org`,
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
          guest_email: email || `${phone}@walkin.thaisrm.org`,
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
 * อัปเดตสถานะการเช็คอิน (Toggle Check-in / Check-out)
 */
export async function PATCH(request: NextRequest) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { attendanceId, action } = body;

    if (!attendanceId) {
      return NextResponse.json(
        { success: false, error: 'attendanceId is required' },
        { status: 400 }
      );
    }

    const attId = BigInt(attendanceId);

    const existing = await (prisma as any).meeting_attendances.findUnique({
      where: { attendance_id: attId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรายการผู้เข้าร่วมประชุมนี้' },
        { status: 404 }
      );
    }

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
        attendance_status: isCheckIn ? 'Attended' : 'Registered',
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
    console.error('Error updating attendance checkin:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะเช็คอิน' },
      { status: 500 }
    );
  }
}
