import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendMemberOtpEmail } from '@/lib/email';
import crypto from 'crypto';
import { getClientIp, checkRateLimitAsync } from '@/lib/security/rateLimiter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/members/auth/request-otp
 * ขอรหัส OTP เพื่อยืนยันตัวตนก่อนแก้ไขข้อมูลส่วนตัวสมาชิก
 * Body: { member_no, email }
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Rate limit: 5 ครั้ง / นาที ต่อ IP (ป้องกัน spam OTP request)
    const rl = await checkRateLimitAsync(`member-otp-req:${ip}`, {
      maxRequests: 5,
      windowSeconds: 60,
      banDurationSeconds: 300,
      maxViolationsBeforeBan: 3,
    });

    if (!rl.success) {
      return NextResponse.json(
        {
          success: false,
          message: `ท่านส่งคำขอถี่เกินไป กรุณารออีก ${rl.retryAfterSeconds} วินาที`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const member_no = (body.member_no || '').toString().trim();
    const email = (body.email || '').trim().toLowerCase();

    if (!member_no || !email) {
      return NextResponse.json(
        { success: false, message: 'กรุณาระบุรหัสสมาชิกและอีเมล' },
        { status: 400 }
      );
    }

    // จัดรูปแบบเลขสมาชิก 4 หลัก
    let formattedMemberNo = member_no;
    if (/^\d+$/.test(member_no) && member_no.length < 4) {
      formattedMemberNo = member_no.padStart(4, '0');
    }

    // ตรวจสอบสมาชิกในระบบ
    const member = await prisma.member.findFirst({
      where: {
        OR: [
          { member_no: formattedMemberNo },
          { member_no: member_no },
        ],
      },
      select: {
        member_no: true,
        fullNameTh: true,
        email: true,
        membership_status: true,
      },
    });

    // ตอบ 200 เสมอแม้ไม่พบสมาชิก (ป้องกัน member enumeration)
    if (!member || !member.email) {
      return NextResponse.json({
        success: true,
        message: 'หากอีเมลของท่านตรงกับที่ลงทะเบียนไว้ ระบบจะส่งรหัสชั่วคราวให้ทันที',
      });
    }

    // ตรวจสอบว่าอีเมลตรงกับที่ลงทะเบียนไว้
    if (member.email.trim().toLowerCase() !== email) {
      // ตอบ 200 เหมือนกัน ป้องกัน enumeration
      return NextResponse.json({
        success: true,
        message: 'หากอีเมลของท่านตรงกับที่ลงทะเบียนไว้ ระบบจะส่งรหัสชั่วคราวให้ทันที',
      });
    }

    // สร้าง OTP 6 หลัก
    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    // Hash OTP ก่อนเก็บใน DB (SHA-256)
    const otpHash = crypto.createHash('sha256').update(plainOtp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 นาที

    // ลบ OTP เก่าของสมาชิกนี้ที่ยังไม่ได้ใช้ (cleanup)
    const prismaAny = prisma as any;
    if (prismaAny.member_otp_codes) {
      await prismaAny.member_otp_codes.deleteMany({
        where: {
          member_no: member.member_no,
          is_used: false,
        },
      });
      // บันทึก OTP (เก็บ hash ไม่เก็บ plaintext)
      await prismaAny.member_otp_codes.create({
        data: {
          member_no: member.member_no,
          otp_hash: otpHash,
          expires_at: expiresAt,
          is_used: false,
          ip_address: ip,
        },
      });
    } else {
      // Fallback: ใช้ sponsor_otp_codes table โดย prefix email ด้วย member: เพื่อแยกประเภท
      await prisma.$executeRaw`
        DELETE FROM sponsor_otp_codes
        WHERE email = ${'member:' + member.member_no}
          AND is_used = false
      `;
      await prisma.$executeRaw`
        INSERT INTO sponsor_otp_codes (id, email, otp_code, expires_at, is_used, created_at)
        VALUES (
          gen_random_uuid()::text,
          ${'member:' + member.member_no},
          ${plainOtp},
          ${expiresAt},
          false,
          NOW()
        )
      `;
    }

    // ส่งอีเมล OTP (plaintext — ไม่ใช่ hash)
    try {
      const emailPromise = sendMemberOtpEmail(member.email, {
        otpCode: plainOtp,
        recipientName: member.fullNameTh || 'สมาชิก',
        memberNo: member.member_no,
        expiresInMinutes: 10,
      });

      await Promise.race([
        emailPromise,
        new Promise((resolve) => setTimeout(() => resolve({ success: true, pendingDelivery: true }), 600)),
      ]);
    } catch (emailErr) {
      console.error('[MemberOTP] Failed to send email:', emailErr);
      // ไม่ return error เพื่อป้องกัน enumeration
    }

    return NextResponse.json({
      success: true,
      message: 'หากอีเมลของท่านตรงกับที่ลงทะเบียนไว้ ระบบจะส่งรหัสชั่วคราวให้ทันที',
    });
  } catch (error: any) {
    console.error('[MemberOTP Request] Error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
