import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/coupons/usages/revoke - คืนสิทธิ์โควตาคูปองและยกเลิกการใช้สิทธิ์
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usageId, cancelAttendance = true, reason } = body;

    if (!usageId) {
      return NextResponse.json(
        { success: false, error: 'Usage ID is required' },
        { status: 400 }
      );
    }

    const numericUsageId = BigInt(usageId);

    // 1. Find coupon usage record
    const usage = await (prisma as any).coupon_usages.findUnique({
      where: { id: numericUsageId },
      include: {
        coupon: true,
      },
    });

    if (!usage) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลการใช้งานคูปองนี้' },
        { status: 404 }
      );
    }

    const couponId = usage.coupon_id;
    const meetingId = usage.meeting_id;
    const memberNo = usage.member_no;
    const attendeeEmail = usage.attendee_email;
    const ticketCode = usage.ticket_code;

    // 2. Decrement coupon used_count (not below 0)
    await (prisma as any).coupons.update({
      where: { id: couponId },
      data: {
        used_count: {
          decrement: usage.coupon.used_count > 0 ? 1 : 0,
        },
      },
    });

    // 3. Delete usage record from coupon_usages
    await (prisma as any).coupon_usages.delete({
      where: { id: numericUsageId },
    });

    // 4. Optionally cancel attendance record if requested
    if (cancelAttendance) {
      if (memberNo) {
        await prisma.$executeRaw`
          UPDATE meeting_attendances
          SET attendance_status = 'Cancelled'
          WHERE meeting_id = ${meetingId} AND member_no = ${memberNo}
        `;
      } else if (attendeeEmail) {
        await prisma.$executeRaw`
          UPDATE meeting_attendances
          SET attendance_status = 'Cancelled'
          WHERE meeting_id = ${meetingId} AND LOWER(attendee_email) = ${attendeeEmail.toLowerCase()}
        `;
      }

      // Update payment_slips if any
      if (ticketCode) {
        await prisma.$executeRaw`
          UPDATE payment_slips
          SET status = 'rejected', rejection_reason = ${reason || 'ผู้ดูแลระบบยกเลิกสิทธิ์คูปอง'}
          WHERE meeting_id = ${meetingId} AND ticket_code = ${ticketCode}
        `;
      }
    }

    return NextResponse.json({
      success: true,
      message: `คืนสิทธิ์โควตาคูปอง "${usage.coupon.code}" เรียบร้อยแล้ว (โควตากลับมาเพิ่มขึ้น 1 สิทธิ์)`,
      data: {
        couponId,
        couponCode: usage.coupon.code,
        revokedAttendee: usage.attendee_name,
      },
    });
  } catch (error: any) {
    console.error('Error revoking coupon usage:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke coupon quota', details: error.message },
      { status: 500 }
    );
  }
}
