import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface CreateMeetingInput {
  meeting_id: string;
  meeting_name: string;
  meeting_date: string;          // ISO date string
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

/* ─── CREATE ────────────────────────────────────────────────────────── */

export async function createMeeting(input: CreateMeetingInput) {
  // Parse meeting_date: support Thai date range format like "วันที่ 20 - 23 ตุลาคม พ.ศ. 2569"
  let parsedDate: Date;
  try {
    parsedDate = parseMeetingDate(input.meeting_date);
  } catch {
    // Fallback to current date if parsing fails
    parsedDate = new Date();
  }

  const meeting = await prisma.meetings.create({
    data: {
      meeting_id: input.meeting_id,
      meeting_name: input.meeting_name,
      meeting_date: parsedDate,
      counts_toward_active: input.counts_toward_active ?? true,
      meeting_time: input.meeting_time || null,
      location: input.location || null,
      meeting_type: input.meeting_type || 'onsite',
      staff_code: input.staff_code || null,
      description: input.description || null,
      base_price: input.base_price ?? 0,
      pricing_tiers: input.pricing_tiers ?? Prisma.JsonNull,
      activities: input.activities ?? Prisma.JsonNull,
      max_seats: input.max_seats ?? 0,
      status: input.status || 'upcoming',
    },
  });

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

  return {
    data: meetings,
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

/* ─── UPDATE ────────────────────────────────────────────────────────── */

export async function updateMeeting(meetingId: string, input: UpdateMeetingInput) {
  const data: Prisma.meetingsUpdateInput = {};

  if (input.meeting_name !== undefined) data.meeting_name = input.meeting_name;
  if (input.meeting_date !== undefined) {
    try {
      data.meeting_date = parseMeetingDate(input.meeting_date);
    } catch {
      // skip if parse fails
    }
  }
  if (input.counts_toward_active !== undefined) data.counts_toward_active = input.counts_toward_active;
  if (input.meeting_time !== undefined) data.meeting_time = input.meeting_time;
  if (input.location !== undefined) data.location = input.location;
  if (input.meeting_type !== undefined) data.meeting_type = input.meeting_type;
  if (input.staff_code !== undefined) data.staff_code = input.staff_code;
  if (input.description !== undefined) data.description = input.description;
  if (input.base_price !== undefined) data.base_price = input.base_price;
  if (input.pricing_tiers !== undefined) data.pricing_tiers = input.pricing_tiers === null ? Prisma.JsonNull : input.pricing_tiers as Prisma.InputJsonValue;
  if (input.activities !== undefined) data.activities = input.activities === null ? Prisma.JsonNull : input.activities as Prisma.InputJsonValue;
  if (input.max_seats !== undefined) data.max_seats = input.max_seats;
  if (input.status !== undefined) data.status = input.status;

  const meeting = await prisma.meetings.update({
    where: { meeting_id: meetingId },
    data,
  });

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

  return meeting;
}

/* ─── Helper: Parse Thai date string to JS Date ─────────────────────── */

const THAI_MONTHS: Record<string, number> = {
  'มกราคม': 0, 'กุมภาพันธ์': 1, 'มีนาคม': 2, 'เมษายน': 3,
  'พฤษภาคม': 4, 'มิถุนายน': 5, 'กรกฎาคม': 6, 'สิงหาคม': 7,
  'กันยายน': 8, 'ตุลาคม': 9, 'พฤศจิกายน': 10, 'ธันวาคม': 11,
};

function parseMeetingDate(dateStr: string): Date {
  // Try ISO format first
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime()) && dateStr.includes('-')) {
    return isoDate;
  }

  // Try Thai format: "วันที่ 20 - 23 ตุลาคม พ.ศ. 2569" or "วันที่ 20 ตุลาคม พ.ศ. 2569"
  // Extract first date (start date) for the meeting_date field
  const thaiMatch = dateStr.match(/(\d{1,2})\s*[-–]?\s*(?:\d{1,2}\s*)?(\S+)\s*(?:พ\.ศ\.\s*)?(\d{4})/);
  if (thaiMatch) {
    const day = parseInt(thaiMatch[1]);
    const monthName = thaiMatch[2];
    let year = parseInt(thaiMatch[3]);

    // Convert Buddhist year to Gregorian
    if (year > 2400) {
      year -= 543;
    }

    const monthIndex = THAI_MONTHS[monthName];
    if (monthIndex !== undefined) {
      return new Date(year, monthIndex, day);
    }
  }

  throw new Error(`Cannot parse date: ${dateStr}`);
}
