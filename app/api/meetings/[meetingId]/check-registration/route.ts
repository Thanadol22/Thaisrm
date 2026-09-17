import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const { searchParams } = new URL(request.url);
    const memberNo = searchParams.get('memberNo')?.trim();
    const email = searchParams.get('email')?.trim();

    if (!meetingId) {
      return NextResponse.json(
        { success: false, error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    if (!memberNo && !email) {
      return NextResponse.json(
        { success: false, error: 'Either memberNo or email is required' },
        { status: 400 }
      );
    }

    // 1. ตรวจสอบกรณีเป็นสมาชิก (Member)
    if (memberNo) {
      // 1.1 ตรวจสอบใน payment_slips (pending หรือ approved)
      const slips = await prisma.$queryRaw<Array<{ slip_id: string; status: string; ticket_code: string | null }>>`
        SELECT slip_id, status, ticket_code 
        FROM payment_slips 
        WHERE meeting_id = ${meetingId} 
          AND member_no = ${memberNo} 
          AND status IN ('pending', 'approved') 
        LIMIT 1
      `;
      const existingSlip = slips?.[0];

      // 1.2 ตรวจสอบใน meeting_attendances
      const attendances = await prisma.$queryRaw<Array<{ attendance_id: any; attendance_status: string }>>`
        SELECT attendance_id, attendance_status 
        FROM meeting_attendances 
        WHERE meeting_id = ${meetingId} 
          AND member_no = ${memberNo} 
          AND attendance_status NOT IN ('Cancelled', 'Rejected') 
        LIMIT 1
      `;
      const existingAttendance = attendances?.[0];

      if (existingSlip || existingAttendance) {
        const status = existingSlip?.status || existingAttendance?.attendance_status || 'registered';
        const isApproved = status === 'approved' || status === 'Registered' || status === 'Attended';
        
        return NextResponse.json({
          success: true,
          isRegistered: true,
          status: isApproved ? 'approved' : 'pending',
          ticketCode: existingSlip?.ticket_code || null,
          message: isApproved
            ? 'ท่านได้ลงทะเบียนเข้าร่วมงานประชุมนี้เรียบร้อยแล้ว'
            : 'ท่านมีรายการลงทะเบียนเข้าร่วมงานประชุมนี้แล้ว กำลังอยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบการชำระเงิน',
        });
      }
    }

    // 2. ตรวจสอบกรณีบุคคลทั่วไป (Non-Member / Guest)
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      // 2.1 ตรวจสอบใน payment_slips
      const guestSlips = await prisma.$queryRaw<Array<{ slip_id: string; status: string; ticket_code: string | null }>>`
        SELECT slip_id, status, ticket_code 
        FROM payment_slips 
        WHERE meeting_id = ${meetingId} 
          AND is_member = false 
          AND LOWER(guest_email) = ${cleanEmail} 
          AND status IN ('pending', 'approved') 
        LIMIT 1
      `;
      const existingGuestSlip = guestSlips?.[0];

      // 2.2 ตรวจสอบใน meeting_attendances
      const guestAttendances = await prisma.$queryRaw<Array<{ attendance_id: any; attendance_status: string }>>`
        SELECT attendance_id, attendance_status 
        FROM meeting_attendances 
        WHERE meeting_id = ${meetingId} 
          AND LOWER(attendee_email) = ${cleanEmail} 
          AND attendance_status NOT IN ('Cancelled', 'Rejected') 
        LIMIT 1
      `;
      const existingGuestAttendance = guestAttendances?.[0];

      if (existingGuestSlip || existingGuestAttendance) {
        const status = existingGuestSlip?.status || existingGuestAttendance?.attendance_status || 'registered';
        const isApproved = status === 'approved' || status === 'Registered' || status === 'Attended';

        return NextResponse.json({
          success: true,
          isRegistered: true,
          status: isApproved ? 'approved' : 'pending',
          ticketCode: existingGuestSlip?.ticket_code || null,
          message: isApproved
            ? `อีเมลนี้ (${email}) ได้ลงทะเบียนเข้าร่วมงานประชุมนี้เรียบร้อยแล้ว`
            : `อีเมลนี้ (${email}) มีรายการลงทะเบียนแล้ว กำลังอยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบการชำระเงิน`,
        });
      }
    }

    // ยังไม่เคยลงทะเบียน
    return NextResponse.json({
      success: true,
      isRegistered: false,
      message: 'สามารถลงทะเบียนได้',
    });
  } catch (error: any) {
    console.error('Error checking registration status:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะการลงทะเบียน' },
      { status: 500 }
    );
  }
}
