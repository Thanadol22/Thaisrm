import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMeetingProgramsAndDates, formatBangkokDate } from '@/lib/services/dailyCheckinService';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'Meeting ID required' }, { status: 400 });
    }

    const meeting = await prisma.meetings.findUnique({
      where: { meeting_id: meetingId },
      include: {
        _count: {
          select: {
            meeting_attendances: true,
            daily_checkins: true,
          },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }

    const programs = getMeetingProgramsAndDates(meeting);
    const todayBangkok = formatBangkokDate();

    // Query daily stats for each date
    const dailyStats = await prisma.meeting_daily_checkins.groupBy({
      by: ['checkin_date', 'checkin_status'],
      where: { meeting_id: meetingId },
      _count: { id: true },
    });

    const statsByDate: Record<string, { total: number; attended: number; pending: number }> = {};
    for (const stat of dailyStats) {
      const dStr = formatBangkokDate(stat.checkin_date);
      if (!statsByDate[dStr]) {
        statsByDate[dStr] = { total: 0, attended: 0, pending: 0 };
      }
      const cnt = Number(stat._count.id);
      statsByDate[dStr].total += cnt;
      if (stat.checkin_status === 'attended') {
        statsByDate[dStr].attended += cnt;
      } else {
        statsByDate[dStr].pending += cnt;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        meetingId,
        meetingName: meeting.meeting_name,
        today: todayBangkok,
        programs,
        statsByDate,
      },
    });
  } catch (error: any) {
    console.error('Error fetching meeting daily programs:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
