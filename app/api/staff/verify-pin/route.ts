import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();

    if (!pin || typeof pin !== 'string' || pin.trim().length !== 6) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกรหัสผ่านเจ้าหน้าที่ 6 หลัก' },
        { status: 400 }
      );
    }

    const cleanPin = pin.trim();

    // 1. Search for active meeting matching this staff_code in database
    // Prioritize ongoing or upcoming meetings first, then any latest
    let matchedMeeting = await prisma.meetings.findFirst({
      where: {
        staff_code: cleanPin,
        status: { in: ['ongoing', 'upcoming'] },
      },
      orderBy: [
        { meeting_date: 'desc' },
      ],
      select: {
        meeting_id: true,
        meeting_name: true,
        meeting_date: true,
        meeting_time: true,
        location: true,
        meeting_type: true,
        staff_code: true,
        status: true,
        max_seats: true,
      },
    });

    // Fallback: search any meeting with this staff_code (completed ones)
    if (!matchedMeeting) {
      matchedMeeting = await prisma.meetings.findFirst({
        where: {
          staff_code: cleanPin,
        },
        orderBy: [
          { meeting_date: 'desc' },
        ],
        select: {
          meeting_id: true,
          meeting_name: true,
          meeting_date: true,
          meeting_time: true,
          location: true,
          meeting_type: true,
          staff_code: true,
          status: true,
          max_seats: true,
        },
      });
    }

    // 2. No meeting found with this staff_code → reject
    if (!matchedMeeting) {
      return NextResponse.json(
        { success: false, error: 'รหัสเจ้าหน้าที่ไม่ถูกต้อง หรือไม่มีการประชุมที่ใช้รหัสนี้' },
        { status: 401 }
      );
    }

    // 3. Get total and checked-in attendee counts for this meeting
    const [totalCount, checkedInCount] = await Promise.all([
      prisma.meeting_attendances.count({
        where: { meeting_id: matchedMeeting.meeting_id },
      }),
      prisma.meeting_attendances.count({
        where: {
          meeting_id: matchedMeeting.meeting_id,
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
        id: matchedMeeting.meeting_id,
        name: matchedMeeting.meeting_name,
        date: matchedMeeting.meeting_date,
        time: matchedMeeting.meeting_time,
        location: matchedMeeting.location,
        type: matchedMeeting.meeting_type,
        status: matchedMeeting.status,
      },
      stats: {
        total: totalCount,
        checkedIn: checkedInCount,
      },
    });
  } catch (err: unknown) {
    console.error('Staff PIN Verification Error:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบในการตรวจสอบรหัส' },
      { status: 500 }
    );
  }
}
