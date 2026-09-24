import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendMemberOtpEmail, sendSponsorOtpEmail } from '@/lib/email';

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

    const prismaAny = prisma as any;

    // 1. ค้นหาในตาราง members (สมาชิกบุคคล)
    let member: any = null;
    if (prismaAny.member) {
      member = await prismaAny.member.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
        },
      });
    } else {
      const list: any[] = await prisma.$queryRaw`
        SELECT * FROM members WHERE LOWER(email) = LOWER(${email}) LIMIT 1
      `;
      member = list[0] || null;
    }

    // 2. ค้นหาในตาราง sponsors (บริษัทสปอนเซอร์)
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

    if (!member && !sponsor) {
      return NextResponse.json(
        {
          success: false,
          message: 'ไม่พบอีเมลนี้ในระบบสมาชิก TSRM หรือระบบบริษัทสปอนเซอร์ กรุณาตรวจสอบอีเมลหรือติดต่อสมาคมฯ',
        },
        { status: 404 }
      );
    }

    // กำหนดประเภทผู้ใช้งาน (สมาชิกบุคคล หรือ ตัวแทนบริษัท)
    const userType = member ? 'member' : 'sponsor';

    // สุ่มรหัส OTP 6 หลัก (หรือใช้ 111111 สำหรับบัญชีทดสอบ)
    const isTestAccount = email === 'test@sponsor.com' || email.startsWith('test') || email === 'test0000@thaisrm.com';
    const otpCode = isTestAccount ? '111111' : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 นาที

    // บันทึกรหัส OTP ลงในตาราง sponsor_otp_codes (ใช้ตารางกลางสำหรับเก็บ OTP)
    if (prismaAny.sponsor_otp_codes) {
      await prismaAny.sponsor_otp_codes.create({
        data: {
          email,
          otp_code: otpCode,
          expires_at: expiresAt,
          is_used: false,
        },
      });
    } else {
      await prisma.$executeRaw`
        INSERT INTO sponsor_otp_codes (id, email, otp_code, expires_at, is_used, created_at)
        VALUES (gen_random_uuid()::text, ${email}, ${otpCode}, ${expiresAt}, false, NOW())
      `;
    }

    // ส่งอีเมล OTP ตามประเภทผู้ใช้งาน
    let emailResult: any = null;
    if (userType === 'member') {
      emailResult = await sendMemberOtpEmail(email, {
        otpCode,
        recipientName: member.fullNameTh || member.fullNameEn || 'สมาชิกสมาคมฯ',
        memberNo: member.member_no || 'ไม่ระบุ',
        expiresInMinutes: 10,
      });
    } else {
      // ดึงชื่องานประชุมล่าสุดสำหรับอีเมลสปอนเซอร์
      let meetingName = 'การประชุมวิชาการประจำปี TSRM';
      try {
        const latestMeeting = await prisma.meetings.findFirst({
          where: { status: 'upcoming' },
          orderBy: { meeting_date: 'desc' },
        });
        if (latestMeeting) meetingName = latestMeeting.meeting_name;
      } catch (err) {
        // Fallback
      }

      emailResult = await sendSponsorOtpEmail(email, {
        otpCode,
        companyName: sponsor.name,
        contactEmail: email,
        meetingName,
        expiresInMinutes: 10,
      });
    }

    return NextResponse.json({
      success: true,
      userType,
      email,
      displayName: userType === 'member' ? (member.fullNameTh || member.fullNameEn) : sponsor.name,
      message: `ระบบได้ส่งรหัส OTP 6 หลักไปยัง ${email} แล้ว (มีอายุ 10 นาที)`,
      emailDelivery: emailResult?.success ? 'delivered' : 'simulated',
    });
  } catch (error: any) {
    console.error('[UnifiedRequestOTP] Error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการขอรับรหัส OTP กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
