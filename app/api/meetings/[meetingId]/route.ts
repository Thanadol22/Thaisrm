import { NextRequest, NextResponse } from 'next/server';
import {
  getMeetingById,
  updateMeeting,
  deleteMeeting,
  UpdateMeetingInput,
} from '@/lib/services/meetingService';

/**
 * GET /api/meetings/[meetingId]
 * ดึงข้อมูลการประชุมรายการเดียวตาม meeting_id
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const meeting = await getMeetingById(meetingId);

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: `ไม่พบการประชุมรหัส ${meetingId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: meeting }, { status: 200 });
  } catch (err: unknown) {
    console.error('API /api/meetings/[id] GET error:', err);
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
 * PUT /api/meetings/[meetingId]
 * อัปเดตข้อมูลการประชุม
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const body: UpdateMeetingInput = await req.json();

    // Check if meeting exists
    const existing = await getMeetingById(meetingId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `ไม่พบการประชุมรหัส ${meetingId}` },
        { status: 404 }
      );
    }

    const updated = await updateMeeting(meetingId, body);

    return NextResponse.json(
      {
        success: true,
        data: updated,
        message: `อัปเดตการประชุม "${updated.meeting_name}" สำเร็จ`,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error('API /api/meetings/[id] PUT error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลการประชุม',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/meetings/[meetingId]
 * ลบการประชุม (และ attendance records ที่เกี่ยวข้อง)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;

    const existing = await getMeetingById(meetingId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `ไม่พบการประชุมรหัส ${meetingId}` },
        { status: 404 }
      );
    }

    await deleteMeeting(meetingId);

    return NextResponse.json(
      {
        success: true,
        message: `ลบการประชุม "${existing.meeting_name}" สำเร็จ`,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error('API /api/meetings/[id] DELETE error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบการประชุม',
      },
      { status: 500 }
    );
  }
}
