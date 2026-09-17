import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface CreateMeetingInput {
  meeting_id: string;
  meeting_name: string;
  meeting_date: string;          // ISO date string or Thai date range
  start_date?: string | Date | null;
  end_date?: string | Date | null;
  counts_toward_active?: boolean;
  meeting_time?: string;
  location?: string;
  meeting_type?: string;         // 'onsite' | 'online' | 'hybrid'
  staff_code?: string;
  description?: string;
  base_price?: number;
  pricing_tiers?: Prisma.JsonValue;
  activities?: Prisma.JsonValue;
  max_seats?: number;
  status?: string;               // 'upcoming' | 'ongoing' | 'completed'
}

export interface UpdateMeetingInput {
  meeting_name?: string;
  meeting_date?: string;
  start_date?: string | Date | null;
  end_date?: string | Date | null;
  counts_toward_active?: boolean;
  meeting_time?: string;
  location?: string;
  meeting_type?: string;
  staff_code?: string;
  description?: string;
  base_price?: number;
  pricing_tiers?: Prisma.JsonValue;
  activities?: Prisma.JsonValue;
  max_seats?: number;
  status?: string;
}

export interface GetMeetingsParams {
  search?: string;
  status?: string;
  meeting_type?: string;
  page?: number;
  limit?: number;
  sort_by?: 'meeting_date' | 'meeting_name' | 'meeting_id';
  order?: 'asc' | 'desc';
}

/* ─── In-Memory Cache for Latest Active Meeting ───────────────────── */

let latestMeetingCache: { data: any; timestamp: number } | null = null;
const LATEST_MEETING_CACHE_TTL_MS = 30000; // 30 seconds cache

export function invalidateLatestMeetingCache() {
  latestMeetingCache = null;
}

/* ─── HELPER: Generate Next TSRM Meeting ID ───────────────────────── */

export async function getNextMeetingId(): Promise<string> {
  const meetings = await prisma.meetings.findMany({
    select: { meeting_id: true, meeting_name: true },
  });

  let maxNum = 33; // Default baseline if not found (current known is 34)

  for (const m of meetings) {
    // Check meeting_id format TSRM<number> (e.g. TSRM34, TSRM31)
    const idMatch = m.meeting_id.match(/^TSRM\s*(\d+)/i);
    if (idMatch) {
      const num = parseInt(idMatch[1], 10);
      if (num < 1000 && num > maxNum) { // Ignore 4-digit years like 2025, 2026
        maxNum = num;
      }
    }
    // Check meeting_name format (e.g. "TSRM 2025 (TSRM31)", "34th TSRM...")
    const nameMatch = m.meeting_name.match(/TSRM\s*(\d+)|(\d+)(?:st|nd|rd|th)?\s*TSRM/i);
    if (nameMatch) {
      const num = parseInt(nameMatch[1] || nameMatch[2], 10);
      if (num < 1000 && num > maxNum) {
        maxNum = num;
      }
    }
  }

  return `TSRM${maxNum + 1}`;
}

export function formatMeetingId(rawId?: string): string {
  if (!rawId || !rawId.trim()) return '';
  const trimmed = rawId.trim();
  // If user typed only a number like "34", convert to "TSRM34"
  if (/^\d+$/.test(trimmed)) {
    return `TSRM${trimmed}`;
  }
  // If user typed "tsrm 34" or "tsrm34", normalize to "TSRM34"
  const match = trimmed.match(/^tsrm\s*(\d+)$/i);
  if (match) {
    return `TSRM${match[1]}`;
  }
  return trimmed.toUpperCase();
}

/* ─── CREATE ────────────────────────────────────────────────────────── */

export async function createMeeting(input: CreateMeetingInput) {
  // Parse meeting_date into start_at and end_at
  const { start_at, end_at, formattedText } = parseMeetingDateRange(input.meeting_date);

  // Format or generate meeting_id as TSRM<sequence>
  let finalMeetingId = formatMeetingId(input.meeting_id);
  if (!finalMeetingId) {
    finalMeetingId = await getNextMeetingId();
  }

  // Merge dateRange into pricing_tiers
  let pricingTiersObj: Record<string, unknown> = typeof input.pricing_tiers === 'object' && input.pricing_tiers !== null
    ? { ...(input.pricing_tiers as Record<string, unknown>) }
    : {};
  pricingTiersObj.dateRange = {
    start_at: start_at.toISOString(),
    end_at: end_at ? end_at.toISOString() : null,
    formatted: formattedText,
  };

  const meeting = await prisma.meetings.create({
    data: {
      meeting_id: finalMeetingId,
      meeting_name: input.meeting_name,
      meeting_date: start_at,
      counts_toward_active: input.counts_toward_active ?? true,
      meeting_time: input.meeting_time || null,
      location: input.location || null,
      meeting_type: input.meeting_type || 'onsite',
      staff_code: input.staff_code || null,
      description: input.description || null,
      base_price: input.base_price ?? 0,
      pricing_tiers: pricingTiersObj as Prisma.InputJsonValue,
      activities: input.activities ?? Prisma.JsonNull,
      max_seats: input.max_seats ?? 0,
      status: input.status || 'upcoming',
    },
  });

  try {
    await prisma.$executeRaw`
      UPDATE meetings
      SET start_date = ${start_at},
          end_date = ${end_at}
      WHERE meeting_id = ${finalMeetingId}
    `;
  } catch (rawErr) {
    console.warn('Could not set start_date / end_date in DB:', rawErr);
  }

  invalidateLatestMeetingCache();
  return meeting;
}

/* ─── READ (List with search/filter/pagination) ────────────────────── */

export async function getMeetings(params: GetMeetingsParams = {}) {
  const {
    search,
    status,
    meeting_type,
    page = 1,
    limit = 20,
    sort_by = 'meeting_date',
    order = 'desc',
  } = params;

  const where: Prisma.meetingsWhereInput = {};

  // Search filter
  if (search) {
    where.OR = [
      { meeting_name: { contains: search, mode: 'insensitive' } },
      { meeting_id: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Status filter
  if (status && status !== 'all') {
    where.status = status;
  }

  // Meeting type filter
  if (meeting_type && meeting_type !== 'all') {
    where.meeting_type = meeting_type;
  }

  const [meetings, total] = await Promise.all([
    prisma.meetings.findMany({
      where,
      orderBy: { [sort_by]: order },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: { meeting_attendances: true },
        },
      },
    }),
    prisma.meetings.count({ where }),
  ]);

  // Aggregate attended count and approved revenue from DB
  const meetingIds = meetings.map((m) => m.meeting_id);
  let attendedMap = new Map<string, number>();
  let revenueMap = new Map<string, number>();

  if (meetingIds.length > 0) {
    try {
      const p = prisma as any;
      const tasks: Promise<any>[] = [];
      if (p.meeting_attendances?.groupBy) {
        tasks.push(
          p.meeting_attendances.groupBy({
            by: ['meeting_id'],
            where: {
              meeting_id: { in: meetingIds },
              OR: [
                { checkin_time: { not: null } },
                { attendance_status: 'Attended' },
              ],
            },
            _count: { attendance_id: true },
          })
        );
      } else {
        tasks.push(Promise.resolve([]));
      }

      if (p.payment_slips?.groupBy) {
        tasks.push(
          p.payment_slips.groupBy({
            by: ['meeting_id'],
            where: {
              meeting_id: { in: meetingIds },
              status: 'approved',
            },
            _sum: { amount: true },
          })
        );
      } else {
        tasks.push(Promise.resolve([]));
      }

      const [attendancesStats, revenueStats] = await Promise.all(tasks);

      if (Array.isArray(attendancesStats)) {
        attendancesStats.forEach((st: any) => {
          attendedMap.set(st.meeting_id, st._count?.attendance_id || 0);
        });
      }

      if (Array.isArray(revenueStats)) {
        revenueStats.forEach((rev: any) => {
          revenueMap.set(rev.meeting_id, rev._sum?.amount || 0);
        });
      }
    } catch (aggErr) {
      console.error('Error aggregating meeting stats:', aggErr);
    }
  }

  const enhancedMeetings = meetings.map((m) => ({
    ...m,
    attended_count: attendedMap.get(m.meeting_id) || 0,
    approved_revenue: revenueMap.get(m.meeting_id) || 0,
  }));

  // Sort meetings by status priority (ongoing > upcoming > completed) then newest first
  const STATUS_PRIORITY: Record<string, number> = {
    ongoing: 1,
    upcoming: 2,
    completed: 3,
  };

  enhancedMeetings.sort((a, b) => {
    const pA = a.status ? (STATUS_PRIORITY[a.status] || 99) : 99;
    const pB = b.status ? (STATUS_PRIORITY[b.status] || 99) : 99;
    if (pA !== pB) return pA - pB;

    const dateA = (a as any).start_date || a.meeting_date ? new Date((a as any).start_date || a.meeting_date).getTime() : 0;
    const dateB = (b as any).start_date || b.meeting_date ? new Date((b as any).start_date || b.meeting_date).getTime() : 0;
    if (dateA !== dateB && !isNaN(dateA) && !isNaN(dateB)) return dateB - dateA;

    const numA = parseInt((a.meeting_id.match(/\d+/) || ['0'])[0], 10);
    const numB = parseInt((b.meeting_id.match(/\d+/) || ['0'])[0], 10);
    if (numA !== numB) return numB - numA;
    return b.meeting_id.localeCompare(a.meeting_id);
  });

  return {
    data: enhancedMeetings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/* ─── READ (Single by ID) ──────────────────────────────────────────── */

export async function getMeetingById(meetingId: string) {
  const meeting = await prisma.meetings.findUnique({
    where: { meeting_id: meetingId },
    include: {
      _count: {
        select: { meeting_attendances: true },
      },
    },
  });

  return meeting;
}

/* ─── READ (Latest Active/Open Meeting) ────────────────────────────── */

export async function getLatestActiveMeeting(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && latestMeetingCache && now - latestMeetingCache.timestamp < LATEST_MEETING_CACHE_TTL_MS) {
    return latestMeetingCache.data;
  }

  // Find latest meeting that is 'upcoming' or 'ongoing' ordered by meeting_date desc
  const meeting = await prisma.meetings.findFirst({
    where: {
      status: { in: ['upcoming', 'ongoing'] },
    },
    orderBy: { meeting_date: 'desc' },
    include: {
      _count: {
        select: { meeting_attendances: true },
      },
    },
  });

  latestMeetingCache = { data: meeting, timestamp: now };
  return meeting;
}


/* ─── UPDATE ────────────────────────────────────────────────────────── */

export interface DateRangeParsed {
  start_at: Date;
  end_at: Date | null;
  formattedText: string;
}

export async function updateMeeting(meetingId: string, input: UpdateMeetingInput) {
  const data: Prisma.meetingsUpdateInput = {};

  if (input.meeting_name !== undefined) data.meeting_name = input.meeting_name;
  if (input.counts_toward_active !== undefined) data.counts_toward_active = input.counts_toward_active;
  if (input.meeting_time !== undefined) data.meeting_time = input.meeting_time;
  if (input.location !== undefined) data.location = input.location;
  if (input.meeting_type !== undefined) data.meeting_type = input.meeting_type;
  if (input.staff_code !== undefined) data.staff_code = input.staff_code;
  if (input.description !== undefined) data.description = input.description;
  if (input.base_price !== undefined) data.base_price = input.base_price;
  if (input.activities !== undefined) data.activities = input.activities === null ? Prisma.JsonNull : input.activities as Prisma.InputJsonValue;
  if (input.max_seats !== undefined) data.max_seats = input.max_seats;
  if (input.status !== undefined) data.status = input.status;

  let pricingTiersObj: Record<string, unknown> | undefined = undefined;
  if (input.pricing_tiers !== undefined && input.pricing_tiers !== null && typeof input.pricing_tiers === 'object') {
    pricingTiersObj = { ...(input.pricing_tiers as Record<string, unknown>) };
  }

  let startDateToUpdate: Date | null | undefined = undefined;
  let endDateToUpdate: Date | null | undefined = undefined;

  if (input.meeting_date !== undefined) {
    const { start_at, end_at, formattedText } = parseMeetingDateRange(input.meeting_date);
    data.meeting_date = start_at;
    startDateToUpdate = start_at;
    endDateToUpdate = end_at;

    if (!pricingTiersObj) {
      const existing = await prisma.meetings.findUnique({
        where: { meeting_id: meetingId },
        select: { pricing_tiers: true },
      });
      pricingTiersObj = existing?.pricing_tiers && typeof existing.pricing_tiers === 'object'
        ? { ...(existing.pricing_tiers as Record<string, unknown>) }
        : {};
    }

    pricingTiersObj.dateRange = {
      start_at: start_at.toISOString(),
      end_at: end_at ? end_at.toISOString() : null,
      formatted: formattedText,
    };
  }

  if (input.start_date !== undefined) {
    const s = typeof input.start_date === 'string' ? parseMeetingDate(input.start_date) : input.start_date;
    startDateToUpdate = s || null;
    if (s) data.meeting_date = s;
  }

  if (input.end_date !== undefined) {
    const e = typeof input.end_date === 'string' ? parseMeetingDate(input.end_date) : input.end_date;
    endDateToUpdate = e || null;
  }

  if (pricingTiersObj !== undefined) {
    data.pricing_tiers = pricingTiersObj as Prisma.InputJsonValue;
  }

  const meeting = await prisma.meetings.update({
    where: { meeting_id: meetingId },
    data,
  });

  if (startDateToUpdate !== undefined || endDateToUpdate !== undefined) {
    try {
      if (startDateToUpdate !== undefined && endDateToUpdate !== undefined) {
        await prisma.$executeRaw`
          UPDATE meetings
          SET start_date = ${startDateToUpdate},
              end_date = ${endDateToUpdate}
          WHERE meeting_id = ${meetingId}
        `;
      } else if (startDateToUpdate !== undefined) {
        await prisma.$executeRaw`
          UPDATE meetings
          SET start_date = ${startDateToUpdate}
          WHERE meeting_id = ${meetingId}
        `;
      } else if (endDateToUpdate !== undefined) {
        await prisma.$executeRaw`
          UPDATE meetings
          SET end_date = ${endDateToUpdate}
          WHERE meeting_id = ${meetingId}
        `;
      }
    } catch (rawErr) {
      console.warn('Could not update start_date / end_date in DB:', rawErr);
    }
  }

  invalidateLatestMeetingCache();
  return meeting;
}

/* ─── DELETE ────────────────────────────────────────────────────────── */

export async function deleteMeeting(meetingId: string) {
  // Delete associated attendances first, then meeting
  await prisma.meeting_attendances.deleteMany({
    where: { meeting_id: meetingId },
  });

  const meeting = await prisma.meetings.delete({
    where: { meeting_id: meetingId },
  });

  invalidateLatestMeetingCache();
  return meeting;
}

/* ─── Helper: Parse Thai date string to JS Date ─────────────────────── */

const THAI_MONTHS: Record<string, number> = {
  // Full names
  'มกราคม': 0, 'กุมภาพันธ์': 1, 'มีนาคม': 2, 'เมษายน': 3,
  'พฤษภาคม': 4, 'มิถุนายน': 5, 'กรกฎาคม': 6, 'สิงหาคม': 7,
  'กันยายน': 8, 'ตุลาคม': 9, 'พฤศจิกายน': 10, 'ธันวาคม': 11,
  // Short names with dot
  'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3,
  'พ.ค.': 4, 'มิ.ย.': 5, 'ก.ค.': 6, 'ส.ค.': 7,
  'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11,
  // Short names without trailing dot
  'ม.ค': 0, 'ก.พ': 1, 'มี.ค': 2, 'เม.ย': 3,
  'พ.ค': 4, 'มิ.ย': 5, 'ก.ค': 6, 'ส.ค': 7,
  'ก.ย': 8, 'ต.ค': 9, 'พ.ย': 10, 'ธ.ค': 11,
  // Short names without dots
  'มค': 0, 'กพ': 1, 'มีค': 2, 'เมย': 3,
  'พค': 4, 'มิย': 5, 'กค': 6, 'สค': 7,
  'กย': 8, 'ตค': 9, 'พย': 10, 'ธค': 11,
};

const THAI_MONTH_FULL_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export function parseMeetingDateRange(dateStr: string): DateRangeParsed {
  if (!dateStr || typeof dateStr !== 'string') {
    const now = new Date();
    return {
      start_at: now,
      end_at: null,
      formattedText: `${now.getUTCDate()} ${THAI_MONTH_FULL_NAMES[now.getUTCMonth()]} ${now.getUTCFullYear() + 543}`,
    };
  }

  const trimmed = dateStr.trim();

  // 1. ISO Format (e.g. 2026-09-15)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const isoDate = new Date(trimmed);
    if (!isNaN(isoDate.getTime())) {
      const year = isoDate.getUTCFullYear();
      const month = isoDate.getUTCMonth();
      const day = isoDate.getUTCDate();
      return {
        start_at: isoDate,
        end_at: null,
        formattedText: `${day} ${THAI_MONTH_FULL_NAMES[month]} ${year + 543}`,
      };
    }
  }

  const cleaned = trimmed.replace(/^วันที่\s*/, '').trim();

  // 2. Cross month: "28 กันยายน - 2 ตุลาคม 2569" or "28 ก.ย. - 2 ต.ค. 2569"
  const crossMonth = cleaned.match(/^(\d{1,2})\s+([^\d\s-]+?)(?:\s+(\d{4}))?\s*[-–—]\s*(\d{1,2})\s+([^\d\s-]+?)\s+(?:พ\.ศ\.\s*)?(\d{4})/);
  if (crossMonth) {
    const d1 = parseInt(crossMonth[1], 10);
    const m1 = crossMonth[2].trim();
    const d2 = parseInt(crossMonth[4], 10);
    const m2 = crossMonth[5].trim();
    let y = parseInt(crossMonth[6] || crossMonth[3], 10);
    if (y > 2400) y -= 543;
    const mIdx1 = THAI_MONTHS[m1];
    const mIdx2 = THAI_MONTHS[m2];
    if (mIdx1 !== undefined && mIdx2 !== undefined) {
      const start = new Date(Date.UTC(y, mIdx1, d1));
      const end = new Date(Date.UTC(y, mIdx2, d2));
      return {
        start_at: start,
        end_at: end,
        formattedText: `${d1} ${THAI_MONTH_FULL_NAMES[mIdx1]} - ${d2} ${THAI_MONTH_FULL_NAMES[mIdx2]} ${y + 543}`,
      };
    }
  }

  // 3. Same month range: "15 - 17 กันยายน 2569" or "15-17 ก.ย. 2569"
  const sameMonth = cleaned.match(/^(\d{1,2})\s*[-–—]\s*(\d{1,2})\s+([^\d\s]+)\s+(?:พ\.ศ\.\s*)?(\d{4})/);
  if (sameMonth) {
    const d1 = parseInt(sameMonth[1], 10);
    const d2 = parseInt(sameMonth[2], 10);
    const m = sameMonth[3].trim();
    let y = parseInt(sameMonth[4], 10);
    if (y > 2400) y -= 543;
    const mIdx = THAI_MONTHS[m];
    if (mIdx !== undefined) {
      const start = new Date(Date.UTC(y, mIdx, d1));
      const end = new Date(Date.UTC(y, mIdx, d2));
      return {
        start_at: start,
        end_at: end,
        formattedText: `${d1} - ${d2} ${THAI_MONTH_FULL_NAMES[mIdx]} ${y + 543}`,
      };
    }
  }

  // 4. Single date: "15 กันยายน 2569" or "15 ก.ย. 2569"
  const single = cleaned.match(/^(\d{1,2})\s+([^\d\s]+)\s+(?:พ\.ศ\.\s*)?(\d{4})/);
  if (single) {
    const d = parseInt(single[1], 10);
    const m = single[2].trim();
    let y = parseInt(single[3], 10);
    if (y > 2400) y -= 543;
    const mIdx = THAI_MONTHS[m];
    if (mIdx !== undefined) {
      const start = new Date(Date.UTC(y, mIdx, d));
      return {
        start_at: start,
        end_at: null,
        formattedText: `${d} ${THAI_MONTH_FULL_NAMES[mIdx]} ${y + 543}`,
      };
    }
  }

  const fallback = parseMeetingDate(dateStr);
  return {
    start_at: fallback,
    end_at: null,
    formattedText: `${fallback.getUTCDate()} ${THAI_MONTH_FULL_NAMES[fallback.getUTCMonth()]} ${fallback.getUTCFullYear() + 543}`,
  };
}

export function parseMeetingDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date();
  }

  const trimmed = dateStr.trim();

  // Try ISO format (e.g. 2026-09-15 or 2026-09-15T00:00:00.000Z)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const isoDate = new Date(trimmed);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
  }

  // Remove leading "วันที่" and clean spaces
  const cleaned = trimmed.replace(/^วันที่\s*/, '').trim();

  // 1. Check for cross-month range: "28 ก.ย. - 2 ต.ค. 2569" or "28 ก.ย. 2569 - 2 ต.ค. 2569"
  const crossMonthMatch = cleaned.match(/^(\d{1,2})\s+([^\d\s-]+?)(?:\s+(\d{4}))?\s*[-–—]\s*(\d{1,2})\s+([^\d\s-]+?)\s+(?:พ\.ศ\.\s*)?(\d{4})/);
  if (crossMonthMatch) {
    const day = parseInt(crossMonthMatch[1], 10);
    const monthKey = crossMonthMatch[2].trim();
    let year = parseInt(crossMonthMatch[3] || crossMonthMatch[6], 10);
    if (year > 2400) year -= 543;
    const monthIndex = THAI_MONTHS[monthKey];
    if (monthIndex !== undefined) {
      return new Date(Date.UTC(year, monthIndex, day));
    }
  }

  // 2. Check for same-month range or single date:
  // e.g. "15-17 ก.ย. 2569", "15 - 17 กันยายน 2569", "15 ก.ย. 2569", "15 กันยายน 2569"
  const thaiMatch = cleaned.match(/^(\d{1,2})(?:\s*[-–—]\s*\d{1,2})?\s+([^\d\s]+)\s+(?:พ\.ศ\.\s*)?(\d{4})/);
  if (thaiMatch) {
    const day = parseInt(thaiMatch[1], 10);
    const monthKey = thaiMatch[2].trim();
    let year = parseInt(thaiMatch[3], 10);
    if (year > 2400) year -= 543;
    const monthIndex = THAI_MONTHS[monthKey];
    if (monthIndex !== undefined) {
      return new Date(Date.UTC(year, monthIndex, day));
    }
  }

  // 3. Fallback: try finding any day, Thai month name, and 4-digit year in string
  const anyDay = cleaned.match(/(\d{1,2})/);
  const anyYear = cleaned.match(/(\d{4})/);
  let foundMonthIndex: number | undefined;
  for (const [mName, mIdx] of Object.entries(THAI_MONTHS)) {
    if (cleaned.includes(mName)) {
      foundMonthIndex = mIdx;
      break;
    }
  }

  if (anyDay && anyYear && foundMonthIndex !== undefined) {
    const day = parseInt(anyDay[1], 10);
    let year = parseInt(anyYear[1], 10);
    if (year > 2400) year -= 543;
    return new Date(Date.UTC(year, foundMonthIndex, day));
  }

  // 4. Try generic Date constructor
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  throw new Error(`Cannot parse date: ${dateStr}`);
}
