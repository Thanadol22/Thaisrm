import { NextRequest, NextResponse } from 'next/server';
import { resendLoggedEmail } from '@/lib/email';
import { listEmailLogs, EmailLogStatus } from '@/lib/services/emailLog';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') || 'all') as EmailLogStatus | 'all';
    const query = searchParams.get('q') || undefined;
    const days = Number(searchParams.get('days')) || 30;

    const data = await listEmailLogs({ status, query, days });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API /api/email/logs GET error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'โหลดประวัติการส่งอีเมลไม่สำเร็จ' }, { status: 500 });
  }
}

// ส่งซ้ำอีเมลที่ส่งไม่สำเร็จ: body { ids: string[] }
export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : [];
    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่ได้เลือกอีเมลที่จะส่งซ้ำ' }, { status: 400 });
    }

    let sent = 0;
    const errors: string[] = [];
    for (const id of ids) {
      const result = await resendLoggedEmail(id);
      if (result.success && !result.fallback) sent++;
      else errors.push(result.error || 'ส่งไม่สำเร็จ');
    }

    return NextResponse.json({ success: true, data: { sent, failed: errors.length, errors } });
  } catch (error: any) {
    console.error('API /api/email/logs POST error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'ส่งซ้ำไม่สำเร็จ' }, { status: 500 });
  }
}
