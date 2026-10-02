import { NextRequest, NextResponse } from 'next/server';
import { extractOtpSessionFromRequest } from '@/lib/security/otpSessionAuth';
import { buildSponsorPortalData } from '@/lib/services/sponsorPortalService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/sponsors/portal/overview
 * โหลดข้อมูลหน้าบริษัทล่าสุดด้วยสิทธิ์เข้าใช้งานเดิม (ไม่ต้องขอรหัส OTP ใหม่)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const session = extractOtpSessionFromRequest(req, body?.sessionToken);
    if (!session || session.userType !== 'sponsor' || !session.email) {
      return NextResponse.json(
        { success: false, message: 'สิทธิ์การเข้าใช้งานหมดอายุ กรุณายืนยันตัวตนด้วยรหัส OTP ใหม่อีกครั้ง' },
        { status: 401 }
      );
    }

    const data = await buildSponsorPortalData(session.email);
    if (!data || (session.sponsorId && data.sponsorId !== session.sponsorId)) {
      return NextResponse.json({ success: false, message: 'ไม่พบข้อมูลบริษัท หรือบัญชีถูกระงับ' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[SponsorPortalOverview] Error:', error);
    return NextResponse.json({ success: false, message: 'โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
