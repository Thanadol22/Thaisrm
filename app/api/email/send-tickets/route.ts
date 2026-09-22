import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAttendeeTicketEmail, sendAttendeeOnlineEmail } from '@/lib/email';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import {
  ensureDailyCheckinsForMeeting,
  formatBangkokDate,
  formatThaiDate,
  getMeetingProgramsAndDates,
} from '@/lib/services/dailyCheckinService';

export const dynamic = 'force-dynamic';

function parseAttendeeFormat(selectedActivities: any, refNo?: string | null): 'onsite' | 'online' {
  if (refNo && refNo.includes('->online')) return 'online';
  if (refNo && refNo.includes('->onsite')) return 'onsite';

  let act = selectedActivities;
  if (typeof act === 'string') {
    try {
      act = JSON.parse(act);
    } catch {}
  }
  if (Array.isArray(act)) {
    const isOnline = act.some((item: any) => item.format === 'online');
    if (isOnline) return 'online';
  } else if (act && typeof act === 'object') {
    if (act.format === 'online' || act.attendanceType === 'online' || act.targetFormat === 'online') {
      return 'online';
    }
  }
  return 'onsite';
}

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
      formatFilter = 'all', // 'all' | 'onsite' | 'online'
      customRecipientList, // Optional array of { name, email, ticketCode, memberNo, status, format }
      extraNote,
      isDailyMode = false,
      targetDate, // e.g. "2026-10-21"
      programName, // e.g. "Main Program (Day 1)"
      zoomUrl,
      meetingIdCredentials,
      passcode,
      onlineInstructions,
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

    // 2. If Daily Mode is active, ensure daily check-in records are generated/synced in DB first
    let dailyRecordsMap = new Map<string, any>();
    const selectedDateStr = targetDate || formatBangkokDate(meeting.meeting_date);
    let resolvedProgramName = programName;

    if (isDailyMode) {
      const dailySync = await ensureDailyCheckinsForMeeting(meetingId, selectedDateStr);
      for (const rec of dailySync.dailyRecords) {
        dailyRecordsMap.set(rec.ticket_code, rec);
        if (!resolvedProgramName && rec.program_name) {
          resolvedProgramName = rec.program_name;
        }
      }
    }

    const meetingDateStr = isDailyMode
      ? `ประจำวันที่ ${formatThaiDate(selectedDateStr)} (${resolvedProgramName || 'Main Program'})`
      : (meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }) : undefined);

    // 3. Fetch attendees according to filters
    let targetList: Array<{
      name: string;
      email: string;
      ticketCode: string;
      memberNo?: string;
      status: string;
      format: 'onsite' | 'online';
      dailyQrToken?: string;
      dailyProgram?: string;
    }> = [];

    if (customRecipientList && Array.isArray(customRecipientList) && customRecipientList.length > 0) {
      targetList = customRecipientList.map((c: any) => ({
        ...c,
        format: c.format === 'online' ? 'online' : 'onsite',
      }));
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
          s.ticket_code,
          s.selected_activities,
          s.ref_no
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
        const dailyRec = dailyRecordsMap.get(ticketCode);
        const format = parseAttendeeFormat(r.selected_activities, r.ref_no);

        return {
          name,
          email,
          ticketCode,
          memberNo: r.member_no || undefined,
          status: r.attendance_status,
          format,
          dailyQrToken: dailyRec?.daily_qr_token,
          dailyProgram: dailyRec?.program_name || resolvedProgramName,
        };
      }).filter((t) => t.email && t.email.includes('@'));
    }

    // Apply formatFilter (all | onsite | online)
    if (formatFilter && formatFilter !== 'all') {
      targetList = targetList.filter((t) => t.format === formatFilter);
    }

    if (targetList.length === 0) {
      const formatText = formatFilter === 'online' ? 'แบบออนไลน์' : (formatFilter === 'onsite' ? 'แบบ Onsite' : '');
      return NextResponse.json({
        success: false,
        error: `ไม่พบรายชื่อผู้เข้าร่วมประชุม${formatText}ตามเงื่อนไขที่เลือก หรือผู้เข้าร่วมไม่มีอีเมลในระบบ`,
      }, { status: 400 });
    }

    // 4. Batch dispatch emails
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const recipient of targetList) {
      try {
        if (recipient.format === 'online') {
          // Send Online Access Confirmation (No QR code for venue)
          const result = await sendAttendeeOnlineEmail({
            to: recipient.email,
            recipientName: recipient.name,
            meetingName: meeting.meeting_name,
            meetingDate: meetingDateStr,
            ticketCode: recipient.ticketCode,
            memberNo: recipient.memberNo,
            attendanceStatus: recipient.status,
            zoomUrl: zoomUrl || undefined,
            meetingIdCredentials: meetingIdCredentials || undefined,
            passcode: passcode || undefined,
            onlineInstructions: onlineInstructions || undefined,
            extraNote: extraNote || undefined,
          });

          if (result.success) {
            successCount++;
          } else {
            failedCount++;
            errors.push(`${recipient.email}: ${result.error || 'Failed'}`);
          }
        } else {
          // Send Onsite E-Ticket with Venue QR Code
          const qrPayload = isDailyMode && recipient.dailyQrToken
            ? `TSRM-PASS:${recipient.dailyQrToken}`
            : `TSRM-PASS:${recipient.ticketCode}`;

          const dailyNote = isDailyMode
            ? `บัตรเข้าร่วมหลักสูตร: ${recipient.dailyProgram || resolvedProgramName || 'Main Program'} • QR Code นี้ใช้สำหรับเข้างานวันที่ ${formatThaiDate(selectedDateStr)} เท่านั้น (1 สิทธิ์/วัน)${extraNote ? `\n\n${extraNote}` : ''}`
            : extraNote;

          const result = await sendAttendeeTicketEmail({
            to: recipient.email,
            recipientName: recipient.name,
            meetingName: meeting.meeting_name,
            meetingDate: meetingDateStr,
            location: meeting.location || 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
            ticketCode: recipient.ticketCode,
            memberNo: recipient.memberNo,
            attendanceStatus: recipient.status,
            qrCodeData: qrPayload,
            dailyProgram: isDailyMode ? (recipient.dailyProgram || resolvedProgramName || 'Daily Pass') : undefined,
            extraNote: dailyNote,
          });

          if (result.success) {
            successCount++;
          } else {
            failedCount++;
            errors.push(`${recipient.email}: ${result.error || 'Failed'}`);
          }
        }
      } catch (err: any) {
        failedCount++;
        errors.push(`${recipient.email}: ${err.message || 'Send exception'}`);
      }
    }

    const modeLabel = isDailyMode ? ` (QR รายวัน: ${formatThaiDate(selectedDateStr)})` : '';
    const formatLabel = formatFilter === 'online' ? ' (เฉพาะ Online)' : (formatFilter === 'onsite' ? ' (เฉพาะ Onsite)' : '');
    return NextResponse.json({
      success: true,
      data: {
        total: targetList.length,
        successCount,
        failedCount,
        errors: errors.slice(0, 5),
      },
      message: `ส่งอีเมลสำเร็จ ${successCount} จากทั้งหมด ${targetList.length} ท่าน${formatLabel}${modeLabel}`,
    });
  } catch (error: any) {
    console.error('API /api/email/send-tickets error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'เกิดข้อผิดพลาดในการส่งอีเมลบัตรเข้างาน',
    }, { status: 500 });
  }
}
