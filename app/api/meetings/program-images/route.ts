import { NextRequest, NextResponse } from 'next/server';
import { listProgramImages } from '@/lib/services/programImageService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/meetings/program-images?meetingId=...
 * สาธารณะ: รูปตารางกิจกรรมของการประชุม สำหรับหน้าลงทะเบียน (เรียงตามวันแล้ว)
 */
export async function GET(req: NextRequest) {
  const meetingId = new URL(req.url).searchParams.get('meetingId');
  if (!meetingId || meetingId.length > 50) {
    return NextResponse.json({ success: false, error: 'กรุณาระบุงานประชุม' }, { status: 400 });
  }
  try {
    const data = await listProgramImages(meetingId);
    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
    );
  } catch (error) {
    console.error('GET /api/meetings/program-images error:', error);
    return NextResponse.json({ success: false, error: 'ไม่สามารถดึงตารางกิจกรรมได้' }, { status: 500 });
  }
}
