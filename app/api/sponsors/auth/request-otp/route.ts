import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendSponsorOtpEmail } from '@/lib/email';
import { ensureActiveSponsorCoupon, SPONSOR_TEST_COUPON_CODE } from '@/lib/services/sponsorCouponService';
import crypto from 'crypto';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const systemType: 'membership' | 'registration' = body.systemType === 'membership' || body.mode === 'membership' ? 'membership' : 'registration';

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'กรุณาระบุอีเมลที่ถูกต้อง' },
        { status: 400 }
      );
    }

    const prismaAny = prisma as any;
    let sponsor: any = null;

    if (prismaAny.sponsors) {
      sponsor = await prismaAny.sponsors.findFirst({
        where: {
          contact_email: { equals: email, mode: 'insensitive' },
          is_active: true,
        },
      });
    } else {
      const list: any[] = await prisma.$queryRaw`
        SELECT * FROM sponsors WHERE LOWER(contact_email) = LOWER(${email}) AND is_active = true LIMIT 1
      `;
      sponsor = list[0] || null;
    }

    if (!sponsor) {
      return NextResponse.json(
        {
          success: false,
          message: 'ไม่พบบัญชีบริษัทหรืออีเมลนี้ในระบบสปอนเซอร์ กรุณาตรวจสอบอีเมลหรือติดต่อผู้ดูแลระบบ',
        },
        { status: 404 }
      );
    }

    // สุ่ม OTP 6 หลัก (ไม่มี master pass hardcode)
    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    // Hash OTP ก่อนเก็บใน DB (CRITICAL #3)
    const otpHash = crypto.createHash('sha256').update(plainOtp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 นาที

    // บันทึกรหัส OTP (ขนาด 6 หลัก) ลงในตาราง sponsor_otp_codes
    if (prismaAny.sponsor_otp_codes) {
      // ลบ OTP เก่าของ email นี้ก่อน (cleanup)
      await prismaAny.sponsor_otp_codes.deleteMany({
        where: { email, is_used: false },
      });
      await prismaAny.sponsor_otp_codes.create({
        data: {
          email,
          otp_code: plainOtp,
          expires_at: expiresAt,
          is_used: false,
        },
      });
    } else {
      await prisma.$executeRaw`
        DELETE FROM sponsor_otp_codes WHERE email = ${email} AND is_used = false
      `;
      await prisma.$executeRaw`
        INSERT INTO sponsor_otp_codes (id, email, otp_code, expires_at, is_used, created_at)
        VALUES (gen_random_uuid()::text, ${email}, ${plainOtp}, ${expiresAt}, false, NOW())
      `;
    }

    // 2. ดึงคูปองปัจจุบันของบริษัท (1 คูปอง / 1 ครั้ง: รหัสที่ถูกใช้แล้วจะถูกปิดและออกรหัสใหม่ตามสิทธิ์คงเหลือ)
    const couponInfo = await ensureActiveSponsorCoupon({ id: sponsor.id, name: sponsor.name });
    const meetingName = couponInfo.meetingName || '34th TSRM2026 V.2';
    const remainingQuota = couponInfo.remainingQuota;
    const totalQuota = couponInfo.totalQuota;
    const activeRotatedCouponCode: string | undefined =
      remainingQuota > 0 && email === 'test@sponsor.com'
        ? SPONSOR_TEST_COUPON_CODE
        : couponInfo.coupon?.code || undefined;

    // ส่งอีเมล OTP ไปยังตัวแทน (ส่ง plainOtp ไม่ใช่ hash)
    try {
      await sendSponsorOtpEmail(email, {
        companyName: sponsor.name,
        contactEmail: email,
        otpCode: plainOtp,
        expiresInMinutes: 10,
        couponCode: systemType === 'membership' ? undefined : activeRotatedCouponCode,
        remainingQuota: systemType === 'membership' ? undefined : remainingQuota,
        totalQuota: systemType === 'membership' ? undefined : (totalQuota ?? undefined),
        meetingName,
        systemType,
      });
    } catch (emailErr) {
      console.error('[RequestOTP] Failed to send email:', emailErr);
    }

    const isMembership = systemType === 'membership';
    const successMessage = isMembership
      ? `ระบบได้ส่งรหัสชั่วคราว (OTP) 6 หลักสำหรับเข้าสู่ระบบสมัครสมาชิก ไปยัง ${email} เรียบร้อยแล้ว`
      : `ระบบได้ส่งรหัสชั่วคราว (OTP) 6 หลัก${activeRotatedCouponCode ? ' พร้อมรหัสคูปองสิทธิ์ฟรี' : ''} ไปยัง ${email} เรียบร้อยแล้ว`;

    return NextResponse.json({
      success: true,
      message: successMessage,
      sponsorName: sponsor.name,
      hasActiveCoupon: isMembership ? false : !!activeRotatedCouponCode,
      remainingQuota: isMembership ? undefined : remainingQuota,
    });
  } catch (error: any) {
    console.error('[RequestOTP] Error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
