import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { getProgramRevenue } from '@/lib/services/programRevenueService';

export const dynamic = 'force-dynamic';

// GET /api/admin/revenue/programs - รายได้แยกตามหลักสูตรของทุกรอบประชุม
export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await getProgramRevenue();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[AdminProgramRevenue] Error:', error);
    return NextResponse.json({ success: false, error: 'ไม่สามารถคำนวณรายได้แยกตามหลักสูตรได้' }, { status: 500 });
  }
}
