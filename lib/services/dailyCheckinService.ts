import prisma from '@/lib/prisma';

export interface DailyProgramInfo {
  date: string; // YYYY-MM-DD
  programName: string;
  isMainProgram: boolean;
}

/**
 * Format a Date object to YYYY-MM-DD in Asia/Bangkok timezone
 */
export function formatBangkokDate(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Format Date to Thai full display e.g. "21 ตุลาคม 2569"
 */
export function formatThaiDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Extract all valid conference dates and their associated program names
 */
export function getMeetingProgramsAndDates(meeting: {
  meeting_id: string;
  meeting_name: string;
  meeting_date: Date | string;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  activities?: any;
}): DailyProgramInfo[] {
  const programs: DailyProgramInfo[] = [];
  const addedDates = new Set<string>();

  const mainStartDate = meeting.start_date
    ? formatBangkokDate(meeting.start_date)
    : formatBangkokDate(meeting.meeting_date);
  const mainEndDate = meeting.end_date
    ? formatBangkokDate(meeting.end_date)
    : mainStartDate;

  // 1. Check activities for specific pre-congress/workshops with separate dates
  let parsedActivities: any[] = [];
  if (meeting.activities) {
    parsedActivities = Array.isArray(meeting.activities)
      ? meeting.activities
      : (typeof meeting.activities === 'string' ? JSON.parse(meeting.activities) : []);
  }

  for (const act of parsedActivities) {
    if (act.date) {
      const actDate = formatBangkokDate(act.date);
      if (!addedDates.has(actDate)) {
        programs.push({
          date: actDate,
          programName: act.name || act.title || 'หลักสูตรพิเศษ / Workshop',
          isMainProgram: false,
        });
        addedDates.add(actDate);
      }
    }
  }

  // 2. Main Program dates (spanning from mainStartDate to mainEndDate)
  const cur = new Date(mainStartDate);
  const end = new Date(mainEndDate);

  let dayIndex = 1;
  const totalDays = Math.max(1, Math.round((end.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  while (cur <= end) {
    const curStr = formatBangkokDate(cur);
    if (!addedDates.has(curStr)) {
      const dayLabel = totalDays > 1 ? ` (Day ${dayIndex})` : '';
      programs.push({
        date: curStr,
        programName: `Main Program${dayLabel}`,
        isMainProgram: true,
      });
      addedDates.add(curStr);
    }
    cur.setDate(cur.getDate() + 1);
    dayIndex++;
  }

  // Sort programs by date
  programs.sort((a, b) => a.date.localeCompare(b.date));
  return programs;
}

/**
 * Generate a standardized Daily QR Token
 */
export function generateDailyQrToken(meetingId: string, ticketCode: string, dateStr: string): string {
  const cleanMeeting = meetingId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase();
  const cleanTicket = ticketCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const cleanDate = dateStr.replace(/-/g, '');
  return `TSRM-DAY-${cleanMeeting}-${cleanDate}-${cleanTicket}`;
}

/**
 * Ensure daily checkin records are initialized in DB for attendees
 */
export async function ensureDailyCheckinsForMeeting(
  meetingId: string,
  targetDateStr?: string
): Promise<{
  createdCount: number;
  totalAttendees: number;
  dailyRecords: any[];
}> {
  const meeting = await prisma.meetings.findUnique({
    where: { meeting_id: meetingId },
  });
  if (!meeting) {
    throw new Error('ไม่พบข้อมูลงานประชุม');
  }

  const allPrograms = getMeetingProgramsAndDates(meeting);
  const targetPrograms = targetDateStr
    ? allPrograms.filter((p) => p.date === targetDateStr)
    : allPrograms;

  if (targetPrograms.length === 0) {
    // If target date is not in list, add it as default Main Program
    const fallbackDate = targetDateStr || formatBangkokDate(meeting.meeting_date);
    targetPrograms.push({
      date: fallbackDate,
      programName: 'Main Program',
      isMainProgram: true,
    });
  }

  // Fetch all approved/registered attendees for this meeting
  const attendees = await prisma.meeting_attendances.findMany({
    where: {
      meeting_id: meetingId,
      attendance_status: { in: ['Registered', 'Checked_In', 'Attended', 'Non-Member'] },
    },
    include: {
      members: true,
    },
  });

  // Fetch payment slips for ticket codes
  const slips = await prisma.payment_slips.findMany({
    where: {
      meeting_id: meetingId,
      status: { not: 'rejected' },
    },
  });

  const slipMapByMember = new Map<string, any>();
  const slipMapByEmail = new Map<string, any>();
  for (const s of slips) {
    if (s.member_no) slipMapByMember.set(s.member_no, s);
    if (s.guest_email) slipMapByEmail.set(s.guest_email.toLowerCase(), s);
  }

  let createdCount = 0;
  const processedRecords: any[] = [];

  for (const att of attendees) {
    const memNo = att.member_no;
    const email = att.attendee_email || att.members?.email || '';
    const matchingSlip = (memNo ? slipMapByMember.get(memNo) : null) || (email ? slipMapByEmail.get(email.toLowerCase()) : null);

    const ticketCode = matchingSlip?.ticket_code || (memNo ? `TSRM-${memNo}` : `TSRM-ATTD-${att.attendance_id}`);

    for (const prog of targetPrograms) {
      const checkinDateObj = new Date(`${prog.date}T00:00:00.000Z`);
      const dailyToken = generateDailyQrToken(meetingId, ticketCode, prog.date);

      // Check if attendee selected specific activity matching this date if not main program
      let programName = prog.programName;
      if (matchingSlip?.selected_activities && Array.isArray(matchingSlip.selected_activities)) {
        const actMatch = matchingSlip.selected_activities.find((a: any) => a.date && formatBangkokDate(a.date) === prog.date);
        if (actMatch && actMatch.name) {
          programName = actMatch.name;
        }
      }

      // Upsert into meeting_daily_checkins
      const record = await prisma.meeting_daily_checkins.upsert({
        where: {
          meeting_id_ticket_code_checkin_date: {
            meeting_id: meetingId,
            ticket_code: ticketCode,
            checkin_date: checkinDateObj,
          },
        },
        update: {
          attendance_id: att.attendance_id,
          member_no: memNo,
          program_name: programName,
          daily_qr_token: dailyToken,
        },
        create: {
          meeting_id: meetingId,
          attendance_id: att.attendance_id,
          member_no: memNo,
          ticket_code: ticketCode,
          checkin_date: checkinDateObj,
          program_name: programName,
          daily_qr_token: dailyToken,
          checkin_status: 'pending',
        },
      });

      createdCount++;
      processedRecords.push({
        ...record,
        attendeeName: att.attendee_name || att.members?.fullNameTh || 'ผู้เข้าร่วมประชุม',
        attendeeEmail: email,
        formattedDate: prog.date,
      });
    }
  }

  return {
    createdCount,
    totalAttendees: attendees.length,
    dailyRecords: processedRecords,
  };
}

/**
 * Verify and process a daily QR Code scan
 */
export async function processDailyQrScan(
  scannedCode: string,
  staffMeetingId?: string
): Promise<{
  success: boolean;
  status: 'success' | 'duplicate' | 'invalid';
  message: string;
  record: any;
}> {
  const trimmed = (scannedCode || '').trim();
  const todayBangkok = formatBangkokDate();
  const todayDateObj = new Date(`${todayBangkok}T00:00:00.000Z`);

  // 1. Try finding direct match by daily_qr_token
  let dailyRecord = await prisma.meeting_daily_checkins.findFirst({
    where: {
      OR: [
        { daily_qr_token: { equals: trimmed, mode: 'insensitive' } },
        { daily_qr_token: { equals: trimmed.replace(/^TSRM-PASS:/i, ''), mode: 'insensitive' } },
      ],
      ...(staffMeetingId ? { meeting_id: staffMeetingId } : {}),
    },
    include: {
      meetings: true,
      meeting_attendances: true,
      members: true,
    },
  });

  // 2. If not found by daily_qr_token, check if code contains ticket_code, member_no or attendance_id for today
  if (!dailyRecord) {
    // Extract possible clean ticket / member code
    let cleanCode = trimmed.replace(/^TSRM-PASS:/i, '').replace(/^TSRM-TICKET:/i, '').trim();
    if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanCode);
        cleanCode = parsed.code || parsed.ticket_code || parsed.ticketCode || parsed.member_no || parsed.memberNo || cleanCode;
      } catch {}
    }

    dailyRecord = await prisma.meeting_daily_checkins.findFirst({
      where: {
        checkin_date: todayDateObj,
        OR: [
          { ticket_code: { equals: cleanCode, mode: 'insensitive' } },
          { member_no: cleanCode },
          { member_no: cleanCode.padStart(4, '0') },
          { daily_qr_token: { contains: cleanCode, mode: 'insensitive' } },
        ],
        ...(staffMeetingId ? { meeting_id: staffMeetingId } : {}),
      },
      include: {
        meetings: true,
        meeting_attendances: true,
        members: true,
      },
    });
  }

  // 3. If found daily record
  if (dailyRecord) {
    const recordDateStr = formatBangkokDate(dailyRecord.checkin_date);
    const isToday = recordDateStr === todayBangkok;

    const attendeeName = dailyRecord.members?.fullNameTh || dailyRecord.meeting_attendances?.attendee_name || 'ผู้เข้าร่วมประชุม';
    const attendeeEmail = dailyRecord.members?.email || dailyRecord.meeting_attendances?.attendee_email || '-';
    const programName = dailyRecord.program_name || 'Main Program';
    const ticketDisplay = `${dailyRecord.ticket_code} (${programName})`;

    // Check Date Validity
    if (!isToday) {
      return {
        success: true,
        status: 'invalid',
        message: `QR Code นี้สำหรับเข้างานวันที่ ${formatThaiDate(recordDateStr)} ไม่ตรงกับวันที่สแกน (${formatThaiDate(todayBangkok)})`,
        record: {
          id: dailyRecord.ticket_code,
          name: attendeeName,
          ticketType: ticketDisplay,
          email: attendeeEmail,
          checkInTime: `วันเข้างาน: ${formatThaiDate(recordDateStr)}`,
          status: 'invalid',
        },
      };
    }

    // Check if ALREADY CHECKED IN TODAY (Duplicate)
    if (dailyRecord.checkin_status === 'attended' || dailyRecord.checkin_time !== null) {
      const existingTime = dailyRecord.checkin_time
        ? new Date(dailyRecord.checkin_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) + ' น.'
        : 'ก่อนหน้านี้';

      return {
        success: true,
        status: 'duplicate',
        message: `ผู้เข้าร่วมได้สแกนเช็คอินเข้าร่วม ${programName} ของวันนี้แล้วเมื่อ ${existingTime}`,
        record: {
          id: dailyRecord.ticket_code,
          name: attendeeName,
          ticketType: ticketDisplay,
          email: attendeeEmail,
          checkInTime: existingTime,
          status: 'duplicate',
        },
      };
    }

    // Perform Check-in Success
    const checkinNow = new Date();
    await prisma.meeting_daily_checkins.update({
      where: { id: dailyRecord.id },
      data: {
        checkin_status: 'attended',
        checkin_time: checkinNow,
      },
    });

    // Also update parent meeting_attendances if first time
    if (dailyRecord.attendance_id) {
      await prisma.meeting_attendances.updateMany({
        where: {
          attendance_id: dailyRecord.attendance_id,
          checkin_time: null,
        },
        data: {
          checkin_time: checkinNow,
          attendance_status: 'Attended',
        },
      });
    }

    const checkInTimeFormatted = checkinNow.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Bangkok',
    }) + ' น.';

    return {
      success: true,
      status: 'success',
      message: `เช็คอินเข้าร่วม ${programName} (ประจำวันที่ ${formatThaiDate(todayBangkok)}) สำเร็จ`,
      record: {
        id: dailyRecord.ticket_code,
        name: attendeeName,
        ticketType: ticketDisplay,
        email: attendeeEmail,
        checkInTime: checkInTimeFormatted,
        status: 'success',
      },
    };
  }

  // Fallback: Check if attendee exists in master meeting_attendances
  return {
    success: false,
    status: 'invalid',
    message: 'ไม่พบข้อมูล QR Code ประจำวันนี้ในระบบ หรือรหัสไม่ถูกต้อง',
    record: {
      id: trimmed,
      name: 'ไม่พบข้อมูลในระบบ',
      ticketType: 'N/A',
      email: 'N/A',
      checkInTime: 'N/A',
      status: 'invalid',
    },
  };
}
