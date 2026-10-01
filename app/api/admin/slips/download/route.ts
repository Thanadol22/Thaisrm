import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { getAdminAttachedSlipUrl } from '@/lib/adminAttachedSlip';

export const dynamic = 'force-dynamic';

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
};
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

/** ดึงเฉพาะไฟล์จาก Vercel Blob เท่านั้น (ป้องกัน SSRF) */
function isAllowedRemote(url: URL): boolean {
  return url.protocol === 'https:' && url.hostname.endsWith('.blob.vercel-storage.com');
}

async function loadSlipFile(slipUrl: string): Promise<{ data: Buffer; mime: string } | null> {
  if (slipUrl.startsWith('data:')) {
    const match = slipUrl.match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/);
    if (!match) return null;
    const data = match[2] ? Buffer.from(match[3], 'base64') : Buffer.from(decodeURIComponent(match[3]));
    return { data, mime: match[1] };
  }

  if (slipUrl.startsWith('/')) {
    const publicDir = path.resolve(process.cwd(), 'public');
    const filePath = path.resolve(publicDir, '.' + decodeURIComponent(slipUrl.split('?')[0]));
    if (!filePath.startsWith(publicDir + path.sep)) return null;
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const data = await readFile(filePath).catch(() => null);
    return data ? { data, mime: MIME_BY_EXT[ext] || 'application/octet-stream' } : null;
  }

  let url: URL;
  try {
    url = new URL(slipUrl);
  } catch {
    return null;
  }
  if (!isAllowedRemote(url)) return null;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const ext = path.extname(url.pathname).slice(1).toLowerCase();
  const mime = res.headers.get('content-type')?.split(';')[0] || MIME_BY_EXT[ext] || 'application/octet-stream';
  return { data: Buffer.from(await res.arrayBuffer()), mime };
}

function safeFilePart(value: string): string {
  return value.replace(/[\\/:*?"<>|\r\n\t]+/g, '_').replace(/\s+/g, '_').slice(0, 80);
}

// GET: ดาวน์โหลดไฟล์สลิปของรายการชำระเงิน (?id=<slip_id>)
export async function GET(request: NextRequest) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const slipId = request.nextUrl.searchParams.get('id');
  if (!slipId) {
    return NextResponse.json({ success: false, error: 'กรุณาระบุรายการสลิป' }, { status: 400 });
  }

  try {
    const slip = await prisma.payment_slips.findUnique({
      where: { slip_id: slipId },
      select: {
        slip_id: true,
        ticket_code: true,
        guest_name: true,
        slip_url: true,
        members: { select: { fullNameTh: true } },
      },
    });
    if (!slip) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการสลิป' }, { status: 404 });
    }

    const slipUrl = getAdminAttachedSlipUrl(slip.slip_url) || slip.slip_url;
    const file = slipUrl ? await loadSlipFile(slipUrl) : null;
    if (!file) {
      return NextResponse.json({ success: false, error: 'รายการนี้ไม่มีไฟล์สลิปให้ดาวน์โหลด' }, { status: 404 });
    }

    const ext = EXT_BY_MIME[file.mime] || 'bin';
    const ownerName = slip.members?.fullNameTh || slip.guest_name || '';
    const baseName = [slip.ticket_code || slip.slip_id, ownerName].filter(Boolean).map(safeFilePart).join('_');
    const fileName = `slip_${baseName}.${ext}`;

    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        'Content-Type': file.mime,
        'Content-Length': String(file.data.length),
        'Content-Disposition': `attachment; filename="slip_${safeFilePart(slip.ticket_code || slip.slip_id).replace(/[^\x20-\x7e]/g, '_')}.${ext}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'X-Slip-Filename': encodeURIComponent(fileName),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Error downloading slip:', error);
    return NextResponse.json({ success: false, error: 'ไม่สามารถดาวน์โหลดสลิปได้' }, { status: 500 });
  }
}
