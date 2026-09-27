import prisma from '@/lib/prisma';

export interface DailyProgramInfo {
  id?: string;
  date: string; // YYYY-MM-DD
  programName: string;
  isMainProgram: boolean;
  type?: 'main' | 'workshop' | 'special';
  format?: string;
  time?: string;
  maxSeats?: number;
  memberPrice?: number;
  nonMemberPrice?: number;
}

const THAI_MONTHS: Record<string, number> = {
  'ม.ค.': 1, 'มกราคม': 1, 'ม.ค': 1,
  'ก.พ.': 2, 'กุมภาพันธ์': 2, 'ก.พ': 2,
  'มี.ค.': 3, 'มีนาคม': 3, 'มี.ค': 3,
  'เม.ย.': 4, 'เมษายน': 4, 'เม.ย': 4,
  'พ.ค.': 5, 'พฤษภาคม': 5, 'พ.ค': 5,
  'มิ.ย.': 6, 'มิถุนายน': 6, 'มิ.ย': 6,
  'ก.ค.': 7, 'กรกฎาคม': 7, 'ก.ค': 7,
  'ส.ค.': 8, 'สิงหาคม': 8, 'ส.ค': 8,
  'ก.ย.': 9, 'กันยายน': 9, 'ก.ย': 9,
  'ต.ค.': 10, 'ตุลาคม': 10, 'ต.ค': 10,
  'พ.ย.': 11, 'พฤศจิกายน': 11, 'พ.ย': 11,
  'ธ.ค.': 12, 'ธันวาคม': 12, 'ธ.ค': 12,
};

/**
 * Safely format a Date object or ISO string to YYYY-MM-DD in Asia/Bangkok timezone
 */
export function formatBangkokDate(date?: Date | string | null): string {
  const targetDate = date === undefined ? new Date() : date;
  if (!targetDate) return '';
  try {
    const d = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * Parse any date string (ISO, Thai text like "20 ต.ค. 2569", "15 ตุลาคม 2568") into YYYY-MM-DD
 */
export function parseDateStringToIso(str?: string | Date | null, baseDate?: Date | string | null): string | null {
  if (!str) return null;
  if (str instanceof Date && !isNaN(str.getTime())) {
    return formatBangkokDate(str);
  }
  const s = String(str).trim();
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const match = s.match(/(?:วันที่\s*)?(\d{1,2})\s*([^\d\s,]+)\s*(?:พ\.ศ\.\s*)?(\d{4})?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthName = match[2].trim();
    let year = match[3] ? parseInt(match[3], 10) : null;
    const month = THAI_MONTHS[monthName];
    if (month) {
      if (!year && baseDate) {
        const bd = typeof baseDate === 'string' ? new Date(baseDate) : baseDate;
        if (!isNaN(bd.getTime())) {
          year = bd.getFullYear();
        }
      }
      if (year && year > 2400) year -= 543;
      if (year) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

/**
 * Format Date to Thai full display e.g. "21 ตุลาคม 2569" or "21 ต.ค. 2569"
 */
export function formatThaiDate(dateStr: string, shortMonth: boolean = false): string {
  try {
    if (!dateStr) return '';
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: shortMonth ? 'short' : 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Extract all valid conference dates and their associated program names, sorted chronologically
 */
export function getMeetingProgramsAndDates(meeting: {
  meeting_id: string;
  meeting_name: string;
  meeting_date: Date | string;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  meeting_type?: string | null;
  activities?: any;
}): DailyProgramInfo[] {
  const programs: DailyProgramInfo[] = [];

  const baseStart = meeting.start_date || meeting.meeting_date;
  const baseEnd = meeting.end_date || baseStart;

  const mainStartDate = formatBangkokDate(baseStart) || '2026-01-01';
  const mainEndDate = formatBangkokDate(baseEnd) || mainStartDate;

  let parsedActivities: any[] = [];
  if (meeting.activities) {
    try {
      parsedActivities = Array.isArray(meeting.activities)
        ? meeting.activities
        : (typeof meeting.activities === 'string' ? JSON.parse(meeting.activities) : []);
    } catch {
      parsedActivities = [];
    }
  }

  // 1. Check activities for workshops / special / main programs
  for (const act of parsedActivities) {
    if (Array.isArray(act.selectedDays) && act.selectedDays.length > 0) {
      for (const dayKey of act.selectedDays) {
        const dayMatch = String(dayKey).match(/d-(\d+)/);
        if (dayMatch) {
          const dayNum = parseInt(dayMatch[1], 10);
          const [yearStr, monthStr] = mainStartDate.split('-');
          const actIso = `${yearStr}-${monthStr}-${String(dayNum).padStart(2, '0')}`;
          programs.push({
            id: act.id ? `${act.id}-${dayKey}` : undefined,
            date: actIso,
            programName: act.name || act.title || (act.type === 'main' ? 'Main Program' : 'Workshop'),
            isMainProgram: act.type === 'main',
            type: act.type || (act.isMainProgram ? 'main' : 'workshop'),
            format: act.format || 'both',
            maxSeats: act.maxSeats,
            memberPrice: act.memberPrice,
            nonMemberPrice: act.nonMemberPrice,
          });
        }
      }
    } else {
      const actIso = parseDateStringToIso(act.date, baseStart);
      if (actIso) {
        programs.push({
          id: act.id,
          date: actIso,
          programName: act.name || act.title || (act.type === 'main' ? 'Main Program' : 'Workshop'),
          isMainProgram: act.type === 'main',
          type: act.type || 'workshop',
          format: act.format || 'both',
          maxSeats: act.maxSeats,
          memberPrice: act.memberPrice,
          nonMemberPrice: act.nonMemberPrice,
        });
      }
    }
  }

  // 2. Main Program dates spanning from mainStartDate to mainEndDate
  if (mainStartDate) {
    const cur = new Date(mainStartDate);
    const end = new Date(mainEndDate);
    const totalDays = Math.max(1, Math.round((end.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    let dayIndex = 1;

    while (cur <= end) {
      const curStr = formatBangkokDate(cur);
      const hasForDate = programs.some((p) => p.date === curStr);
      if (!hasForDate) {
        const dayLabel = totalDays > 1 ? ` (Day ${dayIndex})` : '';
        programs.push({
          date: curStr,
          programName: `Main Program${dayLabel}`,
          isMainProgram: true,
          type: 'main',
          format: meeting.meeting_type || 'both',
        });
      }
      cur.setDate(cur.getDate() + 1);
      dayIndex++;
    }
  }

  // 3. Fallback if empty
  if (programs.length === 0 && mainStartDate) {
    programs.push({
      date: mainStartDate,
      programName: 'Main Program',
      isMainProgram: true,
      type: 'main',
    });
  }

  // 4. Sort: Date ascending (earliest first: เรียงจากรายการที่เริ่มก่อน)
  programs.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return (a.programName || '').localeCompare(b.programName || '');
  });

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
        const actMatch = matchingSlip.selected_activities.find((a: any) => {
          const parsed = parseDateStringToIso(a.date, meeting.meeting_date);
          return parsed === prog.date || (a.date && formatBangkokDate(a.date) === prog.date);
        });
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

  // 2. If not found by daily_qr_token, check if code contains ticket_code, member_no or attendance_id
  if (!dailyRecord) {
    // Extract possible clean ticket / member code
    let cleanCode = trimmed.replace(/^TSRM-PASS:/i, '').replace(/^TSRM-TICKET:/i, '').trim();
    if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanCode);
        cleanCode = parsed.code || parsed.ticket_code || parsed.ticketCode || parsed.member_no || parsed.memberNo || cleanCode;
      } catch { }
    }

    dailyRecord = await prisma.meeting_daily_checkins.findFirst({
      where: {
        OR: [
          { ticket_code: { equals: cleanCode, mode: 'insensitive' } },
          { member_no: cleanCode },
          { member_no: cleanCode.padStart(4, '0') },
          { daily_qr_token: { contains: cleanCode, mode: 'insensitive' } },
        ],
        ...(staffMeetingId ? { meeting_id: staffMeetingId } : {}),
      },
      orderBy: { checkin_date: 'asc' },
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
    const attendeeName = dailyRecord.members?.fullNameTh || dailyRecord.meeting_attendances?.attendee_name || 'ผู้เข้าร่วมประชุม';
    const attendeeEmail = dailyRecord.members?.email || dailyRecord.meeting_attendances?.attendee_email || '-';
    const programName = dailyRecord.program_name || 'Main Program';
    const ticketDisplay = `${dailyRecord.ticket_code} (${programName})`;

    // Check if ALREADY CHECKED IN (Duplicate)
    if (dailyRecord.checkin_status === 'attended' || dailyRecord.checkin_time !== null) {
      const existingTime = dailyRecord.checkin_time
        ? new Date(dailyRecord.checkin_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) + ' น.'
        : 'ก่อนหน้านี้';

      return {
        success: true,
        status: 'duplicate',
        message: `ผู้เข้าร่วมได้สแกนเช็คอินเข้าร่วม ${programName} (${formatThaiDate(recordDateStr, true)}) ไปแล้วเมื่อ ${existingTime}`,
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
      message: `เช็คอินเข้าร่วม ${programName} (${formatThaiDate(recordDateStr, true)}) สำเร็จ`,
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
