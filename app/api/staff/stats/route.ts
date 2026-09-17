import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');
    const staffPin = searchParams.get('pin');

    let targetMeeting: any = null;

    if (meetingId && meetingId !== 'all') {
      targetMeeting = await prisma.meetings.findUnique({
        where: { meeting_id: meetingId },
        select: {
          meeting_id: true,
          meeting_name: true,
          meeting_date: true,
          meeting_time: true,
          location: true,
          meeting_type: true,
          staff_code: true,
          status: true,
        },
      });
    } else if (staffPin) {
      targetMeeting = await prisma.meetings.findFirst({
        where: { staff_code: staffPin.trim() },
        orderBy: { meeting_date: 'desc' },
        select: {
          meeting_id: true,
          meeting_name: true,
          meeting_date: true,
          meeting_time: true,
          location: true,
          meeting_type: true,
          staff_code: true,
          status: true,
        },
      });
    }

    // Fallback to active meeting
    if (!targetMeeting) {
      targetMeeting = await prisma.meetings.findFirst({
        where: { status: { in: ['ongoing', 'upcoming'] } },
        orderBy: { meeting_date: 'desc' },
        select: {
          meeting_id: true,
          meeting_name: true,
          meeting_date: true,
          meeting_time: true,
          location: true,
          meeting_type: true,
          staff_code: true,
          status: true,
        },
      });
    }

    if (!targetMeeting) {
      return NextResponse.json({
        success: true,
        meeting: null,
        stats: { total: 0, checkedIn: 0 },
      });
    }

    const [totalCount, checkedInCount] = await Promise.all([
      prisma.meeting_attendances.count({
        where: { meeting_id: targetMeeting.meeting_id },
      }),
      prisma.meeting_attendances.count({
        where: {
          meeting_id: targetMeeting.meeting_id,
          OR: [
            { checkin_time: { not: null } },
            { attendance_status: 'Attended' },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      meeting: {
        id: targetMeeting.meeting_id,
        name: targetMeeting.meeting_name,
        date: targetMeeting.meeting_date,
        time: targetMeeting.meeting_time,
        location: targetMeeting.location,
        type: targetMeeting.meeting_type,
        status: targetMeeting.status,
      },
      stats: {
        total: totalCount,
        checkedIn: checkedInCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching staff stats:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ' },
      { status: 500 }
    );
  }
}
