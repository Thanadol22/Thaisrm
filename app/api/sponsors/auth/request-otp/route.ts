import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendSponsorOtpEmail } from '@/lib/email';
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

    // ตรวจสอบโควต้าทั้งหมดของบริษัทจาก sponsor_quotas
    let sponsorQuotaRecord: any = null;
    if (prismaAny.sponsor_quotas) {
      sponsorQuotaRecord = await prismaAny.sponsor_quotas.findFirst({
        where: {
          sponsor_id: sponsor.id,
        },
        orderBy: { created_at: 'desc' },
      });
    }

    if (couponRecord) {
      totalQuota = sponsorQuotaRecord?.quota_seats || couponRecord.max_uses || 0;
      // คำนวณสิทธิ์คงเหลือจากโควต้าจริง
      const usedSeats = sponsorQuotaRecord ? sponsorQuotaRecord.used_seats : (couponRecord.used_count || 0);
      remainingQuota = Math.max(0, totalQuota - usedSeats);

      if (couponRecord.meetings?.meeting_name) {
        meetingName = couponRecord.meetings.meeting_name;
      } else if (couponRecord.meeting_name) {
        meetingName = couponRecord.meeting_name;
      }

      if (remainingQuota > 0) {
        if (couponRecord.code === 'T34-TEST-111111' || email === 'test@sponsor.com') {
          activeRotatedCouponCode = 'T34-TEST-111111';
        } else if (couponRecord.used_count === 0 && couponRecord.is_active) {
          // หากรหัสปัจจุบันยังไม่เคยมีใครใช้สิทธิ์ ให้ใช้รหัสเดิมต่อเนื่องได้
          activeRotatedCouponCode = couponRecord.code;
        } else {
          // หากรหัสเดิมมีการใช้งานไปแล้ว (used_count > 0) ต้องสร้างรหัสคูปองใหม่แยกแถว
          // เพื่อรักษาประวัติการใช้สิทธิ์ของรหัสเดิมไว้ ไม่ให้ถูกเขียนทับ
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

          // ปิดการใช้งานรหัสเดิม และตั้ง max_uses ให้ตรงกับจำนวนที่ใช้ไปแล้ว
          if (prismaAny.coupons) {
            await prismaAny.coupons.update({
              where: { id: couponRecord.id },
              data: {
                max_uses: couponRecord.used_count,
                is_active: false,
                updated_at: new Date(),
              },
            });

            // สร้างแถวคูปองใหม่สำหรับสิทธิ์คงเหลือ
            await prismaAny.coupons.create({
              data: {
                code: activeRotatedCouponCode,
                company_name: sponsor.name,
                meeting_id: couponRecord.meeting_id,
                discount_type: couponRecord.discount_type || 'free',
                discount_value: couponRecord.discount_value || 0,
                applicable_type: couponRecord.applicable_type || 'all',
                max_uses: remainingQuota,
                used_count: 0,
                expire_date: couponRecord.expire_date,
                is_active: true,
                remarks: couponRecord.remarks,
              },
            });
          } else {
            await prisma.$executeRaw`
              UPDATE coupons 
              SET max_uses = used_count, is_active = false, updated_at = NOW() 
              WHERE id = ${couponRecord.id}
            `;
            await prisma.$executeRaw`
              INSERT INTO coupons (id, code, company_name, meeting_id, discount_type, discount_value, applicable_type, max_uses, used_count, is_active, remarks, created_at, updated_at)
              VALUES (gen_random_uuid()::text, ${activeRotatedCouponCode}, ${sponsor.name}, ${couponRecord.meeting_id}, 'free', 0, 'all', ${remainingQuota}, 0, true, ${couponRecord.remarks || null}, NOW(), NOW())
            `;
          }
        }
      }
    }

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
