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

    // 1. Search for active meeting matching this staff_code
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

    // 2. Fallback check master PIN from .env (if configured)
    const masterStaffPin = process.env.STAFF_PIN;
    const isMasterPin = masterStaffPin && cleanPin === masterStaffPin;

    if (!matchedMeeting && !isMasterPin) {
      return NextResponse.json(
        { success: false, error: 'รหัสเจ้าหน้าที่ไม่ถูกต้อง หรือไม่มีการประชุมที่ใช้รหัสนี้' },
        { status: 401 }
      );
    }

    // If master PIN matched but no specific meeting has that staff_code, select the latest meeting
    let targetMeeting = matchedMeeting;
    if (!targetMeeting && isMasterPin) {
      targetMeeting = await prisma.meetings.findFirst({
        where: {
          status: { in: ['ongoing', 'upcoming'] },
        },
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
          max_seats: true,
        },
      });

      if (!targetMeeting) {
        targetMeeting = await prisma.meetings.findFirst({
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
            max_seats: true,
          },
        });
      }
    }

    // 3. Get total and checked-in attendee counts for this meeting
    let stats = { total: 0, checkedIn: 0 };
    if (targetMeeting?.meeting_id) {
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

      stats = { total: totalCount, checkedIn: checkedInCount };
    }

    return NextResponse.json({
      success: true,
      meeting: targetMeeting ? {
        id: targetMeeting.meeting_id,
        name: targetMeeting.meeting_name,
        date: targetMeeting.meeting_date,
        time: targetMeeting.meeting_time,
        location: targetMeeting.location,
        type: targetMeeting.meeting_type,
        status: targetMeeting.status,
      } : null,
      stats,
    });
  } catch (err: unknown) {
    console.error('Staff PIN Verification Error:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบในการตรวจสอบรหัส' },
      { status: 500 }
    );
  }
}
