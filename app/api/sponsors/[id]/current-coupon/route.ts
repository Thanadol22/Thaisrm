import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureActiveSponsorCoupon } from '@/lib/services/sponsorCouponService';

// GET /api/sponsors/[id]/current-coupon - คูปองที่ใช้งานได้ปัจจุบันของบริษัท (ออกรหัสใหม่หากรหัสเดิมถูกใช้แล้ว)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sponsor = await prisma.sponsors.findUnique({
      where: { id },
      select: { id: true, name: true, is_active: true },
    });

    if (!sponsor || !sponsor.is_active) {
      return NextResponse.json({ success: false, message: 'ไม่พบบริษัทหรือบริษัทถูกปิดใช้งาน' }, { status: 404 });
    }

    const { coupon, remainingQuota, totalQuota, meetingName } = await ensureActiveSponsorCoupon(sponsor);

    return NextResponse.json({
      success: true,
      coupon: coupon
        ? {
            code: coupon.code,
            meetingId: coupon.meeting_id,
            discountType: coupon.discount_type,
            discountValue: coupon.discount_value,
          }
        : null,
      remainingQuota,
      totalQuota,
      meetingName,
    });
  } catch (error) {
    console.error('[SponsorCurrentCoupon] Error:', error);
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงคูปองของบริษัท' }, { status: 500 });
  }
}
