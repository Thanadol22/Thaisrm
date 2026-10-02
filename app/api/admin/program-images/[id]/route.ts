import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { parseProgramImageInput, serializeProgramImage, toDbData } from '@/lib/services/programImageService';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

function parseId(id: string): bigint | null {
  return /^\d{1,18}$/.test(id) ? BigInt(id) : null;
}

/** PUT /api/admin/program-images/[id] — แก้ไขข้อมูลหรือเปลี่ยนรูป */
export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!getAdminSessionFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ success: false, error: 'รหัสรูปไม่ถูกต้อง' }, { status: 400 });

  try {
    const { data, error } = parseProgramImageInput(await req.json());
    if (!data) return NextResponse.json({ success: false, error }, { status: 400 });

    const existing = await prisma.meeting_program_images.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ success: false, error: 'ไม่พบรูปนี้' }, { status: 404 });

    const row = await prisma.meeting_program_images.update({ where: { id }, data: toDbData(data) });
    return NextResponse.json({ success: true, data: serializeProgramImage(row) });
  } catch (error) {
    console.error('PUT /api/admin/program-images/[id] error:', error);
    return NextResponse.json({ success: false, error: 'ไม่สามารถแก้ไขรูปตารางกิจกรรมได้' }, { status: 500 });
  }
}

/** DELETE /api/admin/program-images/[id] */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!getAdminSessionFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ success: false, error: 'รหัสรูปไม่ถูกต้อง' }, { status: 400 });

  try {
    const { count } = await prisma.meeting_program_images.deleteMany({ where: { id } });
    if (count === 0) return NextResponse.json({ success: false, error: 'ไม่พบรูปนี้' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/program-images/[id] error:', error);
    return NextResponse.json({ success: false, error: 'ไม่สามารถลบรูปตารางกิจกรรมได้' }, { status: 500 });
  }
}
