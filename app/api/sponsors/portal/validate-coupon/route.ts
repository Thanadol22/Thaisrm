import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = (body.code || '').trim().toUpperCase();
    const meetingId = (body.meetingId || '').trim();
    const basePrice = typeof body.basePrice === 'number' ? body.basePrice : 0;

    if (!code) {
      return NextResponse.json(
        { success: false, valid: false, message: 'กรุณาระบุรหัสคูปอง' },
        { status: 400 }
      );
    }

    // 1. ค้นหาคูปอง
    const coupon = await (prisma as any).coupons.findFirst({
      where: {
        code: { equals: code, mode: 'insensitive' },
      },
    });

    if (!coupon) {
      return NextResponse.json({
        success: false,
        valid: false,
        message: `ไม่พบรหัสคูปอง "${code}" ในระบบ`,
      });
    }

    // 2. ตรวจสอบสถานะการเปิดใช้งาน
    if (!coupon.is_active) {
      return NextResponse.json({
        success: false,
        valid: false,
        message: `รหัสคูปอง "${code}" ถูกปิดการใช้งานชั่วคราว`,
      });
    }

    // 3. ตรวจสอบวันหมดอายุ
    if (coupon.expire_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expDate = new Date(coupon.expire_date);
      if (expDate < today) {
        return NextResponse.json({
          success: false,
          valid: false,
          message: `รหัสคูปอง "${code}" หมดอายุการใช้งานแล้ว (เมื่อ ${expDate.toLocaleDateString('th-TH')})`,
        });
      }
    }

    // 4. ตรวจสอบโควต้าการใช้งานคูปอง
    const maxUses = coupon.max_uses || 1;
    const usedCount = coupon.used_count || 0;
    if (usedCount >= maxUses) {
      return NextResponse.json({
        success: false,
        valid: false,
        message: `รหัสคูปอง "${code}" ถูกใช้งานครบโควต้าแล้ว (${usedCount}/${maxUses})`,
      });
    }

    // 5. ตรวจสอบว่าคูปองตรงกับ meeting_id หรือไม่ (ถ้าคูปองระบุ meeting_id ไว้)
    if (meetingId && coupon.meeting_id && coupon.meeting_id !== meetingId) {
      return NextResponse.json({
        success: false,
        valid: false,
        message: `รหัสคูปองนี้ใช้ได้เฉพาะกับงานประชุมที่กำหนดไว้เท่านั้น`,
      });
    }

    // 6. คำนวณส่วนลด
    let discountAmount = 0;
    let netPrice = basePrice;
    let discountDescription = '';

    const discountType = coupon.discount_type || 'free';
    const discountValue = coupon.discount_value || 0;

    if (discountType === 'free') {
      discountAmount = basePrice > 0 ? basePrice : 0;
      netPrice = 0;
      discountDescription = 'ฟรีค่าลงทะเบียนหลัก (Main Program) 100%';
    } else if (discountType === 'fixed') {
      discountAmount = Math.min(basePrice, discountValue);
      netPrice = Math.max(0, basePrice - discountValue);
      discountDescription = `ส่วนลด ${discountValue.toLocaleString()} บาท`;
    } else if (discountType === 'percent') {
      discountAmount = Math.round((basePrice * discountValue) / 100);
      netPrice = Math.max(0, basePrice - discountAmount);
      discountDescription = `ส่วนลด ${discountValue}%`;
    }

    return NextResponse.json({
      success: true,
      valid: true,
      message: 'ใช้รหัสคูปองสำเร็จ',
      coupon: {
        id: coupon.id,
        code: coupon.code,
        company_name: coupon.company_name,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: discountAmount,
        net_price: netPrice,
        discount_description: discountDescription,
        remaining_uses: maxUses - usedCount,
        applicable_type: coupon.applicable_type,
      },
    });
  } catch (error: any) {
    console.error('[ValidateCoupon] Error:', error);
    return NextResponse.json(
      { success: false, valid: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบคูปอง' },
      { status: 500 }
    );
  }
}
