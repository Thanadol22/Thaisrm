import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/meetings/[meetingId]/change-format?query=...
 * Search for an existing registration to request attendance format change.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.trim() || '';

    if (!meetingId) {
      return NextResponse.json(
        { success: false, error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุเลขสมาชิก, Ticket Code หรืออีเมลเพื่อค้นหา' },
        { status: 400 }
      );
    }

    // 1. Fetch meeting configuration & change format policy
    let meeting = await prisma.meetings.findUnique({
      where: { meeting_id: meetingId },
    });

    if (!meeting) {
      meeting = await prisma.meetings.findFirst({
        where: {
          OR: [
            { meeting_id: { equals: meetingId, mode: 'insensitive' } },
            { meeting_name: { contains: meetingId, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (!meeting) {
      meeting = await prisma.meetings.findFirst({
        orderBy: { meeting_date: 'desc' },
      });
    }

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลงานประชุม' },
        { status: 404 }
      );
    }

    const effectiveMeetingId = meeting.meeting_id;
    const meetingAny = meeting as any;
    const changeFeeConfig = (meetingAny.pricing_tiers as any)?.changeFee;
    const changeFee = meetingAny.change_format_fee ?? (changeFeeConfig?.onsiteMember || 1000);
    const changeDeadline = meetingAny.change_format_deadline
      ? new Date(meetingAny.change_format_deadline).toISOString().slice(0, 10)
      : changeFeeConfig?.conditionDate || null;
    const changePolicy = meetingAny.change_format_policy || changeFeeConfig?.policyText || null;

    // Check if deadline has passed
    let isDeadlinePassed = false;
    if (changeDeadline) {
      const deadlineDate = new Date(changeDeadline);
      deadlineDate.setHours(23, 59, 59, 999);
      if (new Date().getTime() > deadlineDate.getTime()) {
        isDeadlinePassed = true;
      }
    }

    // 2. Lookup existing registration in payment_slips & meeting_attendances
    const cleanQuery = query.trim();
    const onlyDigits = cleanQuery.replace(/\D/g, '');
    const numericId = onlyDigits ? parseInt(onlyDigits, 10) : null;
    const paddedMemberNo = onlyDigits ? onlyDigits.padStart(4, '0') : null;

    // Check if query is like G-2267 or G2267 or contains G-
    const guestMatch = cleanQuery.match(/g-?(\d+)/i);
    const guestId = guestMatch ? parseInt(guestMatch[1], 10) : (numericId && numericId < 100000 ? numericId : null);

    let matchingSlips: any[] = await (prisma as any).payment_slips.findMany({
      where: {
        meeting_id: effectiveMeetingId,
        status: { in: ['approved', 'pending'] },
        OR: [
          { member_no: cleanQuery },
          ...(paddedMemberNo ? [{ member_no: paddedMemberNo }] : []),
          { ticket_code: { contains: cleanQuery, mode: 'insensitive' } },
          ...(guestId ? [{ ticket_code: { contains: String(guestId), mode: 'insensitive' } }] : []),
          { guest_name: { contains: cleanQuery, mode: 'insensitive' } },
          { guest_email: { contains: cleanQuery, mode: 'insensitive' } },
          { guest_phone: { contains: cleanQuery, mode: 'insensitive' } },
          { members: { fullNameTh: { contains: cleanQuery, mode: 'insensitive' } } },
          { members: { fullNameEn: { contains: cleanQuery, mode: 'insensitive' } } },
          { members: { email: { contains: cleanQuery, mode: 'insensitive' } } },
          { members: { mobile: { contains: cleanQuery, mode: 'insensitive' } } },
        ],
      },
      include: {
        members: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Filter out format change slips (which have isFormatChange) to find the primary registration
    const primarySlip: any = matchingSlips.find((s: any) => {
      let act = s.selected_activities;
      if (typeof act === 'string') {
        try { act = JSON.parse(act); } catch {}
      }
      return !act?.isFormatChange;
    }) || matchingSlips[0];

    // Fallback: If not found in payment_slips, check meeting_attendances table
    let attendanceRecord: any = null;
    if (!primarySlip) {
      attendanceRecord = await (prisma as any).meeting_attendances.findFirst({
        where: {
          meeting_id: effectiveMeetingId,
          OR: [
            { member_no: cleanQuery },
            ...(paddedMemberNo ? [{ member_no: paddedMemberNo }] : []),
            ...(guestId ? [{ attendance_id: BigInt(guestId) }] : []),
            { attendee_name: { contains: cleanQuery, mode: 'insensitive' } },
            { attendee_email: { contains: cleanQuery, mode: 'insensitive' } },
            { attendee_phone: { contains: cleanQuery, mode: 'insensitive' } },
            { workplace: { contains: cleanQuery, mode: 'insensitive' } },
            { members: { fullNameTh: { contains: cleanQuery, mode: 'insensitive' } } },
            { members: { fullNameEn: { contains: cleanQuery, mode: 'insensitive' } } },
            { members: { email: { contains: cleanQuery, mode: 'insensitive' } } },
          ],
        },
        include: {
          members: true,
        },
      });
    }

    if (!primarySlip && !attendanceRecord) {
      return NextResponse.json(
        {
          success: false,
          error: `ไม่พบข้อมูลการลงทะเบียนเข้าร่วมงาน "${meeting.meeting_name}" ที่ตรงกับ "${cleanQuery}" (กรุณาตรวจสอบเลขสมาชิก หรืออีเมลสมาชิก)`,
        },
        { status: 404 }
      );
    }

    // Check if attendee is a member - ONLY members are allowed to change format
    const isAttendeeMember = primarySlip
      ? (primarySlip.is_member && !!primarySlip.member_no)
      : (!!attendanceRecord?.member_no);

    if (!isAttendeeMember) {
      return NextResponse.json(
        {
          success: false,
          error: 'ขออภัย การแจ้งขอเปลี่ยนรูปแบบการเข้าร่วมสงวนสิทธิ์เฉพาะสมาชิกสมาคมฯ เท่านั้น (บุคคลทั่วไปไม่สามารถขอเปลี่ยนรูปแบบได้)',
          code: 'MEMBER_ONLY',
        },
        { status: 403 }
      );
    }

    // 3. Check if there is already a pending format change request
    const pendingChangeRequest = matchingSlips.find((s: any) => {
      let act = s.selected_activities;
      if (typeof act === 'string') {
        try { act = JSON.parse(act); } catch {}
      }
      return act?.isFormatChange && s.status === 'pending';
    });

    // 4. Parse current format and attendee details
    let currentFormat: 'onsite' | 'online' = 'onsite';
    let attendeeName = '';
    let attendeeEmail = '';
    let attendeePhone = '';
    let attendeeWorkplace = '';
    let ticketCode = '';
    let memberNo: string | null = null;
    let isMember = true;
    let slipId: string | null = null;
    let registrationStatus = 'approved';

    if (primarySlip) {
      slipId = primarySlip.slip_id;
      ticketCode = primarySlip.ticket_code || '';
      memberNo = primarySlip.member_no || null;
      isMember = true;
      registrationStatus = primarySlip.status;

      let parsedActivities = primarySlip.selected_activities;
      if (typeof parsedActivities === 'string') {
        try { parsedActivities = JSON.parse(parsedActivities); } catch {}
      }

      if (Array.isArray(parsedActivities)) {
        const hasOnline = parsedActivities.some((a: any) => a.format === 'online');
        if (hasOnline) currentFormat = 'online';
      } else if (parsedActivities && typeof parsedActivities === 'object') {
        if (parsedActivities.format === 'online' || parsedActivities.attendanceType === 'online') {
          currentFormat = 'online';
        }
      }

      const pMem = primarySlip.members;
      attendeeName = pMem
        ? (pMem.fullNameTh || pMem.fullNameEn || 'สมาชิก TSRM')
        : (primarySlip.guest_name || 'สมาชิก TSRM');

      attendeeEmail = pMem
        ? (pMem.email || '')
        : (primarySlip.guest_email || '');

      attendeePhone = pMem
        ? (pMem.mobile || '')
        : (primarySlip.guest_phone || '');

      attendeeWorkplace = pMem
        ? (pMem.workplace || '')
        : (primarySlip.guest_workplace || '');
    } else if (attendanceRecord) {
      memberNo = attendanceRecord.member_no || null;
      isMember = true;
      attendeeName = attendanceRecord.members?.fullNameTh || attendanceRecord.attendee_name || 'สมาชิก TSRM';
      attendeeEmail = attendanceRecord.members?.email || attendanceRecord.attendee_email || '';
      attendeePhone = attendanceRecord.members?.mobile || attendanceRecord.attendee_phone || '';
      attendeeWorkplace = attendanceRecord.members?.workplace || attendanceRecord.workplace || '';
      ticketCode = memberNo ? `TSRM-${effectiveMeetingId}-${memberNo}` : `M-${memberNo}`;
    }

    // Get default bank info from system settings if available
    const bankSetting = await prisma.system_settings.findUnique({
      where: { key: 'bank_account_info' },
    });
    let defaultBank = 'Kasikorn (KBANK)';
    let defaultAccount = '040-8-55259-2';
    let defaultAccName = 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย';
    if (bankSetting && bankSetting.value) {
      try {
        const parsed = JSON.parse(bankSetting.value);
        if (parsed.bankName) defaultBank = parsed.bankName;
        if (parsed.accountNo) defaultAccount = parsed.accountNo;
        if (parsed.accountName) defaultAccName = parsed.accountName;
      } catch {}
    }

    return NextResponse.json({
      success: true,
      data: {
        slipId: slipId || null,
        meetingId: effectiveMeetingId,
        meetingName: meeting.meeting_name,
        ticketCode: ticketCode || '',
        memberNo: memberNo || null,
        isMember: isMember,
        attendeeName,
        attendeeEmail,
        attendeePhone,
        attendeeWorkplace,
        currentFormat,
        registrationStatus: registrationStatus,
        changeFee,
        changeDeadline,
        changePolicy,
        isDeadlinePassed,
        hasPendingChangeRequest: !!pendingChangeRequest,
        pendingChangeSlipId: pendingChangeRequest?.slip_id || null,
        bankInfo: {
          bankName: defaultBank,
          accountNo: defaultAccount,
          accountName: defaultAccName,
        },
      },
    });
  } catch (err: any) {
    console.error('Error in change-format GET API:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meetings/[meetingId]/change-format
 * Submit a format change request with slip upload.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const body = await req.json();

    const {
      originalSlipId,
      memberNo,
      ticketCode,
      attendeeName,
      attendeeEmail,
      attendeePhone,
      attendeeWorkplace,
      isMember,
      originalFormat,
      targetFormat,
      changeFee,
      slipUrl,
      bank,
      transferDate,
      transferTime,
      refNo,
    } = body;

    if (!meetingId || !originalFormat || !targetFormat || !slipUrl) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน กรุณาแนบสลิปและเลือกรูปแบบที่ต้องการเปลี่ยน' },
        { status: 400 }
      );
    }

    if (originalFormat === targetFormat) {
      return NextResponse.json(
        { success: false, error: 'รูปแบบใหม่ที่เลือกตรงกับรูปแบบปัจจุบัน' },
        { status: 400 }
      );
    }

    if (targetFormat === 'online' && !isMember && !memberNo) {
      return NextResponse.json(
        { success: false, error: 'การเข้าร่วมแบบ Online สงวนสิทธิ์เฉพาะสมาชิกสมาคมฯ เท่านั้น' },
        { status: 400 }
      );
    }

    // 1. Verify meeting exists
    const meeting = await prisma.meetings.findUnique({
      where: { meeting_id: meetingId },
    });

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลงานประชุม' },
        { status: 404 }
      );
    }

    // 2. Check for duplicate pending requests
    const existingPending = await prisma.payment_slips.findFirst({
      where: {
        meeting_id: meetingId,
        status: 'pending',
        OR: [
          ...(memberNo ? [{ member_no: memberNo }] : []),
          ...(ticketCode ? [{ ticket_code: ticketCode }] : []),
          ...(attendeeEmail ? [{ guest_email: attendeeEmail }] : []),
        ],
      },
    });

    if (existingPending) {
      let act: any = existingPending.selected_activities;
      if (typeof act === 'string') {
        try { act = JSON.parse(act); } catch {}
      }
      if (act?.isFormatChange) {
        return NextResponse.json(
          {
            success: false,
            error: 'ท่านมีรายการแจ้งขอเปลี่ยนรูปแบบที่กำลังรอแอดมินตรวจสอบอยู่แล้ว ไม่สามารถส่งซ้ำได้',
          },
          { status: 400 }
        );
      }
    }

    // 3. Generate unique Slip ID for this change request
    const changeSlipId = `SLIP-CHG-${Date.now().toString(36).toUpperCase()}`;
    const meetingAny = meeting as any;
    const feeAmount = typeof changeFee === 'number' ? changeFee : (meetingAny.change_format_fee || 1000);

    const changePayload = {
      isFormatChange: true,
      originalFormat,
      targetFormat,
      originalSlipId: originalSlipId || null,
      originalTicketCode: ticketCode || null,
      changeFee: feeAmount,
      requestedAt: new Date().toISOString(),
    };

    // 4. Create new payment_slips record for the change request
    const newSlip = await prisma.payment_slips.create({
      data: {
        slip_id: changeSlipId,
        meeting_id: meetingId,
        member_no: memberNo || null,
        guest_name: !isMember ? (attendeeName || null) : null,
        guest_email: !isMember ? (attendeeEmail || null) : null,
        guest_phone: !isMember ? (attendeePhone || null) : null,
        guest_workplace: !isMember ? (attendeeWorkplace || null) : null,
        is_member: !!isMember,
        ticket_code: ticketCode || null,
        amount: feeAmount,
        bank: bank || 'Kasikorn (KBANK)',
        transfer_date: transferDate || new Date().toISOString().slice(0, 10),
        transfer_time: transferTime || null,
        ref_no: refNo || `CHG:${originalFormat}->${targetFormat}`,
        slip_url: slipUrl,
        status: 'pending',
        selected_activities: changePayload as any,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'ส่งคำขอเปลี่ยนรูปแบบการเข้าร่วมสำเร็จ แอดมินจะดำเนินการตรวจสอบสลิปของท่าน',
      data: {
        slipId: newSlip.slip_id,
        targetFormat,
        amount: feeAmount,
      },
    });
  } catch (err: any) {
    console.error('Error in change-format POST API:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
