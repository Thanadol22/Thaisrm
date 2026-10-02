import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import {
  listProgramImages,
  parseProgramImageInput,
  serializeProgramImage,
  toDbData,
} from '@/lib/services/programImageService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/program-images?meetingId=...
 * รายการรูปตารางกิจกรรมของการประชุม (เรียงตามวันแล้ว)
 */
export async function GET(req: NextRequest) {
  if (!getAdminSessionFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const meetingId = new URL(req.url).searchParams.get('meetingId');
  if (!meetingId) {
    return NextResponse.json({ success: false, error: 'กรุณาระบุงานประชุม' }, { status: 400 });
  }
  try {
    return NextResponse.json({ success: true, data: await listProgramImages(meetingId) });
  } catch (error) {
    console.error('GET /api/admin/program-images error:', error);
    return NextResponse.json({ success: false, error: 'ไม่สามารถดึงรูปตารางกิจกรรมได้' }, { status: 500 });
  }
}

/**
 * POST /api/admin/program-images
 * body: { meetingId, programDate, kind, workshopNo?, topic, imageUrl, sortOrder? }
 */
export async function POST(req: NextRequest) {
  if (!getAdminSessionFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const meetingId = String(body?.meetingId ?? '').trim();
    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุงานประชุม' }, { status: 400 });
    }
    const meeting = await prisma.meetings.findUnique({ where: { meeting_id: meetingId }, select: { meeting_id: true } });
    if (!meeting) {
      return NextResponse.json({ success: false, error: 'ไม่พบงานประชุมนี้' }, { status: 404 });
    }

    const { data, error } = parseProgramImageInput(body);
    if (!data) return NextResponse.json({ success: false, error }, { status: 400 });

    const row = await prisma.meeting_program_images.create({
      data: { meeting_id: meetingId, ...toDbData(data) },
    });
    return NextResponse.json({ success: true, data: serializeProgramImage(row) }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/program-images error:', error);
    return NextResponse.json({ success: false, error: 'ไม่สามารถเพิ่มรูปตารางกิจกรรมได้' }, { status: 500 });
  }
}
