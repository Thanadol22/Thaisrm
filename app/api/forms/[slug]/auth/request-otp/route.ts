import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { sendSponsorOtpEmail } from '@/lib/email';
import { findAllowedSponsorByEmail, getSpecialFormBySlug, isSpecialFormOpen } from '@/lib/services/specialFormService';

export const dynamic = 'force-dynamic';

// ข้อความเดียวกันทุกกรณีที่ไม่มีสิทธิ์ เพื่อไม่ให้ใช้ตรวจสอบได้ว่าอีเมลใดอยู่ในระบบ
const NOT_ALLOWED = 'อีเมลนี้ไม่มีสิทธิ์เข้าใช้ฟอร์มนี้ กรุณาใช้อีเมลตัวแทนบริษัทที่แจ้งไว้กับสมาคม หรือติดต่อผู้ดูแลระบบ';

/** POST /api/forms/[slug]/auth/request-otp — ส่งรหัสผ่านชั่วคราวให้ตัวแทนบริษัทที่มีสิทธิ์เข้าฟอร์มเฉพาะ */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุอีเมลที่ถูกต้อง' }, { status: 400 });
    }

    const form = await getSpecialFormBySlug(slug);
    if (!form) return NextResponse.json({ success: false, message: 'ไม่พบฟอร์มนี้' }, { status: 404 });
    if (!isSpecialFormOpen(form)) {
      return NextResponse.json({ success: false, message: 'ฟอร์มนี้ปิดรับลงทะเบียนแล้ว' }, { status: 403 });
    }

    const sponsor = await findAllowedSponsorByEmail(form.id, email);
    if (!sponsor) return NextResponse.json({ success: false, message: NOT_ALLOWED }, { status: 403 });

    const plainOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash('sha256').update(plainOtp).digest('hex');
    await prisma.sponsor_otp_codes.deleteMany({ where: { email, is_used: false } });
    await prisma.sponsor_otp_codes.create({
      data: { email, otp_code: otpHash, expires_at: new Date(Date.now() + 10 * 60 * 1000), is_used: false },
    });

    try {
      await sendSponsorOtpEmail(email, {
        companyName: sponsor.name,
        contactEmail: email,
        otpCode: plainOtp,
        expiresInMinutes: 10,
        meetingName: form.title,
        systemType: 'registration',
      });
    } catch (mailErr) {
      console.error('[FormRequestOTP] Failed to send email:', mailErr);
      return NextResponse.json({ success: false, message: 'ส่งอีเมลรหัสผ่านชั่วคราวไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: `ส่งรหัสผ่านชั่วคราว 6 หลักไปที่ ${email} แล้ว รหัสใช้ได้ 10 นาที`,
      sponsorName: sponsor.name,
    });
  } catch (error) {
    console.error('[FormRequestOTP] Error:', error);
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
