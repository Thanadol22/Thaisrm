import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { batchSyncAllMemberStatuses, getQualifyingActiveMeetings } from '@/lib/services/membershipStatusService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/members/sync-status
 * ดูตัวอย่างผลการประมวลผล (Dry Run) ก่อนกด Sync จริง
 */
export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const qualifyingMeetings = await getQualifyingActiveMeetings(4);
    const result = await batchSyncAllMemberStatuses(true); // dryRun = true

    return NextResponse.json({
      success: true,
      qualifyingMeetings,
      summary: result,
    });
  } catch (error) {
    console.error('API /api/admin/members/sync-status GET error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการประมวลผลสถานะสมาชิก' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/members/sync-status
 * ดำเนินการอัปเดตสถานะสมาชิกลงฐานข้อมูลจริงตามกฎ 4 ครั้งล่าสุด
 */
export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean(body.dryRun);

    const qualifyingMeetings = await getQualifyingActiveMeetings(4);
    const result = await batchSyncAllMemberStatuses(dryRun);

    return NextResponse.json({
      success: true,
      qualifyingMeetings,
      summary: result,
      message: dryRun
        ? 'ทดสอบประมวลผลเรียบร้อย (ยังไม่ได้บันทึก)'
        : `ประมวลผลและอัปเดตสถานะสำเร็จ (ปรับเป็น Active ${result.updated_to_active} ราย, Inactive ${result.updated_to_inactive} ราย)`,
    });
  } catch (error) {
    console.error('API /api/admin/members/sync-status POST error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกสถานะสมาชิก' },
      { status: 500 }
    );
  }
}
