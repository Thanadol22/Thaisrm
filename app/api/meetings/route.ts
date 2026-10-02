import { NextRequest, NextResponse } from 'next/server';
import {
  createMeeting,
  getMeetings,
  CreateMeetingInput,
} from '@/lib/services/meetingService';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import prisma from '@/lib/prisma';
import {
  getActivitySeatUsage,
  seatLimitedActivities,
  SEAT_COUNTED_STATUSES,
  summarizeSeatUsage,
  withSeatUsage,
} from '@/lib/services/activitySeatService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/meetings
 * ดึงรายการประชุม พร้อมรองรับ Search, Filter และ Pagination
 * Query Parameters:
 *   - search: string
 *   - status: string ('all' | 'upcoming' | 'ongoing' | 'completed')
 *   - meeting_type: string ('all' | 'onsite' | 'online')
 *   - page: number (default: 1)
 *   - limit: number (default: 20)
 *   - sort_by: string ('meeting_date' | 'meeting_name' | 'meeting_id')
 *   - order: string ('asc' | 'desc')
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // Public endpoints: latest, active meeting info for public forms
    const isPublicAction = action === 'latest' || action === 'active' || action === 'next_id';

    if (!isPublicAction) {
      const session = getAdminSessionFromRequest(req);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }
    if (action === 'next_id') {
      const { getNextMeetingId } = await import('@/lib/services/meetingService');
      const nextId = await getNextMeetingId();
      return NextResponse.json({ success: true, nextMeetingId: nextId });
    }

    if (action === 'latest' || action === 'active') {
      const { getLatestActiveMeeting } = await import('@/lib/services/meetingService');
      const meeting = await getLatestActiveMeeting();
      const data = meeting
        ? withSeatUsage(meeting, await getActivitySeatUsage(meeting.meeting_id, { meetingActivities: meeting.activities }))
        : meeting;
      return NextResponse.json(
        { success: true, data },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        }
      );
    }

    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const meeting_type = searchParams.get('meeting_type') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const sort_by = (searchParams.get('sort_by') as 'meeting_date' | 'meeting_name' | 'meeting_id') || 'meeting_date';
    const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc';

    const result = await getMeetings({
      search,
      status,
      meeting_type,
      page,
      limit,
      sort_by,
      order,
    });

    // ที่นั่งที่ใช้ไปของแต่ละเวิร์กช็อป (นับรายการที่รอตรวจสอบและอนุมัติแล้ว)
    const limitedMeetingIds = result.data
      .filter((m: any) => seatLimitedActivities(m.activities).length > 0)
      .map((m: any) => m.meeting_id);
    const seatSlips = limitedMeetingIds.length > 0
      ? await prisma.payment_slips.findMany({
          where: { meeting_id: { in: limitedMeetingIds }, status: { in: SEAT_COUNTED_STATUSES } },
          select: { slip_id: true, meeting_id: true, status: true, ticket_code: true, selected_activities: true },
        })
      : [];
    const data = result.data.map((m: any) =>
      limitedMeetingIds.includes(m.meeting_id)
        ? withSeatUsage(m, summarizeSeatUsage(seatSlips.filter((s) => s.meeting_id === m.meeting_id), m.activities))
        : m
    );

    return NextResponse.json({
      success: true,
      data,
      pagination: result.pagination,
    }, { status: 200 });
  } catch (err: unknown) {
    console.error('API /api/meetings GET error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการประชุม',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meetings
 * สร้างการประชุมใหม่
 * Body: CreateMeetingInput
 */
export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body: CreateMeetingInput = await req.json();

    // Basic validation
    if (!body.meeting_name || !body.meeting_date) {
      return NextResponse.json(
        {
          success: false,
          error: 'กรุณากรอกข้อมูลที่จำเป็น: ชื่อการประชุม (meeting_name) และวันที่จัดงาน (meeting_date)',
        },
        { status: 400 }
      );
    }

    const meeting = await createMeeting(body);

    return NextResponse.json(
      {
        success: true,
        data: meeting,
        message: `สร้างการประชุม "${meeting.meeting_name}" สำเร็จ (รหัส: ${meeting.meeting_id})`,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('API /api/meetings POST error:', err);

    // Check for duplicate meeting_id
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return NextResponse.json(
        {
          success: false,
          error: 'รหัสการประชุมนี้ถูกใช้แล้ว กรุณาลองใหม่อีกครั้ง',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการสร้างการประชุม',
      },
      { status: 500 }
    );
  }
}
