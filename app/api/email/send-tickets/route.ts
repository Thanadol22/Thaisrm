import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAttendeeTicketEmail } from '@/lib/email';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      meetingId,
      statusFilter = 'Registered', // 'Registered' | 'all' | 'Checked_In' | 'Non-Member'
      customRecipientList, // Optional array of { name, email, ticketCode, memberNo, status }
      extraNote,
    } = body;

    if (!meetingId && (!customRecipientList || customRecipientList.length === 0)) {
      return NextResponse.json({ success: false, error: 'Meeting ID is required' }, { status: 400 });
    }

    // 1. Fetch meeting info
    const meeting = await prisma.meetings.findUnique({
      where: { meeting_id: meetingId },
    });

    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }

    const meetingDateStr = meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) : undefined;

    // 2. Fetch attendees according to filters
    let targetList: Array<{
      name: string;
      email: string;
      ticketCode: string;
      memberNo?: string;
      status: string;
    }> = [];

    if (customRecipientList && Array.isArray(customRecipientList) && customRecipientList.length > 0) {
      targetList = customRecipientList;
    } else {
      // Query database for matching attendees
      let query = `
        SELECT 
          a.attendance_id,
          a.meeting_id,
          a.member_no,
          a.attendee_name,
          a.attendee_email,
          a.attendance_status,
          m.full_name_th AS member_name,
          m.email AS member_email,
          s.ticket_code
        FROM meeting_attendances a
        LEFT JOIN members m ON a.member_no = m.member_no
        LEFT JOIN payment_slips s ON (
          s.meeting_id = a.meeting_id AND (
            (a.member_no IS NOT NULL AND s.member_no = a.member_no) OR 
            (a.attendee_email IS NOT NULL AND LOWER(s.guest_email) = LOWER(a.attendee_email))
          )
        )
        WHERE a.meeting_id = $1
      `;
      const params: any[] = [meetingId];

      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'Registered') {
          query += ` AND a.attendance_status IN ('Registered', 'Checked_In', 'Non-Member')`;
        } else {
          params.push(statusFilter);
          query += ` AND a.attendance_status = $${params.length}`;
        }
      }

      const rows: any[] = await prisma.$queryRawUnsafe(query, ...params);

      targetList = rows.map((r) => {
        const name = r.member_name || r.attendee_name || 'ผู้เข้าร่วมประชุม';
        const email = r.member_email || r.attendee_email || '';
        const ticketCode = r.ticket_code || (r.member_no ? `TSRM-${r.member_no}` : `TSRM-ATTD-${r.attendance_id}`);
        return {
          name,
          email,
          ticketCode,
          memberNo: r.member_no || undefined,
          status: r.attendance_status,
        };
      }).filter((t) => t.email && t.email.includes('@'));
    }

    if (targetList.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'ไม่พบรายชื่อผู้เข้าร่วมประชุมตามเงื่อนไขที่เลือก หรือผู้เข้าร่วมไม่มีอีเมลในระบบ',
      }, { status: 400 });
    }

    // 3. Batch dispatch emails
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const recipient of targetList) {
      try {
        const result = await sendAttendeeTicketEmail({
          to: recipient.email,
          recipientName: recipient.name,
          meetingName: meeting.meeting_name,
          meetingDate: meetingDateStr,
          location: meeting.location || 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
          ticketCode: recipient.ticketCode,
          memberNo: recipient.memberNo,
          attendanceStatus: recipient.status,
          extraNote,
        });

        if (result.success) {
          successCount++;
        } else {
          failedCount++;
          errors.push(`${recipient.email}: ${result.error || 'Failed'}`);
        }
      } catch (err: any) {
        failedCount++;
        errors.push(`${recipient.email}: ${err.message || 'Send exception'}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: targetList.length,
        successCount,
        failedCount,
        errors: errors.slice(0, 5), // Return first 5 errors if any
      },
      message: `ส่งอีเมลบัตรเข้างานสำเร็จ ${successCount} จากทั้งหมด ${targetList.length} ท่าน`,
    });
  } catch (error: any) {
    console.error('API /api/email/send-tickets error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'เกิดข้อผิดพลาดในการส่งอีเมลบัตรเข้างาน',
    }, { status: 500 });
  }
}
