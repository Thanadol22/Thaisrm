import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { getSponsorRegistrationRows } from '@/lib/services/sponsorRegistrationService';

// GET /api/admin/sponsors/registrations - ประวัติการลงทะเบียนของบริษัททั้งหมด แตกทุกบิลเป็นรายผู้เข้าร่วม
export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await getSponsorRegistrationRows();
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('[AdminSponsorRegistrations] Error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงประวัติการลงทะเบียนของบริษัท' },
      { status: 500 }
    );
  }
}
