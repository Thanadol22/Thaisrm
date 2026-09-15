import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { meetingId, code, staffPin } = body;

    const rawCode = (code || '').toString().trim();
    if (!rawCode) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุรหัสตั๋ว เลขสมาชิก หรือข้อมูล QR Code' },
        { status: 400 }
      );
    }

    // 1. Resolve Target Meeting
    let targetMeetingId = meetingId;
    if (!targetMeetingId) {
      // Find by staffPin if provided
      if (staffPin) {
        const m = await prisma.meetings.findFirst({
          where: { staff_code: staffPin.toString().trim() },
          select: { meeting_id: true },
        });
        if (m) targetMeetingId = m.meeting_id;
      }

      // If still not resolved, pick latest upcoming or ongoing meeting
      if (!targetMeetingId) {
        const latestM = await prisma.meetings.findFirst({
          where: { status: { in: ['ongoing', 'upcoming'] } },
          orderBy: { meeting_date: 'desc' },
          select: { meeting_id: true },
        });
        targetMeetingId = latestM?.meeting_id;
      }

      // Absolute fallback: any latest meeting
      if (!targetMeetingId) {
        const anyM = await prisma.meetings.findFirst({
          orderBy: { meeting_date: 'desc' },
          select: { meeting_id: true },
        });
        targetMeetingId = anyM?.meeting_id;
      }
    }

    if (!targetMeetingId) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรอบการประชุมที่เปิดใช้งาน' },
        { status: 404 }
      );
    }

    // 2. Parse decoded code (Handle JSON QR Code if present)
    let searchCode = rawCode;
    try {
      if (rawCode.startsWith('{') && rawCode.endsWith('}')) {
        const parsed = JSON.parse(rawCode);
        searchCode = parsed.code || parsed.ticket_code || parsed.ticketCode || parsed.member_no || parsed.memberNo || parsed.id || rawCode;
      }
    } catch {
      // Not JSON, continue with raw string
    }

    const trimmedSearch = searchCode.trim();
    const upperCode = trimmedSearch.toUpperCase();

    // 3. Search in database for meeting_attendances matching this meeting
    // We search through:
    // A) Exact member_no
    // B) Padded member_no (e.g. "12" -> "0012")
    // C) Attendance ID (if numeric)
    // D) Attendee phone or email
    // E) Payment slip ticket_code associated with this meeting

    let matchedAttendance: any = null;

    // A) Try finding via payment_slips ticket_code first
    const matchingSlip = await prisma.payment_slips.findFirst({
      where: {
        meeting_id: targetMeetingId,
        OR: [
          { ticket_code: { equals: trimmedSearch, mode: 'insensitive' } },
          { ticket_code: { equals: upperCode, mode: 'insensitive' } },
          { slip_id: { equals: trimmedSearch, mode: 'insensitive' } },
        ],
      },
      select: {
        slip_id: true,
        ticket_code: true,
        member_no: true,
        guest_name: true,
        guest_email: true,
        guest_phone: true,
        guest_workplace: true,
        is_member: true,
        amount: true,
      },
    });

    if (matchingSlip) {
      if (matchingSlip.member_no) {
        matchedAttendance = await prisma.meeting_attendances.findFirst({
          where: {
            meeting_id: targetMeetingId,
            member_no: matchingSlip.member_no,
          },
          include: {
            members: true,
            meetings: true,
          },
        });
      } else if (matchingSlip.guest_email || matchingSlip.guest_phone) {
        matchedAttendance = await prisma.meeting_attendances.findFirst({
          where: {
            meeting_id: targetMeetingId,
            OR: [
              ...(matchingSlip.guest_email ? [{ attendee_email: matchingSlip.guest_email }] : []),
              ...(matchingSlip.guest_phone ? [{ attendee_phone: matchingSlip.guest_phone }] : []),
            ],
          },
          include: {
            members: true,
            meetings: true,
          },
        });
      }
    }

    // B) Direct search in meeting_attendances and members
    if (!matchedAttendance) {
      // Possible clean member numbers e.g. "0012", "12", "TSRM-2026-0012" -> "0012"
      const padded4 = /^\d{1,4}$/.test(trimmedSearch) ? trimmedSearch.padStart(4, '0') : null;
      let memberNoExtracted: string | null = null;
      const tsrmMatch = trimmedSearch.match(/TSRM[-_]?\d*[-_]?(\d{1,4})/i);
      if (tsrmMatch && tsrmMatch[1]) {
        memberNoExtracted = tsrmMatch[1].padStart(4, '0');
      }

      const orConditions: any[] = [
        { member_no: trimmedSearch },
        ...(padded4 ? [{ member_no: padded4 }] : []),
        ...(memberNoExtracted ? [{ member_no: memberNoExtracted }] : []),
        { attendee_email: { equals: trimmedSearch, mode: 'insensitive' } },
        { attendee_phone: trimmedSearch },
        { attendee_name: { contains: trimmedSearch, mode: 'insensitive' } },
        { members: { fullNameTh: { contains: trimmedSearch, mode: 'insensitive' } } },
        { members: { mobile: trimmedSearch } },
        { members: { email: { equals: trimmedSearch, mode: 'insensitive' } } },
      ];

      // If purely numeric and large, check attendance_id
      if (/^\d+$/.test(trimmedSearch)) {
        try {
          orConditions.push({ attendance_id: BigInt(trimmedSearch) });
        } catch {
          // ignore BigInt parse failure
        }
      }

      matchedAttendance = await prisma.meeting_attendances.findFirst({
        where: {
          meeting_id: targetMeetingId,
          OR: orConditions,
        },
        include: {
          members: true,
          meetings: true,
        },
      });
    }

    // 4. Handle Result Scenarios

    // Case 1: NOT FOUND (Invalid)
    if (!matchedAttendance) {
      // Recalculate stats for response
      const [totalCount, checkedInCount] = await Promise.all([
        prisma.meeting_attendances.count({
          where: { meeting_id: targetMeetingId },
        }),
        prisma.meeting_attendances.count({
          where: {
            meeting_id: targetMeetingId,
            OR: [
              { checkin_time: { not: null } },
              { attendance_status: 'Attended' },
            ],
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        status: 'invalid',
        message: 'ไม่พบข้อมูลผู้ลงทะเบียนในการประชุมนี้ หรือรหัสไม่ถูกต้อง',
        record: {
          id: trimmedSearch,
          name: 'ไม่พบข้อมูลในระบบ',
          ticketType: 'N/A',
          email: 'N/A',
          checkInTime: 'N/A',
          status: 'invalid',
        },
        stats: {
          total: totalCount,
          checkedIn: checkedInCount,
        },
      });
    }

    // Prepare Attendee Display Info
    const isMember = !!matchedAttendance.members;
    const mem = matchedAttendance.members;
    const displayName = isMember
      ? (mem?.fullNameTh || 'สมาชิกสมาคมฯ')
      : (matchedAttendance.attendee_name || 'ผู้ลงทะเบียนทั่วไป');
    const displayEmail = isMember ? (mem?.email || '-') : (matchedAttendance.attendee_email || '-');
    const displayTicketType = isMember
      ? `${mem?.membership_type === 'Lifelong' ? 'สมาชิกตลอดชีพ' : 'สมาชิกสามัญ'} Pass`
      : 'บุคคลทั่วไป (Non-Member Pass)';
    const displayCode = matchingSlip?.ticket_code || (isMember ? `TSRM-MEM-${mem?.member_no}` : `TSRM-TKT-${matchedAttendance.attendance_id}`);

    // Case 2: ALREADY CHECKED IN (Duplicate Scan)
    // Rule: ห้ามแก้ไขข้อมูลในฐานข้อมูลเด็ดขาด! คงสถานะและเวลาสำเร็จเดิมไว้ แล้วส่งผล duplicate กลับไป
    if (matchedAttendance.checkin_time !== null || matchedAttendance.attendance_status === 'Attended') {
      const existingTime = matchedAttendance.checkin_time
        ? new Date(matchedAttendance.checkin_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) + ' น.'
        : 'ก่อนหน้านี้';

      const [totalCount, checkedInCount] = await Promise.all([
        prisma.meeting_attendances.count({
          where: { meeting_id: targetMeetingId },
        }),
        prisma.meeting_attendances.count({
          where: {
            meeting_id: targetMeetingId,
            OR: [
              { checkin_time: { not: null } },
              { attendance_status: 'Attended' },
            ],
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        status: 'duplicate',
        message: `ผู้เข้าร่วมท่านนี้ได้สแกนเช็คอินสำเร็จไปแล้วเมื่อ ${existingTime}`,
        record: {
          id: displayCode,
          name: displayName,
          ticketType: displayTicketType,
          email: displayEmail,
          checkInTime: existingTime,
          status: 'duplicate',
        },
        stats: {
          total: totalCount,
          checkedIn: checkedInCount,
        },
      });
    }

    // Case 3: FIRST TIME CHECK-IN (Success)
    // Concurrency Guard: Update only if checkin_time is still null
    const checkinDate = new Date();
    const updateResult = await prisma.meeting_attendances.updateMany({
      where: {
        attendance_id: matchedAttendance.attendance_id,
        checkin_time: null,
      },
      data: {
        checkin_time: checkinDate,
        attendance_status: 'Attended',
      },
    });

    // In case another staff scanned at the exact same millisecond
    if (updateResult.count === 0) {
      // Re-fetch existing checkin time
      const freshAtt = await prisma.meeting_attendances.findUnique({
        where: { attendance_id: matchedAttendance.attendance_id },
      });
      const freshTime = freshAtt?.checkin_time
        ? new Date(freshAtt.checkin_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) + ' น.'
        : 'เมื่อสักครู่';

      const [totalCount, checkedInCount] = await Promise.all([
        prisma.meeting_attendances.count({
          where: { meeting_id: targetMeetingId },
        }),
        prisma.meeting_attendances.count({
          where: {
            meeting_id: targetMeetingId,
            OR: [
              { checkin_time: { not: null } },
              { attendance_status: 'Attended' },
            ],
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        status: 'duplicate',
        message: `ผู้เข้าร่วมท่านนี้ได้สแกนเช็คอินสำเร็จไปแล้วเมื่อ ${freshTime}`,
        record: {
          id: displayCode,
          name: displayName,
          ticketType: displayTicketType,
          email: displayEmail,
          checkInTime: freshTime,
          status: 'duplicate',
        },
        stats: {
          total: totalCount,
          checkedIn: checkedInCount,
        },
      });
    }

    const checkInTimeFormatted = checkinDate.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Bangkok',
    }) + ' น.';

    // Recalculate stats after successful check-in
    const [totalCount, checkedInCount] = await Promise.all([
      prisma.meeting_attendances.count({
        where: { meeting_id: targetMeetingId },
      }),
      prisma.meeting_attendances.count({
        where: {
          meeting_id: targetMeetingId,
          OR: [
            { checkin_time: { not: null } },
            { attendance_status: 'Attended' },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      status: 'success',
      message: 'เช็คอินสำเร็จ',
      record: {
        id: displayCode,
        name: displayName,
        ticketType: displayTicketType,
        email: displayEmail,
        checkInTime: checkInTimeFormatted,
        status: 'success',
      },
      stats: {
        total: totalCount,
        checkedIn: checkedInCount,
      },
    });
  } catch (error: any) {
    console.error('Staff Check-in Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการประมวลผลการสแกน' },
      { status: 500 }
    );
  }
}
