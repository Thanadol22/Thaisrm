import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { createOtpSessionToken } from '@/lib/security/otpSessionAuth';
import {
  buildSpecialFormMeeting,
  findAllowedSponsorByEmail,
  getSpecialFormBySlug,
  isSpecialFormOpen,
  resolveSpecialFormItems,
} from '@/lib/services/specialFormService';

export const dynamic = 'force-dynamic';

/** POST /api/forms/[slug]/auth/verify-otp — ยืนยันรหัสผ่านชั่วคราว แล้วส่งข้อมูลฟอร์มและงานประชุมในราคาของฟอร์ม */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const otp = String(body.otp || '').trim();
    if (!email || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ success: false, message: 'กรุณากรอกรหัสผ่านชั่วคราว 6 หลัก' }, { status: 400 });
    }

    const form = await getSpecialFormBySlug(slug);
    if (!form) return NextResponse.json({ success: false, message: 'ไม่พบฟอร์มนี้' }, { status: 404 });
    if (!isSpecialFormOpen(form)) {
      return NextResponse.json({ success: false, message: 'ฟอร์มนี้ปิดรับลงทะเบียนแล้ว' }, { status: 403 });
    }

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const record = await prisma.sponsor_otp_codes.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        otp_code: otpHash,
        is_used: false,
        expires_at: { gte: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });
    if (!record) {
      return NextResponse.json(
        { success: false, message: 'รหัสผ่านชั่วคราวไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอรหัสใหม่' },
        { status: 400 }
      );
    }
    await prisma.sponsor_otp_codes.update({ where: { id: record.id }, data: { is_used: true } });

    const sponsor = await findAllowedSponsorByEmail(form.id, email);
    if (!sponsor) {
      return NextResponse.json({ success: false, message: 'อีเมลนี้ไม่มีสิทธิ์เข้าใช้ฟอร์มนี้' }, { status: 403 });
    }

    const meeting = await prisma.meetings.findUnique({ where: { meeting_id: form.meeting_id } });
    if (!meeting) return NextResponse.json({ success: false, message: 'ไม่พบงานประชุมของฟอร์มนี้' }, { status: 404 });

    const items = resolveSpecialFormItems(form, meeting);
    // รหัสเจ้าหน้าที่ใช้เช็คอินหน้างาน ห้ามส่งออกไปหน้าเว็บ
    const { staff_code: _staffCode, ...publicMeeting } = meeting;
    void _staffCode;
    const sessionToken = createOtpSessionToken({
      email,
      userType: 'sponsor',
      sponsorId: sponsor.id,
      formId: form.id,
    });

    return NextResponse.json({
      success: true,
      sessionToken,
      sponsorSession: {
        sponsorId: sponsor.id,
        sponsorName: sponsor.name,
        tier: sponsor.tier,
        contactEmail: sponsor.contact_email,
        contactName: sponsor.contact_name || undefined,
        verifiedAt: new Date().toISOString(),
        meetings: [],
      },
      form: {
        id: form.id,
        slug: form.slug,
        title: form.title,
        description: form.description,
        formType: form.form_type,
        allowCoupon: form.allow_coupon,
      },
      meeting: buildSpecialFormMeeting(publicMeeting, items),
    });
  } catch (error) {
    console.error('[FormVerifyOTP] Error:', error);
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่านชั่วคราว' }, { status: 500 });
  }
}
