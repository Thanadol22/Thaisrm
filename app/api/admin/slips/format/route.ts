import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type AttendanceFormat = 'onsite' | 'online';

function parseActivities(raw: any): any {
  if (typeof raw !== 'string') return raw || null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isGroupPayload(parsed: any): boolean {
  return Boolean(
    parsed &&
      !Array.isArray(parsed) &&
      (parsed.isGroup || parsed.type === 'conference_group_registration') &&
      Array.isArray(parsed.attendees)
  );
}

// ผู้เข้าร่วมในกลุ่ม: เก็บรูปแบบไว้หลายชื่อฟิลด์ตามรุ่นของฟอร์ม จึงปรับทุกฟิลด์ที่มีอยู่ให้ตรงกัน
function withAttendeeFormat(att: any, format: AttendanceFormat): any {
  if (!att || typeof att !== 'object') return att;
  return {
    ...att,
    attendanceType: format,
    ...(att.selectedFormat !== undefined ? { selectedFormat: format } : {}),
    ...(att.format !== undefined ? { format } : {}),
  };
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

    let updatedActivities: any;
    let previousFormat: string | null = null;

    if (Array.isArray(parsed)) {
      // รูปแบบเก่า: รายการกิจกรรมแบบอาร์เรย์ ปรับที่โปรแกรมหลัก (ถ้าไม่มีโปรแกรมหลักให้ปรับทุกรายการ)
      const hasMain = parsed.some((a: any) => a?.type !== 'workshop');
      previousFormat = parsed.some((a: any) => a?.format === 'online') ? 'online' : 'onsite';
      updatedActivities = parsed.map((a: any) =>
        a && typeof a === 'object' && (!hasMain || a.type !== 'workshop') ? { ...a, format } : a
      );
    } else if (isGroupPayload(parsed)) {
      if (!hasAttendeeIndex || !Number.isInteger(attendeeIndex) || attendeeIndex < 0 || attendeeIndex >= parsed.attendees.length) {
        return NextResponse.json(
          { success: false, error: 'กรุณาระบุผู้เข้าร่วมในกลุ่มที่ต้องการแก้ไข' },
          { status: 400 }
        );
      }
      const target = parsed.attendees[attendeeIndex];
      previousFormat = target?.selectedFormat || target?.attendanceType || target?.format || null;
      updatedActivities = {
        ...parsed,
        attendees: parsed.attendees.map((att: any, idx: number) =>
          idx === attendeeIndex ? withAttendeeFormat(att, format) : att
        ),
      };
    } else {
      previousFormat = parsed.memberPayload?.attendanceType || parsed.attendanceType || parsed.format || null;
      updatedActivities = {
        ...parsed,
        attendanceType: format,
        format,
        ...(Array.isArray(parsed.attendees)
          ? { attendees: parsed.attendees.map((att: any) => withAttendeeFormat(att, format)) }
          : {}),
        ...(parsed.memberPayload && typeof parsed.memberPayload === 'object'
          ? { memberPayload: { ...parsed.memberPayload, attendanceType: format } }
          : {}),
      };
    }

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
