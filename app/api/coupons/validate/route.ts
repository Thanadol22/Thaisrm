import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/coupons/validate - ตรวจสอบความถูกต้องและคำนวณสิทธิ์คูปอง
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      meetingId,
      memberNo,
      email,
      totalOriginalAmount = 0,
    } = body;

    if (!code || !code.trim()) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกรหัสคูปอง' },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Find coupon
    const coupon = await (prisma as any).coupons.findUnique({
      where: { code: cleanCode },
      include: {
        meetings: {
          select: {
            meeting_id: true,
            meeting_name: true,
          },
        },
      },
    });

    if (!coupon) {
      return NextResponse.json(
        {
          success: false,
          error: `ไม่พบรหัสคูปอง "${cleanCode}" ในระบบ กรุณาตรวจสอบรหัสอีกครั้ง`,
        },
        { status: 404 }
      );
    }

    // 2. Check if active
    if (!coupon.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: `คูปอง "${cleanCode}" ถูกระงับการใช้งานชั่วคราว`,
        },
        { status: 400 }
      );
    }

    // 3. Check meeting match
    if (meetingId && coupon.meeting_id !== meetingId) {
      return NextResponse.json(
        {
          success: false,
          error: `คูปองนี้ใช้ได้เฉพาะกับงานประชุม "${coupon.meetings?.meeting_name || coupon.meeting_id}" เท่านั้น`,
        },
        { status: 400 }
      );
    }

    // 4. Check expiration date
    if (coupon.expire_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expDate = new Date(coupon.expire_date);
      expDate.setHours(23, 59, 59, 999);

      if (today > expDate) {
        return NextResponse.json(
          {
            success: false,
            error: `คูปอง "${cleanCode}" หมดอายุการใช้งานแล้ว (หมดอายุเมื่อ ${expDate.toLocaleDateString('th-TH')})`,
          },
          { status: 400 }
        );
      }
    }

    // 5. Check quota (used_count < max_uses)
    if (coupon.used_count >= coupon.max_uses) {
      return NextResponse.json(
        {
          success: false,
          error: `คูปอง "${cleanCode}" มีผู้ใช้สิทธิ์ครบตามจำนวนโควตาที่กำหนดแล้ว (${coupon.used_count}/${coupon.max_uses} สิทธิ์)`,
        },
        { status: 400 }
      );
    }

    // 6. Check duplicate usage by same member or email
    const cleanMemberNo = memberNo ? memberNo.trim() : null;
    const cleanEmail = email ? email.trim().toLowerCase() : null;

    if (cleanMemberNo || cleanEmail) {
      const usageCheckConditions: any[] = [];
      if (cleanMemberNo) {
        usageCheckConditions.push({ member_no: cleanMemberNo });
      }
      if (cleanEmail) {
        usageCheckConditions.push({ attendee_email: { equals: cleanEmail, mode: 'insensitive' } });
      }

      const existingUsage = await (prisma as any).coupon_usages.findFirst({
        where: {
          coupon_id: coupon.id,
          OR: usageCheckConditions,
        },
      });

      if (existingUsage) {
        return NextResponse.json(
          {
            success: false,
            error: `ท่านได้ใช้สิทธิ์คูปอง "${cleanCode}" ในการลงทะเบียนรอบนี้ไปแล้ว ไม่สามารถใช้ซ้ำได้`,
          },
          { status: 400 }
        );
      }
    }

    // 7. Calculate Discount Amount
    const originalAmount = Number(totalOriginalAmount) || 0;
    let discountAmount = 0;
    let isFullFree = false;

    if (coupon.discount_type === 'free') {
      discountAmount = originalAmount;
      isFullFree = true;
    } else if (coupon.discount_type === 'fixed') {
      discountAmount = Math.min(originalAmount, coupon.discount_value);
      isFullFree = discountAmount >= originalAmount;
    } else if (coupon.discount_type === 'percent') {
      const pct = Math.min(100, Math.max(0, coupon.discount_value));
      discountAmount = Math.round((originalAmount * pct) / 100);
      isFullFree = pct === 100 || discountAmount >= originalAmount;
    }

    const finalAmount = Math.max(0, originalAmount - discountAmount);

    return NextResponse.json({
      success: true,
      valid: true,
      message: `ใช้คูปองสำเร็จ! ได้รับสิทธิ์สนับสนุนจาก ${coupon.company_name}`,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        company_name: coupon.company_name,
        meeting_id: coupon.meeting_id,
        meeting_name: coupon.meetings?.meeting_name,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        applicable_type: coupon.applicable_type,
        max_uses: coupon.max_uses,
        used_count: coupon.used_count,
        remaining_uses: coupon.max_uses - coupon.used_count,
      },
      calculation: {
        originalAmount,
        discountAmount,
        finalAmount,
        isFullFree,
      },
    });
  } catch (error: any) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate coupon', details: error.message },
      { status: 500 }
    );
  }
}
