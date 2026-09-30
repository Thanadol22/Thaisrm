import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// รหัสที่ผู้ดูแลออกให้ต้องแจ้งตัวแทนบริษัทผ่านช่องทางอื่น (โทรศัพท์/LINE) จึงให้อายุนานกว่า OTP ทางอีเมล
const TEMP_CODE_EXPIRES_MINUTES = 30;

/**
 * POST /api/admin/sponsors/[id]/temp-code
 * ผู้ดูแลระบบออกรหัสผ่านชั่วคราว 6 หลักให้บริษัทสปอนเซอร์ กรณีตัวแทนหาอีเมล OTP ไม่เจอ
 * รหัสถูกบันทึกใน sponsor_otp_codes เหมือน OTP ปกติ จึงใช้เข้าสู่ระบบผ่านหน้าเดิมได้ทันที
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const sponsor = await prisma.sponsors.findUnique({ where: { id } });

    if (!sponsor) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลบริษัทสปอนเซอร์' },
        { status: 404 }
      );
    }
    if (!sponsor.is_active) {
      return NextResponse.json(
        { success: false, error: 'บริษัทนี้ถูกปิดการใช้งาน กรุณาเปิดใช้งานก่อนออกรหัส' },
        { status: 400 }
      );
    }

    const email = (sponsor.contact_email || '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'บริษัทนี้ยังไม่มีอีเมลผู้ติดต่อ' },
        { status: 400 }
      );
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + TEMP_CODE_EXPIRES_MINUTES * 60 * 1000);

    // ยกเลิกรหัสเก่าที่ยังไม่ได้ใช้ แล้วบันทึกรหัสใหม่ (เหลือรหัสที่ใช้ได้เพียงรหัสเดียว)
    await prisma.$transaction([
      prisma.sponsor_otp_codes.deleteMany({
        where: { email: { equals: email, mode: 'insensitive' }, is_used: false },
      }),
      prisma.sponsor_otp_codes.create({
        data: { email, otp_code: code, expires_at: expiresAt, is_used: false },
      }),
    ]);

    console.info(
      `[AdminTempCode] admin="${session.username}" issued temp code for sponsor="${sponsor.id}" email="${email}"`
    );

    return NextResponse.json({
      success: true,
      code,
      email,
      sponsorName: sponsor.name,
      expiresAt: expiresAt.toISOString(),
      expiresInMinutes: TEMP_CODE_EXPIRES_MINUTES,
    });
  } catch (error) {
    console.error('API /api/admin/sponsors/[id]/temp-code POST error:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถออกรหัสผ่านชั่วคราวได้ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
