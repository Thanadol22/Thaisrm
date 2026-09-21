import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface FieldData {
  text: string | null;
  status: 'HAS_DATA' | 'EMPTY' | 'ERROR';
  errorDetail?: string;
  registrationStatus?: 'approved' | 'pending' | null;
  ticketCode?: string | null;
}

export interface RawMemberResult {
  member_no: string;
  id: bigint | number | null;
  full_name_th: string | null;
  full_name_en: string | null;
  id_last4: string | null;
  mobile: string | null;
  email: string | null;
  line_id: string | null;
  workplace: string | null;
  position: string | null;
  membership_status: string | null;
  membership_type: string | null;
  meeting_id: string | null;
  checkin_time: Date | string | null;
  meeting_name: string | null;
  meeting_date: Date | string | null;
  current_reg_status?: string | null;
  current_ticket_code?: string | null;
}

/**
 * ฟังก์ชันประมวลผลฟิลด์ข้อมูล
 */
function parseField(raw: unknown, transform?: (val: string) => string): FieldData {
  try {
    if (raw === null || raw === undefined) {
      return { text: null, status: 'EMPTY' };
    }

    if (typeof raw !== 'string' && typeof raw !== 'number') {
      return { text: null, status: 'ERROR', errorDetail: 'ชนิดข้อมูลไม่ถูกต้อง' };
    }

    let str = String(raw).trim();
    if (str === '' || str === '-' || str.toLowerCase() === 'null') {
      return { text: null, status: 'EMPTY' };
    }

    if (transform) {
      str = transform(str);
    }

    return { text: str, status: 'HAS_DATA' };
  } catch (err: unknown) {
    return {
      text: null,
      status: 'ERROR',
      errorDetail: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอ่านข้อมูล',
    };
  }
}

/**
 * แปลง Row จากฐานข้อมูลเป็น DTO สำหรับ Frontend
 */
function formatMemberRow(m: RawMemberResult, latestMeetingId: string) {
  let lastMeetingData: FieldData = { text: null, status: 'EMPTY' };
  try {
    const meetingName = m.meeting_name;
    const meetingDate = m.checkin_time || m.meeting_date;
    const isLatestRound = m.meeting_id === latestMeetingId;

    let regStatus: 'approved' | 'pending' | null = null;
    if (isLatestRound && m.current_reg_status) {
      const lower = m.current_reg_status.toLowerCase();
      if (['approved', 'registered', 'attended', 'non-member'].includes(lower)) {
        regStatus = 'approved';
      } else if (lower === 'pending') {
        regStatus = 'pending';
      }
    }

    if (meetingName && meetingDate) {
      const d = new Date(meetingDate);
      const dateStr = d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      lastMeetingData = {
        text: `${meetingName} (${dateStr})`,
        status: 'HAS_DATA',
        registrationStatus: regStatus,
        ticketCode: isLatestRound ? m.current_ticket_code || null : null,
      };
    } else if (meetingName) {
      lastMeetingData = {
        text: meetingName,
        status: 'HAS_DATA',
        registrationStatus: regStatus,
        ticketCode: isLatestRound ? m.current_ticket_code || null : null,
      };
    }
  } catch (err: unknown) {
    lastMeetingData = {
      text: null,
      status: 'ERROR',
      errorDetail: err instanceof Error ? err.message : 'ไม่สามารถประมวลผลข้อมูลการประชุมได้',
    };
  }

  const workplaceData = parseField(m.workplace, (val) =>
    val.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
  );
  const emailData = parseField(m.email);
  const positionData = parseField(m.position);
  const nameThData = parseField(m.full_name_th);
  const nameEnData = parseField(m.full_name_en);
  const memberTypeData = parseField(m.membership_type);
  const memberStatusData = parseField(m.membership_status || 'Active');
  const memberNoFormatted = m.member_no ? String(m.member_no).padStart(4, '0') : '-';

  return {
    id: m.id ? m.id.toString() : String(m.member_no),
    memberId: memberNoFormatted,
    nameTh: nameThData,
    nameEn: nameEnData,
    email: emailData,
    workplace: workplaceData,
    position: positionData,
    memberType: memberTypeData,
    membershipStatus: memberStatusData,
    memberStatus: memberStatusData,
    lastAttendedMeeting: lastMeetingData,
  };
}

// In-memory cache for search queries (TTL: 30 seconds)
interface CacheEntry {
  data: ReturnType<typeof formatMemberRow>[];
  timestamp: number;
}
const SEARCH_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 1000;
const MAX_CACHE_SIZE = 200;

function getCachedResult(key: string) {
  const entry = SEARCH_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    SEARCH_CACHE.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedResult(key: string, data: ReturnType<typeof formatMemberRow>[]) {
  if (SEARCH_CACHE.size >= MAX_CACHE_SIZE) {
    const firstKey = SEARCH_CACHE.keys().next().value;
    if (firstKey) SEARCH_CACHE.delete(firstKey);
  }
  SEARCH_CACHE.set(key, { data, timestamp: Date.now() });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQ = (searchParams.get('q') || '').trim();

    // หากไม่มีคำค้นหา ให้คืนค่าผลลัพธ์ว่างทันที
    if (!rawQ) {
      return NextResponse.json(
        { success: true, data: [] },
        { headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=30' } }
      );
    }

    const cacheKey = rawQ.toLowerCase();
    const cached = getCachedResult(cacheKey);
    if (cached) {
      return NextResponse.json(
        { success: true, data: cached },
        { headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=30' } }
      );
    }

    // 1. ดึงข้อมูลงานประชุมรอบล่าสุด (Latest / Upcoming Meeting)
    const latestMeeting = await prisma.meetings.findFirst({
      where: { status: 'upcoming' },
      orderBy: { meeting_date: 'asc' },
      select: { meeting_id: true, meeting_name: true, meeting_date: true }
    }) || await prisma.meetings.findFirst({
      orderBy: { meeting_date: 'desc' },
      select: { meeting_id: true, meeting_name: true, meeting_date: true }
    });

    const latestMeetingId = latestMeeting?.meeting_id || 'TSRM34';

    // ตัดคำนำหน้าชื่อทางวิชาชีพ/วิชาการ
    const prefixes = [
      'นพ.', 'พญ.', 'นพ ', 'พญ ', 'ศ.นพ.', 'รศ.นพ.', 'ผศ.นพ.', 'ศ.พญ.', 'รศ.พญ.', 'ผศ.พญ.',
      'ดร.', 'นว.', 'ภญ.', 'ภก.', 'พว.', 'นาย', 'นาง', 'นางสาว', 'น.ส.',
      'dr.', 'dr ', 'prof.', 'prof ', 'assoc. prof.', 'asst. prof.', 'mr.', 'mr ', 'mrs.', 'mrs ', 'ms.', 'ms ', 'rn.', 'rn '
    ];

    let cleanQ = rawQ;
    const lowerRaw = rawQ.toLowerCase();
    for (const prefix of prefixes) {
      if (lowerRaw.startsWith(prefix.toLowerCase())) {
        cleanQ = rawQ.slice(prefix.length).trim();
        break;
      }
    }

    const patternRaw = `%${rawQ}%`;
    const patternClean = `%${cleanQ}%`;

    let membersRaw: RawMemberResult[] = [];

    try {
      // 2. High-Performance CTE Query: ค้นหาตามชื่อเท่านั้น (full_name_th / full_name_en)
      if (cleanQ === rawQ) {
        membersRaw = await prisma.$queryRaw<RawMemberResult[]>`
          WITH matched AS (
            SELECT 
              m.member_no,
              m.id,
              m.full_name_th,
              m.full_name_en,
              m.id_last4,
              m.mobile,
              m.email,
              m.line_id,
              m.workplace,
              m.position,
              m.membership_status,
              m.membership_type,
              CASE 
                WHEN m.full_name_th ILIKE ${rawQ} THEN 1
                WHEN m.full_name_th ILIKE ${rawQ + '%'} THEN 2
                WHEN m.full_name_th ILIKE ${patternRaw} THEN 3
                WHEN m.full_name_en ILIKE ${patternRaw} THEN 4
                ELSE 5
              END AS sort_rank
            FROM members m
            WHERE 
              m.full_name_th ILIKE ${patternRaw}
              OR m.full_name_en ILIKE ${patternRaw}
            ORDER BY sort_rank, m.full_name_th ASC
            LIMIT 50
          )
          SELECT 
            m.member_no::text AS member_no,
            m.id,
            m.full_name_th,
            m.full_name_en,
            m.id_last4,
            m.mobile,
            m.email,
            m.line_id,
            m.workplace,
            m.position,
            m.membership_status,
            m.membership_type,
            ma.meeting_id,
            ma.checkin_time,
            ma.meeting_name,
            ma.meeting_date,
            ma.current_reg_status,
            ma.current_ticket_code
          FROM matched m
          LEFT JOIN LATERAL (
            SELECT 
              mt_sub.meeting_id,
              ma_sub.checkin_time,
              mt_sub.meeting_name,
              mt_sub.meeting_date,
              CASE 
                WHEN mt_sub.meeting_id = ${latestMeetingId} THEN 
                  COALESCE(s.status, CASE WHEN ma_sub.attendance_status IN ('Registered', 'Attended', 'approved', 'Non-Member') THEN 'approved' ELSE ma_sub.attendance_status END)
                ELSE NULL 
              END AS current_reg_status,
              s.ticket_code AS current_ticket_code
            FROM (
              SELECT ma_in.meeting_id, ma_in.checkin_time, ma_in.attendance_status, ma_in.attendance_id
              FROM meeting_attendances ma_in
              WHERE (ma_in.member_no = m.member_no OR (m.email IS NOT NULL AND LOWER(ma_in.attendee_email) = LOWER(m.email))) AND ma_in.attendance_status NOT IN ('Cancelled', 'Rejected')
              UNION ALL
              SELECT s_in.meeting_id, NULL::timestamptz AS checkin_time, s_in.status AS attendance_status, 999999::bigint AS attendance_id
              FROM payment_slips s_in
              WHERE (s_in.member_no = m.member_no OR (m.email IS NOT NULL AND LOWER(s_in.guest_email) = LOWER(m.email)))
                AND s_in.status IN ('approved', 'pending')
            ) ma_sub
            LEFT JOIN meetings mt_sub ON mt_sub.meeting_id = ma_sub.meeting_id
            LEFT JOIN payment_slips s ON s.meeting_id = ${latestMeetingId} AND (s.member_no = m.member_no OR (m.email IS NOT NULL AND LOWER(s.guest_email) = LOWER(m.email))) AND s.status IN ('approved', 'pending')
            ORDER BY 
              CASE WHEN mt_sub.meeting_id = ${latestMeetingId} THEN 0 ELSE 1 END,
              COALESCE(ma_sub.checkin_time, mt_sub.start_date, mt_sub.meeting_date) DESC NULLS LAST,
              mt_sub.meeting_date DESC NULLS LAST,
              ma_sub.attendance_id DESC
            LIMIT 1
          ) ma ON true
          ORDER BY m.sort_rank, m.full_name_th ASC;
        `;
      } else {
        membersRaw = await prisma.$queryRaw<RawMemberResult[]>`
          WITH matched AS (
            SELECT 
              m.member_no,
              m.id,
              m.full_name_th,
              m.full_name_en,
              m.id_last4,
              m.mobile,
              m.email,
              m.line_id,
              m.workplace,
              m.position,
              m.membership_status,
              m.membership_type,
              CASE 
                WHEN m.full_name_th ILIKE ${cleanQ} THEN 1
                WHEN m.full_name_th ILIKE ${cleanQ + '%'} THEN 2
                WHEN m.full_name_th ILIKE ${patternClean} THEN 3
                WHEN m.full_name_en ILIKE ${patternClean} THEN 4
                WHEN m.full_name_th ILIKE ${patternRaw} THEN 5
                ELSE 6
              END AS sort_rank
            FROM members m
            WHERE 
              m.full_name_th ILIKE ${patternRaw}
              OR m.full_name_en ILIKE ${patternRaw}
              OR m.full_name_th ILIKE ${patternClean}
              OR m.full_name_en ILIKE ${patternClean}
            ORDER BY sort_rank, m.full_name_th ASC
            LIMIT 50
          )
          SELECT 
            m.member_no::text AS member_no,
            m.id,
            m.full_name_th,
            m.full_name_en,
            m.id_last4,
            m.mobile,
            m.email,
            m.line_id,
            m.workplace,
            m.position,
            m.membership_status,
            m.membership_type,
            ma.meeting_id,
            ma.checkin_time,
            ma.meeting_name,
            ma.meeting_date,
            ma.current_reg_status,
            ma.current_ticket_code
          FROM matched m
          LEFT JOIN LATERAL (
            SELECT 
              mt_sub.meeting_id,
              ma_sub.checkin_time,
              mt_sub.meeting_name,
              mt_sub.meeting_date,
              CASE 
                WHEN mt_sub.meeting_id = ${latestMeetingId} THEN 
                  COALESCE(s.status, CASE WHEN ma_sub.attendance_status IN ('Registered', 'Attended', 'approved', 'Non-Member') THEN 'approved' ELSE ma_sub.attendance_status END)
                ELSE NULL 
              END AS current_reg_status,
              s.ticket_code AS current_ticket_code
            FROM (
              SELECT ma_in.meeting_id, ma_in.checkin_time, ma_in.attendance_status, ma_in.attendance_id
              FROM meeting_attendances ma_in
              WHERE (ma_in.member_no = m.member_no OR (m.email IS NOT NULL AND LOWER(ma_in.attendee_email) = LOWER(m.email))) AND ma_in.attendance_status NOT IN ('Cancelled', 'Rejected')
              UNION ALL
              SELECT s_in.meeting_id, NULL::timestamptz AS checkin_time, s_in.status AS attendance_status, 999999::bigint AS attendance_id
              FROM payment_slips s_in
              WHERE (s_in.member_no = m.member_no OR (m.email IS NOT NULL AND LOWER(s_in.guest_email) = LOWER(m.email)))
                AND s_in.status IN ('approved', 'pending')
            ) ma_sub
            LEFT JOIN meetings mt_sub ON mt_sub.meeting_id = ma_sub.meeting_id
            LEFT JOIN payment_slips s ON s.meeting_id = ${latestMeetingId} AND (s.member_no = m.member_no OR (m.email IS NOT NULL AND LOWER(s.guest_email) = LOWER(m.email))) AND s.status IN ('approved', 'pending')
            ORDER BY 
              CASE WHEN mt_sub.meeting_id = ${latestMeetingId} THEN 0 ELSE 1 END,
              COALESCE(ma_sub.checkin_time, mt_sub.start_date, mt_sub.meeting_date) DESC NULLS LAST,
              mt_sub.meeting_date DESC NULLS LAST,
              ma_sub.attendance_id DESC
            LIMIT 1
          ) ma ON true
          ORDER BY m.sort_rank, m.full_name_th ASC;
        `;
      }
    } catch (queryErr) {
      console.warn('CTE search query failed, attempting fallback to members table:', queryErr);

      // Fallback Query: ค้นหาตามชื่อเท่านั้น
      membersRaw = await prisma.$queryRaw<RawMemberResult[]>`
        SELECT 
          m.member_no::text AS member_no,
          m.id,
          m.full_name_th,
          m.full_name_en,
          m.id_last4,
          m.mobile,
          m.email,
          m.line_id,
          m.workplace,
          m.position,
          m.membership_status,
          m.membership_type,
          NULL::text AS meeting_id,
          NULL::timestamptz AS checkin_time,
          NULL::text AS meeting_name,
          NULL::date AS meeting_date,
          NULL::text AS current_reg_status,
          NULL::text AS current_ticket_code
        FROM members m
        WHERE 
          m.full_name_th ILIKE ${patternRaw}
          OR m.full_name_en ILIKE ${patternRaw}
          OR m.full_name_th ILIKE ${patternClean}
          OR m.full_name_en ILIKE ${patternClean}
        ORDER BY 
          CASE 
            WHEN m.full_name_th ILIKE ${cleanQ} THEN 1
            WHEN m.full_name_th ILIKE ${patternClean} THEN 2
            WHEN m.full_name_en ILIKE ${patternClean} THEN 3
            ELSE 4
          END,
          m.full_name_th ASC
        LIMIT 50;
      `;
    }

    const data = membersRaw.map((m) => formatMemberRow(m, latestMeetingId));
    setCachedResult(cacheKey, data);

    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=30' } }
    );
  } catch (error) {
    console.error('API /api/members/search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการค้นหาข้อมูลสมาชิก',
      },
      { status: 500 }
    );
  }
}
