import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAttendeeTicketEmail, sendAttendeeOnlineEmail } from '@/lib/email';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import {
  ensureDailyCheckinsForMeeting,
  formatBangkokDate,
  formatThaiDate,
  getMeetingProgramsAndDates,
  programSupportsFormat,
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
      targetPrograms, // Optional array of { targetDate: string; programName?: string }
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

    // 2. Prepare target programs to process
    const programsToProcess: Array<{ targetDate: string; programName?: string }> = [];
    if (isDailyMode) {
      if (Array.isArray(targetPrograms) && targetPrograms.length > 0) {
        for (const tp of targetPrograms) {
          if (tp.targetDate) {
            programsToProcess.push({
              targetDate: tp.targetDate,
              programName: tp.programName || programName,
            });
          }
        }
      } else {
        programsToProcess.push({
          targetDate: targetDate || formatBangkokDate(meeting.meeting_date),
          programName: programName,
        });
      }
    } else {
      programsToProcess.push({
        targetDate: formatBangkokDate(meeting.meeting_date),
        programName: undefined,
      });
    }

    // 2.1 ตรวจรูปแบบการเข้าร่วมให้ตรงกับที่รายการกำหนด (เช่น เวิร์กช็อป Onsite อย่างเดียวส่งแบบ Online ไม่ได้)
    const meetingPrograms = isDailyMode ? getMeetingProgramsAndDates(meeting) : [];
    const findProgramFormat = (prog: { targetDate: string; programName?: string }) => {
      const sameDate = meetingPrograms.filter((p) => p.date === prog.targetDate);
      const matched = sameDate.find((p) => p.programName === prog.programName) || (sameDate.length === 1 ? sameDate[0] : undefined);
      return matched?.format;
    };
    if (isDailyMode && (formatFilter === 'onsite' || formatFilter === 'online')) {
      const unsupported = programsToProcess.filter((p) => !programSupportsFormat(findProgramFormat(p), formatFilter));
      if (unsupported.length > 0) {
        const label = formatFilter === 'online' ? 'ออนไลน์' : 'Onsite';
        return NextResponse.json(
          {
            success: false,
            error: `รายการต่อไปนี้ไม่มีรูปแบบ${label}: ${unsupported.map((p) => p.programName || p.targetDate).join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    let totalRecipientsCount = 0;
    let totalSuccessCount = 0;
    let totalFailedCount = 0;
    const allErrors: string[] = [];

    // 3. Process each program
    for (const prog of programsToProcess) {
      const selectedDateStr = prog.targetDate;
      let resolvedProgramName = prog.programName;
      const dailyRecordsMap = new Map<string, any>();

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
        ? `ประจำวันที่ ${formatThaiDate(selectedDateStr, true)} (${resolvedProgramName || 'Main Program'})`
        : (meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }) : undefined);

      // Fetch attendees according to filters
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
            s.meeting_id = a.meeting_id
            AND s.status <> 'merged'
            AND COALESCE(s.selected_activities->>'isAddOn', 'false') <> 'true'
            AND (
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
      // ไม่ส่งอีเมลรูปแบบที่รายการไม่ได้จัด
      if (isDailyMode) {
        const progFormat = findProgramFormat(prog);
        targetList = targetList.filter((t) => programSupportsFormat(progFormat, t.format));
      }

      totalRecipientsCount += targetList.length;

      // Batch dispatch emails for this program
      for (const recipient of targetList) {
        try {
          if (recipient.format === 'online') {
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
              totalSuccessCount++;
            } else {
              totalFailedCount++;
              allErrors.push(`${recipient.email}: ${result.error || 'Failed'}`);
            }
          } else {
            const qrPayload = isDailyMode && recipient.dailyQrToken
              ? `TSRM-PASS:${recipient.dailyQrToken}`
              : `TSRM-PASS:${recipient.ticketCode}`;

            const dailyNote = isDailyMode
              ? `บัตรเข้าร่วมหลักสูตร: ${recipient.dailyProgram || resolvedProgramName || 'Main Program'} • QR Code นี้ใช้สำหรับเข้างานวันที่ ${formatThaiDate(selectedDateStr, true)} เท่านั้น (1 สิทธิ์/วัน)${extraNote ? `\n\n${extraNote}` : ''}`
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
              totalSuccessCount++;
            } else {
              totalFailedCount++;
              allErrors.push(`${recipient.email}: ${result.error || 'Failed'}`);
            }
          }
        } catch (err: any) {
          totalFailedCount++;
          allErrors.push(`${recipient.email}: ${err.message || 'Send exception'}`);
        }
      }
    }

    if (totalRecipientsCount === 0) {
      const formatText = formatFilter === 'online' ? 'แบบออนไลน์' : (formatFilter === 'onsite' ? 'แบบ Onsite' : '');
      return NextResponse.json({
        success: false,
        error: `ไม่พบรายชื่อผู้เข้าร่วมประชุม${formatText}ตามเงื่อนไขที่เลือก หรือผู้เข้าร่วมไม่มีอีเมลในระบบ`,
      }, { status: 400 });
    }

    const modeLabel = isDailyMode
      ? ` (QR รายวัน ${programsToProcess.length} รายการ: ${programsToProcess.map((p) => formatThaiDate(p.targetDate, true)).join(', ')})`
      : '';
    const formatLabel = formatFilter === 'online' ? ' (เฉพาะ Online)' : (formatFilter === 'onsite' ? ' (เฉพาะ Onsite)' : '');

    return NextResponse.json({
      success: true,
      data: {
        total: totalRecipientsCount,
        successCount: totalSuccessCount,
        failedCount: totalFailedCount,
        errors: allErrors.slice(0, 5),
      },
      message: `ส่งอีเมลสำเร็จ ${totalSuccessCount} จากทั้งหมด ${totalRecipientsCount} ฉบับ${formatLabel}${modeLabel}`,
    });
  } catch (error: any) {
    console.error('API /api/email/send-tickets error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'เกิดข้อผิดพลาดในการส่งอีเมลบัตรเข้างาน',
    }, { status: 500 });
  }
}
