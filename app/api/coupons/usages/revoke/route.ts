import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';

// POST /api/coupons/usages/revoke - คืนสิทธิ์โควตาคูปองและยกเลิกการใช้สิทธิ์
export async function POST(request: NextRequest) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { usageId, cancelAttendance = true, reason } = body;

    if (!usageId) {
      return NextResponse.json(
        { success: false, error: 'Usage ID is required' },
        { status: 400 }
      );
    }

    let usage: any = null;
    let isSgm = false;
    let sgmId: any = null;

    if (String(usageId).startsWith('sgm-')) {
      isSgm = true;
      const memNo = String(usageId).replace('sgm-', '');
      const sgm = await (prisma as any).sponsor_group_members.findFirst({
        where: { member_no: memNo },
        include: { sponsor: true },
      });
      if (sgm) {
        sgmId = sgm.id;
        const linkedCoupon = sgm.coupon_code
          ? await (prisma as any).coupons.findFirst({ where: { code: sgm.coupon_code } })
          : null;
        usage = {
          id: sgm.id,
          coupon_id: linkedCoupon?.id || null,
          coupon: linkedCoupon,
          meeting_id: sgm.meeting_id,
          member_no: sgm.member_no,
          attendee_email: sgm.attendee_email,
          attendee_name: sgm.attendee_name,
          ticket_code: sgm.ticket_code,
        };
      }
    } else {
      try {
        usage = await (prisma as any).coupon_usages.findUnique({
          where: { id: BigInt(usageId) },
          include: {
            coupon: true,
          },
        });
      } catch (e) {
        console.warn('BigInt conversion error for usageId:', usageId);
      }
    }

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
    if (couponId) {
      await (prisma as any).coupons.update({
        where: { id: couponId },
        data: {
          used_count: {
            decrement: usage.coupon && usage.coupon.used_count > 0 ? 1 : 0,
          },
        },
      });
    }

    // 3. Delete usage record from coupon_usages if numeric id
    if (!isSgm && usage.id) {
      await (prisma as any).coupon_usages.delete({
        where: { id: BigInt(usage.id) },
      });
    }

    // 4. Update sponsor_group_members if exists
    if (memberNo && meetingId) {
      try {
        await prisma.$executeRaw`
          DELETE FROM sponsor_group_members
          WHERE meeting_id = ${meetingId} AND member_no = ${memberNo}
        `;
      } catch (e) {
        console.warn('Error deleting SGM record:', e);
      }
    }

    // 5. Optionally cancel attendance record if requested
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

    const couponCodeStr = usage.coupon?.code || usage.coupon_code || 'คูปอง';

    return NextResponse.json({
      success: true,
      message: `คืนสิทธิ์โควตาคูปอง "${couponCodeStr}" เรียบร้อยแล้ว (โควตากลับมาเพิ่มขึ้น 1 สิทธิ์)`,
      data: {
        couponId,
        couponCode: couponCodeStr,
        revokedAttendee: usage.attendee_name,
      },
    });
  } catch (error: any) {
    console.error('Error revoking coupon usage:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถยกเลิกและคืนสิทธิ์คูปองได้' },
      { status: 500 }
    );
  }
}
