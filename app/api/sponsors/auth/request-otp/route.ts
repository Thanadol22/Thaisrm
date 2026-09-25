import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendSponsorOtpEmail } from '@/lib/email';

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

    // สุ่มรหัส OTP 6 หลัก (หรือใช้ 111111 สำหรับบัญชีทดสอบ)
    const otpCode = email === 'test@sponsor.com' ? '111111' : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 นาที

    // บันทึกรหัสชั่วคราวลงในตาราง sponsor_otp_codes
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

    // 2. ตรวจสอบคูปองของบริษัทในรอบการประชุมปัจจุบัน
    let couponRecord: any = null;
    let meetingName = '34th TSRM2026 V.2';

    if (prismaAny.coupons) {
      couponRecord = await prismaAny.coupons.findFirst({
        where: {
          company_name: { equals: sponsor.name, mode: 'insensitive' },
          is_active: true,
        },
        include: {
          meetings: {
            select: { meeting_name: true },
          },
        },
        orderBy: { created_at: 'desc' },
      });
    } else {
      const cList: any[] = await prisma.$queryRaw`
        SELECT c.*, m.meeting_name
        FROM coupons c
        LEFT JOIN meetings m ON c.meeting_id = m.meeting_id
        WHERE LOWER(c.company_name) = LOWER(${sponsor.name}) AND c.is_active = true
        ORDER BY c.created_at DESC
        LIMIT 1
      `;
      couponRecord = cList[0] || null;
    }

    let activeRotatedCouponCode: string | undefined = undefined;
    let remainingQuota = 0;
    let totalQuota = 0;

    if (couponRecord) {
      totalQuota = couponRecord.max_uses || 0;
      remainingQuota = Math.max(0, totalQuota - (couponRecord.used_count || 0));
      if (couponRecord.meetings?.meeting_name) {
        meetingName = couponRecord.meetings.meeting_name;
      } else if (couponRecord.meeting_name) {
        meetingName = couponRecord.meeting_name;
      }

      // หากยังมีสิทธิ์คงเหลือ ให้หมุนเวียนเปลี่ยนรหัสใหม่ทันที (ยกเว้นกรณีบัญชีทดสอบที่ใช้รหัสคงที่ T34-TEST-111111)
      if (remainingQuota > 0) {
        if (couponRecord.code === 'T34-TEST-111111' || email === 'test@sponsor.com') {
          activeRotatedCouponCode = 'T34-TEST-111111';
        } else {
          const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
          const words = (sponsor.name || '').toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
          let prefix = 'SPN';
          if (words.length >= 2) {
            prefix = (words[0].slice(0, 2) + words[1].slice(0, 1)).toUpperCase();
          } else if (words.length === 1) {
            prefix = words[0].slice(0, 3).toUpperCase();
          }

          let token = '';
          for (let i = 0; i < 6; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          activeRotatedCouponCode = `T34-${prefix}-${token}`;

          // อัปเดตรหัสใหม่ลงตาราง coupons (ประวัติการใช้งานเดิมใน coupon_usages ยังคงอยู่ครบถ้วน)
          if (prismaAny.coupons) {
            await prismaAny.coupons.update({
              where: { id: couponRecord.id },
              data: {
                code: activeRotatedCouponCode,
                updated_at: new Date(),
              },
            });
          } else {
            await prisma.$executeRaw`
              UPDATE coupons 
              SET code = ${activeRotatedCouponCode}, updated_at = NOW() 
              WHERE id = ${couponRecord.id}
            `;
          }
        }
      }
    }

    // ส่งอีเมลไปยังตัวแทน (พร้อม OTP และรหัสคูปองล่าสุดถ้ามีสิทธิ์)
    try {
      await sendSponsorOtpEmail(email, {
        companyName: sponsor.name,
        contactEmail: email,
        otpCode,
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
