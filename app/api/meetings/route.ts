import { NextRequest, NextResponse } from 'next/server';
import {
  createMeeting,
  getMeetings,
  CreateMeetingInput,
} from '@/lib/services/meetingService';

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
    if (action === 'next_id') {
      const { getNextMeetingId } = await import('@/lib/services/meetingService');
      const nextId = await getNextMeetingId();
      return NextResponse.json({ success: true, nextMeetingId: nextId });
    }

    if (action === 'latest' || action === 'active') {
      const { getLatestActiveMeeting } = await import('@/lib/services/meetingService');
      const meeting = await getLatestActiveMeeting();
      return NextResponse.json({ success: true, data: meeting });
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

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    }, { status: 200 });
  } catch (err: unknown) {
    console.error('API /api/meetings GET error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูลการประชุม',
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
        error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างการประชุม',
      },
      { status: 500 }
    );
  }
}
