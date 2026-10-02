import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import {
  applyAttendanceFormat,
  attendeeFormatOf,
  isGroupFormatPayload,
  type AttendanceFormat,
} from '@/lib/services/attendanceFormatService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function parseActivities(raw: any): any {
  if (typeof raw !== 'string') return raw || null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * POST /api/admin/slips/format
 * ผู้ดูแลระบบแก้ไขรูปแบบการเข้าร่วม (ออนไซต์ / ออนไลน์) ของรายการลงทะเบียนโดยตรง
 * - รายบุคคล: ปรับค่าระดับบนสุดของ selected_activities ที่ระบบใช้อ่านรูปแบบ
 * - กลุ่ม: ระบุ attendeeIndex เพื่อปรับเฉพาะผู้เข้าร่วมคนนั้น
 * ไม่คิดค่าธรรมเนียมและไม่สร้างคำขอเปลี่ยนรูปแบบ (ต่างจากเมนูที่ผู้ลงทะเบียนแจ้งขอเอง)
 */
export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const slipId = String(body.slipId || '').trim();
    const format = body.format as AttendanceFormat;
    const hasAttendeeIndex = body.attendeeIndex !== undefined && body.attendeeIndex !== null;
    const attendeeIndex = Number(body.attendeeIndex);

    if (!slipId || (format !== 'onsite' && format !== 'online')) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุรายการและรูปแบบการเข้าร่วม' },
        { status: 400 }
      );
    }

    const slip = await prisma.payment_slips.findUnique({ where: { slip_id: slipId } });
    if (!slip) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการลงทะเบียน' }, { status: 404 });
    }
    if (slip.status !== 'pending' && slip.status !== 'approved') {
      return NextResponse.json(
        { success: false, error: 'แก้ไขรูปแบบได้เฉพาะรายการที่รอตรวจสอบหรืออนุมัติสิทธิ์แล้ว' },
        { status: 400 }
      );
    }

    const parsed = parseActivities(slip.selected_activities);
    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json(
        { success: false, error: 'รายการนี้ไม่มีข้อมูลการลงทะเบียนประชุมให้แก้ไข' },
        { status: 400 }
      );
    }
    if (!Array.isArray(parsed)) {
      if (parsed.isFormatChange || parsed.type === 'format_change') {
        return NextResponse.json(
          { success: false, error: 'รายการนี้เป็นคำขอเปลี่ยนรูปแบบ กรุณาอนุมัติหรือปฏิเสธคำขอแทน' },
          { status: 400 }
        );
      }
      const isMembershipOnly =
        parsed.type === 'membership_group_registration' ||
        Array.isArray(parsed.applicants) ||
        (parsed.type === 'membership_registration' && !parsed.memberPayload?.attendanceType);
      if (isMembershipOnly) {
        return NextResponse.json(
          { success: false, error: 'รายการสมัครสมาชิกไม่มีรูปแบบการเข้าร่วมให้แก้ไข' },
          { status: 400 }
        );
      }
    }

    const meeting = slip.meeting_id
      ? await prisma.meetings.findUnique({ where: { meeting_id: slip.meeting_id }, select: { activities: true } })
      : null;
    const meetingActivities = Array.isArray(meeting?.activities) ? (meeting!.activities as any[]) : [];

    let previousFormat: string | null = null;

    if (Array.isArray(parsed)) {
      previousFormat = parsed.some((a: any) => a?.format === 'online') ? 'online' : 'onsite';
    } else if (isGroupFormatPayload(parsed)) {
      if (!hasAttendeeIndex || !Number.isInteger(attendeeIndex) || attendeeIndex < 0 || attendeeIndex >= parsed.attendees.length) {
        return NextResponse.json(
          { success: false, error: 'กรุณาระบุผู้เข้าร่วมในกลุ่มที่ต้องการแก้ไข' },
          { status: 400 }
        );
      }
      previousFormat = attendeeFormatOf(parsed.attendees[attendeeIndex]);
    } else {
      previousFormat = parsed.memberPayload?.attendanceType || parsed.attendanceType || parsed.format || null;
    }
    const updatedActivities = applyAttendanceFormat(
      parsed,
      format,
      meetingActivities,
      isGroupFormatPayload(parsed) ? attendeeIndex : null
    );

    await prisma.payment_slips.update({
      where: { id: slip.id },
      data: { selected_activities: updatedActivities },
    });

    console.info(
      `[AdminChangeFormat] admin="${session.username}" slip="${slipId}"` +
        `${hasAttendeeIndex ? ` attendee=${attendeeIndex}` : ''} ${previousFormat || 'unknown'} -> ${format}`
    );

    return NextResponse.json({
      success: true,
      data: {
        slipId: slip.slip_id,
        format,
        previousFormat,
        attendeeIndex: hasAttendeeIndex ? attendeeIndex : null,
      },
    });
  } catch (error) {
    console.error('API /api/admin/slips/format POST error:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถแก้ไขรูปแบบการเข้าร่วมได้ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
