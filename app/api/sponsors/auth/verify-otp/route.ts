import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { ensureActiveSponsorCoupon, SPONSOR_TEST_COUPON_CODE } from '@/lib/services/sponsorCouponService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // ตรวจสอบรูปแบบ OTP — ต้องเป็นตัวเลข 6 หลักเท่านั้น
    // (ยกเลิก master pass hardcode ทุกรูปแบบ)
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, message: 'รหัสชั่วคราว (OTP) ต้องเป็นตัวเลข 6 หลัก' },
        { status: 400 }
      );
    }

    const prismaAny = prisma as any;

    // Hash OTP เพื่อเปรียบเทียบกับค่าที่เก็บในฐานข้อมูล (CRITICAL #3)
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // ค้นหา OTP ที่ยังไม่ถูกใช้ และยังไม่หมดอายุ
    // รองรับทั้ง hashed (ใหม่) และ plaintext (backward compat สำหรับ OTP เก่าที่ยังมีอยู่ใน DB)
    let otpRecord: any = null;

    if (prismaAny.sponsor_otp_codes) {
      otpRecord = await prismaAny.sponsor_otp_codes.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
          OR: [
            { otp_code: otpHash },  // hashed (ระบบใหม่)
            { otp_code: otp },      // plaintext (backward compat)
          ],
          is_used: false,
          expires_at: { gte: new Date() },
        },
        orderBy: { created_at: 'desc' },
      });
    } else {
      const rows: any[] = await prisma.$queryRaw`
        SELECT * FROM sponsor_otp_codes
        WHERE LOWER(email) = LOWER(${email})
          AND (otp_code = ${otpHash} OR otp_code = ${otp})
          AND is_used = false
          AND expires_at >= NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `;
      otpRecord = rows[0] || null;
    }

    if (!otpRecord) {
      return NextResponse.json(
        {
          success: false,
          message: 'รหัสชั่วคราว (OTP) ไม่ถูกต้อง หรือหมดอายุแล้ว กรุณาขอรหัสใหม่',
        },
        { status: 400 }
      );
    }

    // Mark OTP as used ทันที (one-time use)
    if (prismaAny.sponsor_otp_codes) {
      await prismaAny.sponsor_otp_codes.update({
        where: { id: otpRecord.id },
        data: { is_used: true },
      });
    } else {
      await prisma.$executeRaw`
        UPDATE sponsor_otp_codes SET is_used = true WHERE id = ${otpRecord.id}
      `;
    }

    // ดึงข้อมูลบริษัทสปอนเซอร์
    let sponsor: any = null;
    if (prismaAny.sponsors) {
      sponsor = await prismaAny.sponsors.findFirst({
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
    } else {
      const spRows: any[] = await prisma.$queryRaw`
        SELECT * FROM sponsors WHERE LOWER(contact_email) = LOWER(${email}) AND is_active = true LIMIT 1
      `;
      if (spRows && spRows.length > 0) {
        sponsor = spRows[0];
        const qRows: any[] = await prisma.$queryRaw`
          SELECT sq.*, m.meeting_name, m.meeting_date
          FROM sponsor_quotas sq
          LEFT JOIN meetings m ON sq.meeting_id = m.meeting_id
          WHERE sq.sponsor_id = ${sponsor.id}
        `;
        sponsor.quotas = qRows.map((q) => ({
          ...q,
          meeting: {
            meeting_id: q.meeting_id,
            meeting_name: q.meeting_name,
            meeting_date: q.meeting_date,
          },
        }));
      }
    }

    if (!sponsor) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบข้อมูลบริษัท หรือบัญชีถูกระงับการใช้งาน' },
        { status: 404 }
      );
    }

    // ดึงรายการงานประชุมที่เปิดอยู่ (upcoming)
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

    // คูปองปัจจุบันของบริษัท (รหัสเดียวกับที่ส่งในอีเมล) เพื่อกรอกในฟอร์มให้อัตโนมัติ
    let couponCode: string | undefined;
    try {
      const couponInfo = await ensureActiveSponsorCoupon({ id: sponsor.id, name: sponsor.name });
      couponCode =
        couponInfo.remainingQuota > 0 && email === 'test@sponsor.com'
          ? SPONSOR_TEST_COUPON_CODE
          : couponInfo.coupon?.code || undefined;
    } catch (couponErr) {
      console.error('[VerifyOTP] Failed to load sponsor coupon:', couponErr);
    }

    // สร้าง session payload
    const sessionData = {
      sponsorId: sponsor.id,
      sponsorName: sponsor.name,
      tier: sponsor.tier,
      contactEmail: email,
      contactName: sponsor.contact_name,
      verifiedAt: new Date().toISOString(),
      couponCode,
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
