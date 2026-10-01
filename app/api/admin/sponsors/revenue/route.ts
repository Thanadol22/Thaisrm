import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { getCompanyRevenue } from '@/lib/services/companyRevenueService';

export const dynamic = 'force-dynamic';

// GET /api/admin/sponsors/revenue - ยอดรวมของแต่ละบริษัท แยกตามรอบประชุมและรายการที่ลงทะเบียน
export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await getCompanyRevenue();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[AdminSponsorRevenue] Error:', error);
    return NextResponse.json({ success: false, error: 'ไม่สามารถคำนวณยอดของบริษัทได้' }, { status: 500 });
  }
}
