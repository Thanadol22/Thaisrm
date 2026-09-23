import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendSponsorOtpEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'กรุณาระบุอีเมลที่ถูกต้อง' },
        { status: 400 }
      );
    }

    // ค้นหาบริษัทที่มี contact_email ตรงกับที่ระบุ
    const sponsor = await (prisma as any).sponsors.findFirst({
      where: {
        contact_email: { equals: email, mode: 'insensitive' },
        is_active: true,
      },
    });

    if (!sponsor) {
      return NextResponse.json(
        {
          success: false,
          message: 'ไม่พบบัญชีบริษัทหรืออีเมลนี้ในระบบสปอนเซอร์ กรุณาตรวจสอบอีเมลหรือติดต่อผู้ดูแลระบบ',
        },
        { status: 404 }
      );
    }

    // สุ่มรหัส OTP 6 หลัก
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 นาที

    // บันทึกรหัสชั่วคราวลงในตาราง sponsor_otp_codes
    await (prisma as any).sponsor_otp_codes.create({
      data: {
        email,
        otp_code: otpCode,
        expires_at: expiresAt,
        is_used: false,
      },
    });

    // ส่งอีเมลไปยังตัวแทน
    try {
      await sendSponsorOtpEmail(email, {
        companyName: sponsor.name,
        contactEmail: email,
        otpCode,
        expiresInMinutes: 10,
      });
    } catch (emailErr) {
      console.error('[RequestOTP] Failed to send email:', emailErr);
      // ยังคงให้ผ่านได้พร้อม log เพื่อรองรับ offline/dev mode
    }

    return NextResponse.json({
      success: true,
      message: `ระบบได้ส่งรหัสชั่วคราว (OTP) 6 หลักไปยัง ${email} เรียบร้อยแล้ว`,
      sponsorName: sponsor.name,
      // ใน environment development อนุญาตให้แนบ debug code สำหรับทดสอบเร็ว
      devOtp: process.env.NODE_ENV === 'development' ? otpCode : undefined,
    });
  } catch (error: any) {
    console.error('[RequestOTP] Error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
