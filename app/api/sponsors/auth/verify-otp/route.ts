import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const otp = (body.otp || '').trim();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกอีเมลและรหัสชั่วคราว (OTP) ให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // 1. ค้นหา OTP ล่าสุดที่ยังไม่ถูกใช้ และยังไม่หมดอายุ
    const otpRecord = await (prisma as any).sponsor_otp_codes.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        otp_code: otp,
        is_used: false,
        expires_at: { gte: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!otpRecord) {
      return NextResponse.json(
        {
          success: false,
          message: 'รหัสชั่วคราว (OTP) ไม่ถูกต้อง หรือหมดอายุแล้ว กรุณาขอรหัสใหม่',
        },
        { status: 400 }
      );
    }

    // 2. Mark OTP as used
    await (prisma as any).sponsor_otp_codes.update({
      where: { id: otpRecord.id },
      data: { is_used: true },
    });

    // 3. ดึงข้อมูลบริษัท
    const sponsor = await (prisma as any).sponsors.findFirst({
      where: {
        contact_email: { equals: email, mode: 'insensitive' },
        is_active: true,
      },
      include: {
        quotas: {
          include: {
            meeting: true,
          },
        },
      },
    });

    if (!sponsor) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบข้อมูลบริษัท หรือบัญชีถูกระงับการใช้งาน' },
        { status: 404 }
      );
    }

    // 4. ดึงรายการงานประชุมที่เปิดอยู่ (upcoming)
    const upcomingMeetings = await prisma.meetings.findMany({
      where: {
        status: 'upcoming',
      },
      orderBy: {
        meeting_date: 'asc',
      },
    });

    // แมปโควต้าเข้ากับ meetings
    const meetingsWithQuota = upcomingMeetings.map((m) => {
      const quota = sponsor.quotas?.find((q: any) => q.meeting_id === m.meeting_id);
      return {
        meeting_id: m.meeting_id,
        meeting_name: m.meeting_name,
        meeting_date: m.meeting_date,
        location: m.location,
        base_price: m.base_price,
        quota_seats: quota ? quota.quota_seats : 0,
        used_seats: quota ? quota.used_seats : 0,
        remaining_seats: quota ? Math.max(0, quota.quota_seats - quota.used_seats) : 0,
        members_only: quota ? quota.members_only : true,
      };
    });

    // สร้าง session payload token อย่างง่าย
    const sessionData = {
      sponsorId: sponsor.id,
      sponsorName: sponsor.name,
      tier: sponsor.tier,
      contactEmail: email,
      contactName: sponsor.contact_name,
      verifiedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'ยืนยันตัวตนสำเร็จ',
      sessionData,
      meetings: meetingsWithQuota,
    });
  } catch (error: any) {
    console.error('[VerifyOTP] Error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสชั่วคราว' },
      { status: 500 }
    );
  }
}
